import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, FileText, LayoutDashboard, CheckSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isApprover = user?.role === 'approver';

  const navItems = [
    { to: '/dashboard', label: 'My Claims', icon: LayoutDashboard },
    { to: '/claims/new', label: 'New Claim', icon: FileText },
    ...(isApprover
      ? [{ to: '/approver', label: 'Approver Queue', icon: CheckSquare }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm transition-transform group-hover:scale-105">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-sm font-bold text-slate-900">BillClaim</span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">
                  Assistant
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  location.pathname === item.to ||
                  (item.to === '/dashboard' && location.pathname.startsWith('/claims/'));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end leading-none">
                <span className="text-xs font-semibold text-slate-900">{user?.name}</span>
                <span className="text-[10px] text-slate-500">
                  {user?.employeeId} · {user?.role}
                </span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                {user?.name?.charAt(0)}
              </div>
              <button
                onClick={() => {
                  signOut();
                  navigate('/signin');
                }}
                className="flex items-center gap-1.5 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
