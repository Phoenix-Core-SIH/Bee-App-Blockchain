'use client';

import { useEffect, useState } from 'react';
import { fetchKvicApi } from '@/lib/kvicApi';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Hexagon, User } from 'lucide-react';

interface BeekeeperProfile {
  beekeeper_id: string;
  name: string;
  hive_count: number;
  batches: any[];
}

interface FederatedResponse<T> {
  partial: boolean;
  unavailable: string[];
  data: T;
}

export default function BeekeeperProfilePage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<BeekeeperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partialWarning, setPartialWarning] = useState<string[]>([]);
  
  useEffect(() => {
    async function load() {
      try {
        const res = await fetchKvicApi<FederatedResponse<BeekeeperProfile>>(`/beekeepers/${params.id}`);
        setData(res.data);
        if (res.partial) {
          setPartialWarning(res.unavailable);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load beekeeper profile');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-8 flex justify-center py-24">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center mb-8">
        <button onClick={() => window.history.back()} className="p-2 mr-4 hover:bg-slate-200 rounded-full transition text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            {data?.name || 'Beekeeper Profile'}
          </h1>
          <p className="text-slate-500 mt-1 flex items-center">
             ID: {params.id}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
          {error}
        </div>
      )}

      {partialWarning.length > 0 && (
        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl mb-6 border border-amber-200 flex items-start">
          <AlertTriangle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Partial Data Returned</p>
            <p className="text-sm mt-1">
              Some services are currently unavailable: <strong>{partialWarning.join(', ')}</strong>. 
              Showing blockchain history only.
            </p>
          </div>
        </div>
      )}

      {data && (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mr-6">
              <User className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{data.name}</h2>
              <p className="text-slate-500">{data.hive_count} Registered Hives</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Batch History</h3>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                  <tr>
                    <th className="px-6 py-4 font-medium">Batch ID</th>
                    <th className="px-6 py-4 font-medium">Harvest Date</th>
                    <th className="px-6 py-4 font-medium">Honey Type</th>
                    <th className="px-6 py-4 font-medium">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.batches.length > 0 ? data.batches.map((batch: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        <Link href={`/admin/batches/${batch.batch_id}`} className="text-amber-600 hover:underline">
                          {batch.batch_id.split('-')[0]}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900">{new Date(batch.harvest_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{batch.honey_type}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{batch.quantity_kg} kg</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No batch history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
