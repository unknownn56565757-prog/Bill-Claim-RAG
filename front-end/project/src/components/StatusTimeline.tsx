import { Check, X } from 'lucide-react';
import type { TimelineStep } from '@/types';

const allSteps: TimelineStep[] = [
  'Submitted',
  'Reconciled',
  'Policy Check',
  'Approved',
];

const stepLabels: Record<TimelineStep, string> = {
  Submitted: 'Submitted',
  Reconciled: 'Reconciled',
  'Policy Check': 'Policy Check',
  'Pending Approval': 'Pending Approval',
  Approved: 'Approved',
  Denied: 'Denied',
  Escalated: 'Escalated',
  Closed: 'Closed',
};

export default function StatusTimeline({
  timeline,
  currentStep,
  denied,
}: {
  timeline: TimelineStep[];
  currentStep: TimelineStep;
  denied?: boolean;
}) {
  const closed = currentStep === 'Closed';
  const steps = closed
    ? (['Submitted', 'Closed'] as TimelineStep[])
    : denied
    ? (['Submitted', 'Reconciled', 'Policy Check', 'Denied'] as TimelineStep[])
    : allSteps;

  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="flex items-center gap-1 w-full overflow-x-auto scrollbar-thin">
      {steps.map((step, i) => {
        const isCompleted = denied
          ? i < 3
          : closed
          ? i < 1
          : i < currentIndex;
        const isCurrent = i === currentIndex;
        const isDenied = denied && step === 'Denied';
        const isClosed = closed && step === 'Closed';
        const isEscalated = currentStep === 'Escalated' && step === 'Policy Check';

        return (
          <div key={step} className="flex items-center gap-1 flex-shrink-0">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold border-2 transition-all ${
                  isDenied
                    ? 'bg-red-500 border-red-500 text-white'
                    : isCompleted
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : isClosed
                    ? 'bg-slate-500 border-slate-500 text-white'
                    : isCurrent && !isEscalated
                    ? 'bg-brand-500 border-brand-500 text-white'
                    : isEscalated
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {isDenied ? (
                  <X className="h-3.5 w-3.5" />
                ) : isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap ${
                  isDenied
                    ? 'text-red-600'
                    : isClosed
                    ? 'text-slate-600'
                    : isCompleted
                    ? 'text-emerald-600'
                    : isCurrent
                    ? isEscalated
                      ? 'text-amber-600'
                      : 'text-brand-600'
                    : 'text-slate-400'
                }`}
              >
                {isEscalated && isCurrent ? 'Escalated' : stepLabels[step]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-12 rounded-full transition-colors ${
                  isCompleted ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
