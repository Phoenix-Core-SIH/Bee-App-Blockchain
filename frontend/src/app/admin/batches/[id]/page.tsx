'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { ArrowLeft, Send, QrCode, MapPin, Clock, Hexagon, FileText } from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';

interface CustodyStep {
  step: number;
  stage: string;
  from: string;
  to: string;
  timestamp_iso: string;
  location_hash: string;
  tx: string | null;
}

interface BatchHistory {
  batch_id: string;
  hive_id: string;
  beekeeper_name: string;
  harvest_date: string;
  quantity_kg: number;
  honey_type: string;
  quality_grade: string;
  lab_report_link: string;
  current_custodian: string;
  custody_chain: CustodyStep[];
}

export default function BatchDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<BatchHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [showTransfer, setShowTransfer] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  
  // Transfer form
  const [toAddress, setToAddress] = useState('');
  const [transferType, setTransferType] = useState(1);
  const [locationJson, setLocationJson] = useState('');

  // QR form
  const [jarSerial, setJarSerial] = useState('');
  const [isActive, setIsActive] = useState(true);

  const role = Cookies.get('role');

  const loadData = async () => {
    try {
      const result = await fetchApi<BatchHistory>(`/batches/${params.id}/history`, { requireAuth: true });
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load batch history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [params.id]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);
    try {
      await fetchApi(`/batches/${params.id}/transfer`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          to_address: toAddress,
          transfer_type: transferType,
          location_json: locationJson || undefined
        })
      });
      setShowTransfer(false);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Transfer failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionLoading(true);
    try {
      await fetchApi(`/batches/${params.id}/qr`, {
        method: 'POST',
        requireAuth: true,
        body: JSON.stringify({
          jar_serial: jarSerial,
          is_active: isActive
        })
      });
      setShowQR(false);
      // Data reload isn't strictly necessary for QR since it doesn't show in this page's UI right now, but good practice
      alert('QR Code Activated Successfully!');
    } catch (err: any) {
      setActionError(err.message || 'QR Activation failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center py-24">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 max-w-2xl">
          <h2 className="font-bold text-lg mb-2">Error loading batch</h2>
          <p>{error}</p>
          <Link href="/admin/dashboard" className="mt-4 inline-block px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Derive current stage from transfer history
  const currentStageLabel = data.custody_chain.length > 0 
    ? data.custody_chain[data.custody_chain.length - 1].stage 
    : 'Harvest';

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Link href="/admin/dashboard" className="p-2 mr-4 hover:bg-slate-200 rounded-full transition text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Batch {data.batch_id.split('-')[0]}</h1>
            <p className="text-slate-500 mt-1 flex items-center">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Current Stage: {currentStageLabel}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          {(role === 'ADMIN' || role === 'PROCESSOR_OPS' || role === 'BEEKEEPER_OPS') && (
            <button 
              onClick={() => setShowQR(true)}
              className="flex items-center px-4 py-2.5 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition shadow-sm"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Activate QR
            </button>
          )}
          <button 
            onClick={() => setShowTransfer(true)}
            className="flex items-center px-4 py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition shadow-sm"
          >
            <Send className="w-4 h-4 mr-2" />
            Transfer Custody
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 text-amber-500 mr-2" />
              Batch Metadata
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Honey Type</p>
                <p className="text-slate-900 font-medium">{data.honey_type}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Quality Grade</p>
                <p className="text-slate-900 font-medium">{data.quality_grade || 'Standard'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Quantity</p>
                <p className="text-slate-900 font-medium">{data.quantity_kg} kg</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Beekeeper</p>
                <p className="text-slate-900 font-medium">{data.beekeeper_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Harvest Date</p>
                <p className="text-slate-900 font-medium">{data.harvest_date}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
            <h3 className="font-bold text-amber-900 mb-2 flex items-center">
              <Hexagon className="w-5 h-5 text-amber-500 mr-2" />
              Current Custodian
            </h3>
            <p className="font-mono text-xs text-amber-800 break-all bg-amber-100/50 p-3 rounded-lg border border-amber-200">
              {data.current_custodian}
            </p>
          </div>
        </div>

        {/* Right Column: Custody Chain */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm min-h-[500px]">
            <h3 className="font-bold text-slate-900 mb-6 flex items-center border-b border-slate-100 pb-4">
              <MapPin className="w-5 h-5 text-amber-500 mr-2" />
              On-Chain Custody History
            </h3>

            <div className="relative pl-8 border-l-2 border-slate-200 space-y-10 py-4">
              {/* Genesis Node */}
              <div className="relative">
                <div className="absolute w-4 h-4 bg-slate-300 rounded-full -left-[2.25rem] top-1 border-4 border-white"></div>
                <h4 className="font-bold text-slate-900">Harvested at Hive ({data.hive_id})</h4>
                <p className="text-sm text-slate-500 mt-1 flex items-center">
                  <Clock className="w-4 h-4 mr-1" /> {data.harvest_date}
                </p>
              </div>

              {/* Transfer Nodes */}
              {data.custody_chain.map((step) => (
                <div key={step.step} className="relative">
                  <div className="absolute w-4 h-4 bg-amber-500 rounded-full -left-[2.25rem] top-1 border-4 border-white"></div>
                  <h4 className="font-bold text-slate-900">Transferred to {step.stage}</h4>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-slate-500 flex items-center">
                      <Clock className="w-4 h-4 mr-1" /> {new Date(step.timestamp_iso).toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">
                      <span className="font-medium">To:</span> <span className="font-mono text-xs">{step.to}</span>
                    </p>
                    {step.tx && (
                      <a href={`https://amoy.polygonscan.com/tx/${step.tx}`} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:underline">
                        View Tx: {step.tx.substring(0, 16)}...
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Transfer Custody</h2>
            </div>
            <form onSubmit={handleTransfer} className="p-6">
              {actionError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
                  {actionError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Address *</label>
                  <input type="text" required value={toAddress} onChange={(e) => setToAddress(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none font-mono text-sm" placeholder="0x..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Transfer Stage *</label>
                  <select value={transferType} onChange={(e) => setTransferType(Number(e.target.value))} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none bg-white">
                    <option value={1}>Processor</option>
                    <option value={2}>Distributor</option>
                    <option value={3}>Retailer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location JSON (Optional)</label>
                  <input type="text" value={locationJson} onChange={(e) => setLocationJson(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none" placeholder='{"lat": 12.3, "lng": 75.8}' />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setShowTransfer(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-70 flex items-center">
                  {actionLoading ? 'Processing...' : 'Transfer On-Chain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-amber-50">
              <h2 className="text-xl font-bold text-amber-900">Activate QR Code</h2>
              <p className="text-amber-700 text-sm mt-1">Link a physical jar's QR to this batch on-chain.</p>
            </div>
            <form onSubmit={handleActivateQR} className="p-6">
              {actionError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
                  {actionError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jar Serial / QR ID *</label>
                  <input type="text" required value={jarSerial} onChange={(e) => setJarSerial(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="e.g. JAR-2024-001" />
                </div>
                <div className="flex items-center mt-4">
                  <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded" />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Mark as Active immediately
                  </label>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setShowQR(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-6 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 disabled:opacity-70 flex items-center shadow-sm">
                  {actionLoading ? 'Processing...' : 'Activate QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
