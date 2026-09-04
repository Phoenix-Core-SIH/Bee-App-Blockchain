'use client';

import { useEffect, useState } from 'react';
import { fetchKvicApi } from '@/lib/kvicApi';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, MapPin, CheckCircle, Package } from 'lucide-react';

interface ClusterOverview {
  location: string;
  batches_this_period: number;
  recent_disease_alerts: number;
}

interface FederatedResponse<T> {
  partial: boolean;
  unavailable: string[];
  data: T;
}

export default function ClusterDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<ClusterOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partialWarning, setPartialWarning] = useState<string[]>([]);
  
  const decodedId = decodeURIComponent(params.id);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetchKvicApi<FederatedResponse<ClusterOverview>>(`/clusters/${params.id}/overview`);
        setData(res.data);
        if (res.partial) {
          setPartialWarning(res.unavailable);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load cluster overview');
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
        <Link href="/admin/kvic/clusters" className="p-2 mr-4 hover:bg-slate-200 rounded-full transition text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            {decodedId}
          </h1>
          <p className="text-slate-500 mt-1 flex items-center">
             Cluster Detailed Overview
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
            </p>
          </div>
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
             <Package className="w-12 h-12 text-amber-500 mb-4" />
             <p className="text-4xl font-bold text-slate-900">{data.batches_this_period}</p>
             <p className="text-slate-500 font-medium uppercase text-sm mt-2 tracking-wider">Batches Produced</p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
             {data.recent_disease_alerts > 0 ? (
               <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
             ) : (
               <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
             )}
             <p className={`text-4xl font-bold ${data.recent_disease_alerts > 0 ? 'text-red-600' : 'text-slate-900'}`}>{data.recent_disease_alerts}</p>
             <p className="text-slate-500 font-medium uppercase text-sm mt-2 tracking-wider">Recent Disease Alerts</p>
          </div>
        </div>
      )}
    </div>
  );
}
