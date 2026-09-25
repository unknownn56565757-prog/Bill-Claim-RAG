import type { ClaimStatus } from '@/types';

const statusConfig: Record<ClaimStatus, { label: string; classes: string; dot: string }> = {
  Submitted: {
    label: 'Submitted',
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  },
  'Under Review': {
    label: 'Under Review',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  Discrepancy: {
    label: 'Discrepancy',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  'Pending Approval': {
    label: 'Pending Approval',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  Approved: {
    label: 'Approved',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  Denied: {
    label: 'Denied',
    classes: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  Escalated: {
    label: 'Escalated',
    classes: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
  },
  Closed: {
    label: 'Closed',
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
};

export default function StatusBadge({
  status,
  size = 'md',
}: {
  status: ClaimStatus;
  size?: 'sm' | 'md';
}) {
  const cfg = statusConfig[status];
  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cfg.classes} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export { statusConfig };
