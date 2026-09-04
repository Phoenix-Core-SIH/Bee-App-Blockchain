'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { Package, MapPin, Calendar, ExternalLink } from 'lucide-react';

interface Batch {
  batch_id: string;
  hive_id: string;
  beekeeper_id: string;
  beekeeper_name: string;
  beekeeper_addr: string;
  hive_location: string;
  harvest_date: string;
  quantity_kg: number;
  honey_type: string;
  quality_grade: string;
  lab_report_link: string;
  metadata_hash: string;
  on_chain_tx: string;
  created_at: string;
}

export default function DashboardPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadBatches() {
      try {
        const data = await fetchApi<Batch[]>('/batches', { requireAuth: true });
        setBatches(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load batches');
      } finally {
        setLoading(false);
      }
    }
    loadBatches();
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of recent honey batches</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-start">
          <span className="font-semibold mr-2">Error:</span> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No batches found</h3>
          <p className="text-slate-500 mt-1">Create a new batch to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Batch ID
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Honey Type
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Harvest Date
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {batches.map((batch) => (
                <tr key={batch.batch_id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 font-mono">
                      {batch.batch_id.split('-')[0]}...
                    </div>
                    <div className="text-xs text-slate-500 flex items-center mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      {batch.beekeeper_name || batch.hive_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                      {batch.honey_type}
                    </span>
                    <div className="text-xs text-slate-500 mt-1">
                      Grade: {batch.quality_grade || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                    {batch.quantity_kg} kg
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                      {batch.harvest_date}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/admin/batches/${batch.batch_id}`}
                      className="inline-flex items-center text-amber-600 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition"
                    >
                      View Details
                      <ExternalLink className="w-4 h-4 ml-1.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
