import type { ReactNode } from 'react';

// App title bar; the explorer fills it with counts, selection and Export.
export function TopBar({ children }: { children?: ReactNode }) {
  return (
    <header className="flex h-10 shrink-0 items-center gap-4 border-b border-slate-300 px-3">
      <h1 className="text-sm font-semibold">Orders Explorer</h1>
      {children}
    </header>
  );
}
