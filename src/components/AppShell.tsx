import type { ReactNode } from "react";

import { BottomNav } from "./BottomNav";

export function AppShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 pb-3 pt-5 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-primary">
              GODHELP
            </p>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {action}
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
