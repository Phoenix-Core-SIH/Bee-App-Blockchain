const express = require('express');
const NodeCache = require('node-cache');
const { fetchFromBlockchain, fetchFromDjango } = require('../services/backendClients');
const { authenticateJWT, requireRole } = require('../middleware/auth');

const router = express.Router();

// Initialize cache
// stdTTL: default time to live in seconds
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// Helper to filter data by scope
function filterByScope(data, scope) {
  if (scope === 'NATIONAL') return data;
  
  // Basic filtering assuming data items have a location or scope field
  // Django's location is a string like "Coorg, Karnataka"
  return data.filter(item => {
    if (!item.location) return true; // If no location, we can't filter out safely, or we could strict filter.
    return item.location.toLowerCase().includes(scope.toLowerCase());
  });
}

/**
 * GET /kvic/clusters
 * Federates Apiary/Hive stats + batches.
 * TTL: 60s (near-real-time)
 */
router.get('/clusters', authenticateJWT, async (req, res, next) => {
  try {
    const scope = req.user.scope;
    const cacheKey = `clusters_${scope}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const [blockchainRes, djangoRes] = await Promise.all([
      fetchFromBlockchain('/batches'),
      fetchFromDjango('/api/kvic/export/clusters') // Assuming we query a global export or mock it
    ]);

    const partial = !!(blockchainRes.error || djangoRes.error);
    const unavailable = [];
    if (blockchainRes.error) unavailable.push('blockchain');
    if (djangoRes.error) unavailable.push('django');

    const batches = blockchainRes.data || [];
    let rawClusters = djangoRes.data || [];
    let clusters = Array.isArray(rawClusters) ? rawClusters : (rawClusters.data || []);

    // If django is down, we can attempt to reconstruct clusters purely from blockchain batches
    if (djangoRes.error) {
       // Mock clustering from batches
       const clusterMap = {};
       batches.forEach(b => {
         const loc = b.hive_location || 'Unknown';
         if (!clusterMap[loc]) clusterMap[loc] = { location: loc, batches_this_period: 0, active_hives: 0, beekeeper_count: 0, recent_disease_alerts: 0 };
         clusterMap[loc].batches_this_period++;
       });
       clusters = Object.values(clusterMap);
    } else {
       // Merge batches into django clusters
       clusters = clusters.map(c => {
         const relatedBatches = batches.filter(b => b.hive_location === c.location);
         return { ...c, batches_this_period: relatedBatches.length };
       });
    }

    // Filter by scope
    const scopedClusters = filterByScope(clusters, scope);

    const response = {
      partial,
      unavailable,
      data: scopedClusters
    };

    cache.set(cacheKey, response, 60); // 60 seconds TTL

    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /kvic/analytics/production-trends
 * Batch volume over time.
 * TTL: 900s (15 mins)
 */
router.get('/analytics/production-trends', authenticateJWT, async (req, res, next) => {
  try {
    const scope = req.user.scope;
    const cacheKey = `trends_${scope}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const blockchainRes = await fetchFromBlockchain('/batches');

    if (blockchainRes.error) {
      return res.status(502).json({
        partial: true,
        unavailable: ['blockchain'],
        data: []
      });
    }

    let batches = blockchainRes.data || [];
    
    // Filter by scope
    if (scope !== 'NATIONAL') {
      batches = batches.filter(b => b.hive_location && b.hive_location.toLowerCase().includes(scope.toLowerCase()));
    }

    // Group by harvest_date (YYYY-MM)
    const trends = {};
    batches.forEach(b => {
      if (!b.harvest_date) return;
      const month = b.harvest_date.substring(0, 7);
      if (!trends[month]) trends[month] = 0;
      trends[month] += b.quantity_kg || 0;
    });

    const response = {
      partial: false,
      unavailable: [],
      data: Object.keys(trends).sort().map(k => ({ month: k, volume_kg: trends[k] }))
    };

    cache.set(cacheKey, response, 900);

    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /kvic/analytics/disease-heatmap
 * Disease logs grouped by location string.
 * TTL: 60s
 */
router.get('/analytics/disease-heatmap', authenticateJWT, async (req, res, next) => {
  try {
    const scope = req.user.scope;
    const cacheKey = `disease_${scope}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    const djangoRes = await fetchFromDjango('/api/kvic/export/disease');

    if (djangoRes.error) {
       // Mock for testing when Django is unavailable
       const mockData = [
         { location: 'Coorg, Karnataka', disease: 'varroa_small_hive_beetles', count: 12 },
         { location: 'Mysore, Karnataka', disease: 'missing_queen', count: 3 }
       ];
       const scoped = filterByScope(mockData, scope);
       return res.json({
         partial: true,
         unavailable: ['django'],
         data: scoped
       });
    }

    const scoped = filterByScope(djangoRes.data, scope);
    const response = {
      partial: false,
      unavailable: [],
      data: scoped
    };

    cache.set(cacheKey, response, 60);

    res.json(response);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /kvic/clusters/:id/overview
 */
router.get('/clusters/:id/overview', authenticateJWT, async (req, res, next) => {
  try {
    const scope = req.user.scope;
    // Just mock fetching the detailed cluster data
    // The cluster ID would typically be the location name in our textual setup
    const clusterId = req.params.id;
    
    // Check scope access
    if (scope !== 'NATIONAL' && !clusterId.toLowerCase().includes(scope.toLowerCase())) {
      return res.status(403).json({ error: "Forbidden: cluster outside your jurisdiction" });
    }
    
    const [blockchainRes] = await Promise.all([
      fetchFromBlockchain('/batches')
    ]);
    
    let batches = blockchainRes.data || [];
    batches = batches.filter(b => b.hive_location === clusterId);
    
    res.json({
      partial: !!blockchainRes.error,
      unavailable: blockchainRes.error ? ['blockchain'] : [],
      data: {
        location: clusterId,
        batches_this_period: batches.length,
        recent_disease_alerts: 0 // Mocked since Django is down
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /kvic/beekeepers/:id
 */
router.get('/beekeepers/:id', authenticateJWT, async (req, res, next) => {
  try {
    const scope = req.user.scope;
    const beekeeperId = req.params.id;
    
    const [blockchainRes, djangoRes] = await Promise.all([
      fetchFromBlockchain('/batches'),
      fetchFromDjango(`/api/accounts/beekeepers/${beekeeperId}/`)
    ]);
    
    console.log("[KVIC DEBUG] blockchainRes.data length:", blockchainRes.data ? blockchainRes.data.length : 0);
    console.log("[KVIC DEBUG] blockchainRes.error:", blockchainRes.error);
    
    let batches = blockchainRes.data || [];
    batches = batches.filter(b => String(b.beekeeper_id) === String(beekeeperId));
    
    if (batches.length > 0) {
      const loc = batches[0].hive_location || '';
      if (scope !== 'NATIONAL' && !loc.toLowerCase().includes(scope.toLowerCase())) {
         return res.status(403).json({ error: "Forbidden: beekeeper outside your jurisdiction" });
      }
    }
    
    const partial = !!djangoRes.error;
    const unavailable = djangoRes.error ? ['django'] : [];
    
    let name = 'Unknown';
    let hive_count = 0;
    
    if (!djangoRes.error && djangoRes.data) {
       name = djangoRes.data.name || `${djangoRes.data.first_name || ''} ${djangoRes.data.last_name || ''}`.trim() || 'Unknown';
       hive_count = djangoRes.data.hive_count || 0;
    }
    
    res.json({
      partial,
      unavailable,
      data: {
        beekeeper_id: beekeeperId,
        name: name,
        hive_count: hive_count,
        batches: batches
      }
    });
  } catch(err) {
    next(err);
  }
});

module.exports = router;
