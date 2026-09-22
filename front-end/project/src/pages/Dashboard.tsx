import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, TrendingUp, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/api/client';
import type { Claim } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { SkeletonCard } from '@/components/Skeletons';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

const categoryIcons: Record<string, string> = {
  Food: '🍽️',
  Travel: '✈️',
  Medical: '⚕️',
  Accommodation: '🏨',
  Other: '📦',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    api
      .fetchEmployeeClaims(user.employeeId)
      .then((data) => {
        setClaims(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const stats = {
    total: claims.length,
    pending: claims.filter((c) =>
      ['Submitted', 'Under Review', 'Discrepancy', 'Pending Approval'].includes(c.status)
    ).length,
    approved: claims.filter((c) => c.status === 'Approved').length,
    totalAmount: claims
      .filter((c) => c.status === 'Approved')
      .reduce((sum, c) => sum + c.claimedAmount, 0),
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Claims</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track and manage your expense bill claims.
          </p>
        </div>
        <Link
          to="/claims/new"
          className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Claim
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Total Claims"
          value={String(stats.total)}
          color="slate"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="In Progress"
          value={String(stats.pending)}
          color="amber"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Approved"
          value={String(stats.approved)}
          color="emerald"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Reimbursed"
          value={formatCurrency(stats.totalAmount, 'USD')}
          color="brand"
        />
      </div>

      {/* Claims list */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">No claims yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Click "New Claim" to submit your first expense bill.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {claims.map((claim) => (
            <Link
              key={claim.id}
              to={`/claims/${claim.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-card hover:shadow-card-hover hover:border-slate-300 transition-all cursor-pointer animate-slide-up"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-lg">
                    {categoryIcons[claim.category]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{claim.category}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(claim.submittedAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={claim.status} size="sm" />
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                    Claimed
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(claim.claimedAmount, claim.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                    Extracted
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      claim.extracted.total === claim.claimedAmount
                        ? 'text-emerald-600'
                        : claim.extracted.total > 0
                        ? 'text-amber-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {claim.extracted.total > 0
                      ? formatCurrency(claim.extracted.total, claim.extracted.currency)
                      : '—'}
                  </p>
                </div>
              </div>

              {claim.extracted.total > 0 &&
                claim.extracted.total !== claim.claimedAmount && (
                  <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Discrepancy of{' '}
                    {formatCurrency(
                      Math.abs(claim.claimedAmount - claim.extracted.total),
                      claim.currency
                    )}
                  </div>
                )}

              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                <span>{claim.files.length} file(s)</span>
                <span>·</span>
                <span className="font-mono">{claim.id}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'slate' | 'amber' | 'emerald' | 'brand';
}) {
  const colorMap = {
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-100 text-amber-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    brand: 'bg-brand-100 text-brand-600',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">{label}</p>
          <p className="text-lg font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
