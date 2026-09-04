'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Search, Hexagon } from 'lucide-react';

export default function VerifyLandingPage() {
  const router = useRouter();
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        router.push(`/verify/${encodeURIComponent(decodedText)}`);
      },
      (err) => {
        // Ignore continuous scanning errors
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [router]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      setError('Please enter a valid code');
      return;
    }
    router.push(`/verify/${encodeURIComponent(manualInput.trim())}`);
  };

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-amber-100">
        
        {/* Header */}
        <div className="bg-amber-500 p-6 text-center text-white">
          <div className="flex justify-center mb-3">
            <Hexagon className="w-12 h-12 fill-amber-400 text-amber-100" />
          </div>
          <h1 className="text-2xl font-bold">Verify Authenticity</h1>
          <p className="text-amber-100 mt-1">Scan the QR code on your honey jar</p>
        </div>

        {/* Scanner Body */}
        <div className="p-6">
          <div id="qr-reader" className="w-full overflow-hidden rounded-xl mb-6 bg-slate-50 border-2 border-dashed border-amber-200"></div>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">OR ENTER MANUALLY</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <form onSubmit={handleManualSubmit} className="mt-2">
            <div className="relative">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => {
                  setManualInput(e.target.value);
                  setError('');
                }}
                placeholder="e.g. JAR-2024-001 or 0x..."
                className="w-full pl-4 pr-12 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-gray-800"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 p-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </form>
        </div>
      </div>
      
      <div className="mt-8 text-center text-amber-800/60 max-w-sm">
        <p className="text-sm">Powered by HoneyChain</p>
        <p className="text-xs mt-1">KVIC Honey Mission Traceability System</p>
      </div>
    </div>
  );
}
