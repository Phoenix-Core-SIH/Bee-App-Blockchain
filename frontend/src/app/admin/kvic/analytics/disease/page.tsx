'use client';

import { useEffect, useState } from 'react';
import { fetchKvicApi } from '@/lib/kvicApi';
import { Activity, MapPin, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface DiseaseData {
  location: string;
  disease: string;
  count: number;
}

interface FederatedResponse<T> {
  partial: boolean;
  unavailable: string[];
  data: T;
}

export default function DiseaseAnalyticsPage() {
  const [data, setData] = useState<DiseaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partialWarning, setPartialWarning] = useState<string[]>([]);
  
  useEffect(() => {
    async function load() {
      try {
        const res = await fetchKvicApi<FederatedResponse<DiseaseData[]>>('/analytics/disease-heatmap');
        setData(res.data);
        if (res.partial) {
          setPartialWarning(res.unavailable);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load disease analytics');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex justify-center py-24">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center mb-8">
        <Link href="/admin/kvic/clusters" className="p-2 mr-4 hover:bg-slate-200 rounded-full transition text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Activity className="w-6 h-6 mr-2 text-amber-500" />
            Disease Alerts Analytics
          </h1>
          <p className="text-slate-500 mt-1">Geospatial overview of hive health issues</p>
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
              Showing mock data for UI testing.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Mock Heatmap Visualization */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[400px] shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500 via-slate-900 to-slate-900"></div>
          <Activity className="w-16 h-16 text-amber-500 mb-4 opacity-50" />
          <p className="text-slate-300 font-medium">Map Visualization (Placeholder)</p>
          <p className="text-slate-500 text-sm mt-2 max-w-sm text-center">
            In production, this area will render a Leaflet or Mapbox instance plotting the data points below across the state/district.
          </p>
        </div>

        {/* Data List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
             <h2 className="font-bold text-slate-900">Alerts by Region</h2>
           </div>
           <div className="divide-y divide-slate-100">
             {data.length > 0 ? data.map((item, i) => (
               <div key={i} className="p-6 flex items-center justify-between hover:bg-slate-50 transition">
                 <div>
                   <div className="flex items-center text-slate-900 font-bold mb-1">
                     <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                     {item.location}
                   </div>
                   <span className="inline-block px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded capitalize">
                     {item.disease.replace(/_/g, ' ')}
                   </span>
                 </div>
                 <div className="text-right">
                   <p className="text-2xl font-black text-slate-900">{item.count}</p>
                   <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cases</p>
                 </div>
               </div>
             )) : (
               <div className="p-8 text-center text-slate-500">
                 No disease alerts found in your jurisdiction.
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
