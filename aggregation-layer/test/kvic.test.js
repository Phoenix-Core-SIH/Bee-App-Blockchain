process.env.JWT_SECRET = 'fallback_secret_for_dev';
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

// Mock backend clients
jest.mock('../src/services/backendClients', () => ({
  fetchFromBlockchain: jest.fn(),
  fetchFromDjango: jest.fn()
}));

const { fetchFromBlockchain, fetchFromDjango } = require('../src/services/backendClients');

const SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

function generateToken(role, scope) {
  return jwt.sign({ username: 'testuser', role, scope }, SECRET);
}

describe('KVIC Federation API', () => {
  let tokenNational, tokenState, tokenDistrict;

  beforeAll(() => {
    tokenNational = generateToken('KVIC_ADMIN', 'NATIONAL');
    tokenState = generateToken('KVIC_STATE', 'Karnataka');
    tokenDistrict = generateToken('KVIC_DISTRICT', 'Coorg');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /kvic/clusters', () => {
    it('should return all clusters for KVIC_ADMIN and handle partial failure', async () => {
      fetchFromBlockchain.mockResolvedValue({
        error: null,
        data: [{ hive_location: 'Coorg, Karnataka' }, { hive_location: 'Mysore, Karnataka' }]
      });
      fetchFromDjango.mockResolvedValue({
        error: 'Connection refused',
        data: null
      });

      const res = await request(app)
        .get('/kvic/clusters')
        .set('Authorization', `Bearer ${tokenNational}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.partial).toBe(true);
      expect(res.body.unavailable).toContain('django');
      // Should mock cluster from blockchain
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.map(c => c.location)).toContain('Coorg, Karnataka');
    });

    it('should filter clusters by scope for KVIC_DISTRICT', async () => {
      fetchFromBlockchain.mockResolvedValue({
        error: null,
        data: [{ hive_location: 'Coorg, Karnataka' }, { hive_location: 'Mysore, Karnataka' }]
      });
      fetchFromDjango.mockResolvedValue({
        error: 'Connection refused',
        data: null
      });

      const res = await request(app)
        .get('/kvic/clusters')
        .set('Authorization', `Bearer ${tokenDistrict}`);

      expect(res.statusCode).toEqual(200);
      // 'Coorg' scope should only see 'Coorg, Karnataka'
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].location).toBe('Coorg, Karnataka');
    });
  });
  
  describe('GET /kvic/analytics/disease-heatmap', () => {
     it('should scope disease heatmap for district', async () => {
       fetchFromDjango.mockResolvedValue({
         error: null,
         data: [
           { location: 'Coorg, Karnataka', disease: 'varroa', count: 5 },
           { location: 'Mysore, Karnataka', disease: 'beetles', count: 1 }
         ]
       });

       const res = await request(app)
         .get('/kvic/analytics/disease-heatmap')
         .set('Authorization', `Bearer ${tokenDistrict}`); // Coorg

       expect(res.statusCode).toEqual(200);
       expect(res.body.data.length).toBe(1);
       expect(res.body.data[0].location).toBe('Coorg, Karnataka');
     });
  });
  
  describe('GET /kvic/beekeepers/:id', () => {
     it('should deny KVIC_DISTRICT access to outside beekeeper', async () => {
        fetchFromBlockchain.mockResolvedValue({
          error: null,
          data: [{ beekeeper_id: '123', hive_location: 'Mysore, Karnataka' }] // Not Coorg
        });
        
        const res = await request(app)
         .get('/kvic/beekeepers/123')
         .set('Authorization', `Bearer ${tokenDistrict}`); // Coorg

        expect(res.statusCode).toEqual(403);
     });
  });
});
