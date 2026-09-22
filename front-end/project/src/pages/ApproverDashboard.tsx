import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, CheckSquare, Clock, AlertTriangle } from 'lucide-react';
import * as api from '@/api/client';
import type { Claim } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { SkeletonCard } from '@/components/Skeletons';

type SortKey = 'amount' | 'date' | 'employee';

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

export default function ApproverDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    api
      .fetchApproverQueue()
      .then((data) => {
        setClaims(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const sorted = [...claims];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'amount') cmp = a.claimedAmount - b.claimedAmount;
      else if (sortKey === 'date')
        cmp = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      else cmp = a.employeeName.localeCompare(b.employeeName);
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [claims, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const stats = {
    total: claims.length,
    pending: claims.filter((c) => c.status === 'Pending Approval').length,
    discrepancies: claims.filter((c) => c.status === 'Discrepancy').length,
  totalValue: claims.reduce((sum, c) => sum + c.claimedAmount, 0),
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Approver Queue</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Review and approve pending expense claims from your team.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<CheckSquare className="h-5 w-5" />}
          label="Total Queue"
          value={String(stats.total)}
          color="slate"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Pending Approval"
          value={String(stats.pending)}
          color="blue"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Discrepancies"
          value={String(stats.discrepancies)}
          color="amber"
        />
        <StatCard
          icon={<span className="text-sm font-bold">$</span>}
          label="Queue Value"
          value={formatCurrency(stats.totalValue, 'USD')}
          color="brand"
        />
      </div>

      {/* Sort controls */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Sort by:</span>
        {([
          { key: 'date' as SortKey, label: 'Date' },
          { key: 'amount' as SortKey, label: 'Amount' },
          { key: 'employee' as SortKey, label: 'Employee' },
        ]).map((col) => (
          <button
            key={col.key}
            onClick={() => toggleSort(col.key)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              sortKey === col.key
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {col.label}
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ))}
      </div>

      {/* Claims table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CheckSquare className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">Queue is empty</p>
          <p className="mt-1 text-sm text-slate-400">
            No claims pending approval. Great job!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((claim) => (
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
                    <p className="text-xs text-slate-500">{claim.employeeName}</p>
                  </div>
                </div>
                <StatusBadge status={claim.status} size="sm" />
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                    Amount
                  </p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(claim.claimedAmount, claim.currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                    Submitted
                  </p>
                  <p className="text-sm font-medium text-slate-700">
                    {formatDate(claim.submittedAt)}
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
  color: 'slate' | 'amber' | 'blue' | 'brand';
}) {
  const colorMap = {
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
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
