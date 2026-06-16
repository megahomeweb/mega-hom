// Route-level skeleton shown while a (client-pages) route streams in — keeps the
// layout stable (no spinner-then-jump) and signals "content is coming".
export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="h-44 sm:h-72 w-full rounded-2xl bg-slate-100 animate-pulse mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded border border-slate-100 overflow-hidden">
            <div className="h-44 sm:h-72 bg-slate-100 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
              <div className="h-8 bg-slate-100 rounded animate-pulse mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
