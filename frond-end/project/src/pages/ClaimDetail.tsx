import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  X,
  MessageSquarePlus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/api/client';
import type { Claim } from '@/types';
import BillViewer from '@/components/BillViewer';
import ExtractedFieldsTable from '@/components/ExtractedFieldsTable';
import ChatPanel from '@/components/ChatPanel';
import StatusTimeline from '@/components/StatusTimeline';
import StatusBadge from '@/components/StatusBadge';
import { SkeletonFields, SkeletonChat } from '@/components/Skeletons';

export default function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isApprover = user?.role === 'approver';

  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [approverNote, setApproverNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api
      .fetchClaim(id)
      .then((data) => {
        setClaim(data);
        setApproverNote(data.approverNote || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleAction(action: 'approve' | 'deny' | 'request') {
    if (!id) return;
    setActionLoading(true);
    try {
      let updated: Claim;
      if (action === 'approve') {
        updated = await api.approveClaim(id, approverNote);
      } else if (action === 'deny') {
        updated = await api.denyClaim(id, approverNote);
      } else {
        updated = await api.requestMoreInfo(id, approverNote);
      }
      setClaim({ ...updated });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-4 flex items-center gap-3">
          <div className="skeleton h-9 w-9 rounded-lg" />
          <div className="skeleton h-6 w-48 rounded-lg" />
        </div>
        <div className="skeleton h-12 w-full rounded-xl mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-280px)]">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <SkeletonFields />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white">
            <SkeletonChat />
          </div>
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-600">Claim not found</p>
        <Link to="/dashboard" className="mt-2 text-sm text-brand-600 hover:text-brand-700">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const isDenied = claim.status === 'Denied';
  const isApproved = claim.status === 'Approved';
  const canApprove =
    isApprover &&
    ['Pending Approval', 'Discrepancy', 'Under Review'].includes(claim.status);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(isApprover ? '/approver' : '/dashboard')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">
                {claim.category} Claim
              </h1>
              <StatusBadge status={claim.status} size="sm" />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {claim.id} · {claim.employeeName} ·{' '}
              {new Date(claim.submittedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <StatusTimeline
          timeline={claim.timeline}
          currentStep={claim.currentStep}
          denied={isDenied}
        />
      </div>

      {/* Main content: two panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-320px)] min-h-[500px]">
        {/* Left: Bill viewer + extracted fields */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden min-h-[250px]">
            <BillViewer files={claim.files} />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden flex-shrink-0">
            <ExtractedFieldsTable
              extracted={claim.extracted}
              claimedAmount={claim.claimedAmount}
              currency={claim.currency}
            />
          </div>
        </div>

        {/* Right: Chat */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-card overflow-hidden min-h-[300px]">
            <ChatPanel
              claimId={claim.id}
              initialMessages={claim.chat}
              disabled={isApproved || isDenied}
            />
          </div>

          {/* Approver actions */}
          {isApprover && canApprove && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-card p-4 flex-shrink-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Approver Note
              </label>
              <textarea
                value={approverNote}
                onChange={(e) => setApproverNote(e.target.value)}
                placeholder="Add a note for the employee..."
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none resize-none"
              />
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => handleAction('approve')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors disabled:opacity-60"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve
                </button>
                <button
                  onClick={() => handleAction('deny')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Deny
                </button>
                <button
                  onClick={() => handleAction('request')}
                  disabled={actionLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquarePlus className="h-4 w-4" />
                  )}
                  Request Info
                </button>
              </div>
            </div>
          )}

          {/* Show approver note if exists and claim is resolved */}
          {(isApproved || isDenied) && claim.approverNote && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-card p-4 flex-shrink-0">
              <div className="flex items-start gap-2.5">
                {isApproved ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    {isApproved ? 'Approved' : 'Denied'} by Approver
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{claim.approverNote}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
