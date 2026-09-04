'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { CheckCircle, XCircle, Clock, MapPin, User, Hexagon, ArrowLeft, Droplet } from 'lucide-react';
import Link from 'next/link';

interface CustodyStep {
  step: number;
  stage: string;
  from: string;
  to: string;
  timestamp_iso: string;
  location_hash: string;
  tx: string | null;
}

interface VerifyResponse {
  verified: boolean;
  qr_id: string;
  jar_serial?: string;
  batch_id?: string;
  honey_type?: string;
  beekeeper_name?: string;
  harvest_date?: string;
  quantity_kg?: number;
  quality_grade?: string;
  lab_report?: string;
  custody_chain?: CustodyStep[];
  error?: string;
  warning?: string;
}

export default function VerifyResultPage({ params }: { params: { qrCode: string } }) {
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetchApi<VerifyResponse>(`/public/verify/${params.qrCode}`);
        setData(response);
      } catch (err: any) {
        setData({
          verified: false,
          qr_id: params.qrCode,
          error: err.message || 'Verification failed. The code may be invalid or not yet activated on-chain.',
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.qrCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-amber-800 font-medium">Verifying blockchain records...</p>
      </div>
    );
  }

  if (!data || !data.verified) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center p-4 md:p-8 pt-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-red-100">
          <div className="bg-red-500 p-8 text-center text-white">
            <XCircle className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Verification Failed</h1>
            <p className="text-red-100 mt-2">We could not find an authentic record for this code.</p>
          </div>
          <div className="p-6">
            <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm mb-6">
              <strong>Error:</strong> {data?.error || 'Unknown error'}
            </div>
            <p className="text-gray-600 text-sm mb-6 text-center">
              This honey jar may be counterfeit, or the QR code has not been activated by the distributor yet.
            </p>
            <Link href="/verify" className="flex items-center justify-center w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Scan another code
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 pb-12">
      {/* Hero Section */}
      <div className="bg-amber-500 pt-12 pb-24 px-4 text-center text-white rounded-b-[3rem] shadow-lg">
        <div className="max-w-xl mx-auto relative">
          <Link href="/verify" className="absolute left-0 top-0 p-2 bg-white/20 hover:bg-white/30 rounded-full transition">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4 text-amber-500">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Verified Authentic</h1>
          <p className="text-amber-100 text-lg">100% Pure KVIC Honey</p>
          
          {data.warning && (
            <div className="mt-4 bg-yellow-400/20 border border-yellow-300 text-yellow-50 text-sm py-2 px-4 rounded-lg inline-block">
              {data.warning}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-xl mx-auto px-4 -mt-16 space-y-6">
        
        {/* Product Details Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-amber-100">
          <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center">
            <Droplet className="w-5 h-5 mr-2 text-amber-500" />
            Product Details
          </h2>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Honey Type</p>
              <p className="text-gray-900 font-medium">{data.honey_type || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Quality Grade</p>
              <p className="text-gray-900 font-medium">{data.quality_grade || 'Standard'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Harvest Date</p>
              <p className="text-gray-900 font-medium">{data.harvest_date || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Batch Volume</p>
              <p className="text-gray-900 font-medium">{data.quantity_kg ? `${data.quantity_kg} kg` : 'Unknown'}</p>
            </div>
          </div>
        </div>

        {/* Origin Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-amber-100">
          <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-amber-500" />
            Origin Story
          </h2>
          <div className="flex items-start">
            <div className="bg-amber-100 p-3 rounded-xl mr-4 text-amber-600">
              <Hexagon className="w-6 h-6 fill-amber-200" />
            </div>
            <div>
              <p className="text-gray-600 text-sm leading-relaxed">
                This honey was harvested by <span className="font-semibold text-gray-900">{data.beekeeper_name || 'our partner beekeeper'}</span>. 
                By purchasing this jar, you are directly supporting rural livelihoods through the KVIC Honey Mission.
              </p>
            </div>
          </div>
        </div>

        {/* Provenance Timeline */}
        {data.custody_chain && data.custody_chain.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-amber-100">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3 mb-6 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-amber-500" />
              Traceability Journey
            </h2>
            
            <div className="relative pl-6 border-l-2 border-amber-200 space-y-8">
              {/* Origin Event */}
              <div className="relative">
                <div className="absolute w-4 h-4 bg-amber-500 rounded-full -left-[1.65rem] top-1 border-4 border-white"></div>
                <h3 className="font-bold text-gray-900">Harvested at Hive</h3>
                <p className="text-xs text-gray-500 flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" /> {data.harvest_date || 'Origin'}
                </p>
                <p className="text-sm text-gray-600 mt-1">Registered by {data.beekeeper_name}</p>
              </div>

              {/* Transfer Events */}
              {data.custody_chain.map((step) => (
                <div key={step.step} className="relative">
                  <div className="absolute w-4 h-4 bg-amber-400 rounded-full -left-[1.65rem] top-1 border-4 border-white"></div>
                  <h3 className="font-bold text-gray-900">Transferred to {step.stage}</h3>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    <Clock className="w-3 h-3 mr-1" /> {new Date(step.timestamp_iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 truncate">Tx: {step.tx?.substring(0, 16)}...</p>
                </div>
              ))}
              
              {/* Current Event */}
              <div className="relative">
                <div className="absolute w-4 h-4 bg-green-500 rounded-full -left-[1.65rem] top-1 border-4 border-white shadow-sm shadow-green-200"></div>
                <h3 className="font-bold text-green-700">QR Activated / Verified</h3>
                <p className="text-xs text-gray-500 flex items-center mt-1">
                  <Clock className="w-3 h-3 mr-1" /> Just now
                </p>
                <p className="text-sm text-gray-600 mt-1">Ready for you to enjoy!</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
