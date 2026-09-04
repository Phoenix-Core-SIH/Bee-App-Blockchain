'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { fetchApi } from '@/lib/api';
import { Hexagon, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await fetchApi<{ token: string; role: string; entity_id: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      
      Cookies.set('token', data.token, { expires: 1/24, secure: true }); // 1 hour
      Cookies.set('role', data.role, { expires: 1/24 });
      
      router.push('/admin/dashboard');
      router.refresh(); // Force a refresh to update server components
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        
        <div className="bg-slate-900 p-8 text-center text-white">
          <div className="flex justify-center mb-4">
            <Hexagon className="w-12 h-12 text-amber-500 fill-amber-500/20" />
          </div>
          <h1 className="text-2xl font-bold">HoneyChain Operator</h1>
          <p className="text-slate-400 mt-2 text-sm">Secure Supply Chain Access</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 flex items-start">
              <span className="font-semibold mr-1">Error:</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-800"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-slate-800"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-70 mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
