'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewBatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    hive_id: '',
    beekeeper_id: '',
    beekeeper_name: '',
    beekeeper_addr: '',
    hive_location: '',
    harvest_date: '',
    quantity_kg: '',
    honey_type: '',
    quality_grade: '',
    lab_report_link: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        quantity_kg: parseFloat(formData.quantity_kg),
        // Omit empty optional fields
        ...(formData.beekeeper_name ? { beekeeper_name: formData.beekeeper_name } : {}),
        ...(formData.hive_location ? { hive_location: formData.hive_location } : {}),
        ...(formData.quality_grade ? { quality_grade: formData.quality_grade } : {}),
        ...(formData.lab_report_link ? { lab_report_link: formData.lab_report_link } : {}),
      };

      const data = await fetchApi<{ batch_id: string }>('/batches', {
        method: 'POST',
        body: JSON.stringify(payload),
        requireAuth: true
      });

      router.push(`/admin/batches/${data.batch_id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center mb-8">
        <Link href="/admin/dashboard" className="p-2 mr-4 hover:bg-slate-200 rounded-full transition text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Register New Batch</h1>
          <p className="text-slate-500 mt-1">Record a new honey harvest onto the blockchain</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-start border border-red-100">
          <span className="font-semibold mr-2">Error:</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8">
        
        {/* Section: Origin */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Origin Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="hive_id" className="block text-sm font-medium text-slate-700 mb-1">Hive ID *</label>
              <input type="text" id="hive_id" name="hive_id" required value={formData.hive_id} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900" placeholder="e.g. HIVE-KA-001" />
            </div>
            <div>
              <label htmlFor="hive_location" className="block text-sm font-medium text-slate-700 mb-1">Hive Location / Region</label>
              <input type="text" id="hive_location" name="hive_location" value={formData.hive_location} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900" placeholder="e.g. Coorg, Karnataka" />
            </div>
            <div>
              <label htmlFor="beekeeper_id" className="block text-sm font-medium text-slate-700 mb-1">Beekeeper ID *</label>
              <input type="text" id="beekeeper_id" name="beekeeper_id" required value={formData.beekeeper_id} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900" />
            </div>
            <div>
              <label htmlFor="beekeeper_name" className="block text-sm font-medium text-slate-700 mb-1">Beekeeper Name</label>
              <input type="text" id="beekeeper_name" name="beekeeper_name" value={formData.beekeeper_name} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900" />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="beekeeper_addr" className="block text-sm font-medium text-slate-700 mb-1">Beekeeper Ethereum Address *</label>
              <input type="text" id="beekeeper_addr" name="beekeeper_addr" required value={formData.beekeeper_addr} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 font-mono text-sm" placeholder="0x..." />
              <p className="text-xs text-slate-500 mt-1">This address will be the initial custodian on-chain.</p>
            </div>
          </div>
        </div>

        {/* Section: Product */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">Harvest Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="harvest_date" className="block text-sm font-medium text-slate-700 mb-1">Harvest Date *</label>
              <input type="date" id="harvest_date" name="harvest_date" required value={formData.harvest_date} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900" />
            </div>
            <div>
              <label htmlFor="quantity_kg" className="block text-sm font-medium text-slate-700 mb-1">Quantity (kg) *</label>
              <input type="number" id="quantity_kg" step="0.01" min="0" name="quantity_kg" required value={formData.quantity_kg} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900" />
            </div>
            <div>
              <label htmlFor="honey_type" className="block text-sm font-medium text-slate-700 mb-1">Honey Type *</label>
              <select id="honey_type" name="honey_type" required value={formData.honey_type} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 bg-white">
                <option value="">Select type...</option>
                <option value="Multiflora">Multiflora</option>
                <option value="Mustard">Mustard</option>
                <option value="Litchi">Litchi</option>
                <option value="Eucalyptus">Eucalyptus</option>
                <option value="Forest Flora">Forest Flora</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="quality_grade" className="block text-sm font-medium text-slate-700 mb-1">Quality Grade</label>
              <select id="quality_grade" name="quality_grade" value={formData.quality_grade} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 bg-white">
                <option value="">Standard</option>
                <option value="A">Grade A</option>
                <option value="A+">Grade A+</option>
                <option value="Premium">Premium</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="lab_report_link" className="block text-sm font-medium text-slate-700 mb-1">Lab Report URL</label>
              <input type="url" id="lab_report_link" name="lab_report_link" value={formData.lab_report_link} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900" placeholder="https://..." />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Link href="/admin/dashboard" className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition mr-4">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center px-6 py-2.5 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition disabled:opacity-70 shadow-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-amber-200 border-t-white rounded-full animate-spin mr-2"></div>
            ) : (
              <PlusCircle className="w-5 h-5 mr-2" />
            )}
            Register Batch On-Chain
          </button>
        </div>
      </form>
    </div>
  );
}
