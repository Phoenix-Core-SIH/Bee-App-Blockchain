'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Hexagon, LayoutDashboard, PlusCircle, LogOut } from 'lucide-react';
import Cookies from 'js-cookie';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Do not wrap the login page in the dashboard layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const role = Cookies.get('role') || 'UNKNOWN';

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('role');
    router.push('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-6 text-white flex items-center mb-6">
          <Hexagon className="w-8 h-8 text-amber-500 fill-amber-500/20 mr-3" />
          <span className="text-xl font-bold">HoneyChain</span>
        </div>

        <div className="px-6 pb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Logged in as</p>
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-white text-sm font-medium">{role}</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <Link
            href="/admin/dashboard"
            className={`flex items-center px-4 py-3 rounded-xl transition ${
              pathname === '/admin/dashboard' ? 'bg-amber-500 text-white shadow-md' : 'hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </Link>

          {(role === 'ADMIN' || role === 'BEEKEEPER_OPS') && (
            <Link
              href="/admin/batches/new"
              className={`flex items-center px-4 py-3 rounded-xl transition ${
                pathname === '/admin/batches/new' ? 'bg-amber-500 text-white shadow-md' : 'hover:bg-slate-800'
              }`}
            >
              <PlusCircle className="w-5 h-5 mr-3" />
              New Batch
            </Link>
          )}

          {(role === 'ADMIN' || role.startsWith('KVIC_')) && (
            <Link
              href="/admin/kvic/clusters"
              className={`flex items-center px-4 py-3 rounded-xl transition ${
                pathname.startsWith('/admin/kvic') ? 'bg-amber-500 text-white shadow-md' : 'hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              KVIC Analytics
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
