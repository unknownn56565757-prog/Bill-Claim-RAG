export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-6 w-32" />
        </div>
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-3 w-20" />
      </div>
    </div>
  );
}

export function SkeletonChat() {
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`max-w-[70%] space-y-2 ${i % 2 === 0 ? '' : 'items-end'}`}>
            <div className="skeleton h-3 w-16" />
            <div className="skeleton h-12 w-48 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonFields() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}
