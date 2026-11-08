import type { ReactNode } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { Header } from "../components/layout/Header";
import { ErrorBanner } from "../components/shared/ErrorBanner";
import type { Page } from "../types";

export function AppLayout({
  page,
  onNavigate,
  title,
  updatedAt,
  busy,
  onRefresh,
  online,
  target,
  host,
  platform,
  error,
  notice,
  onDismissAlert,
  children,
}: {
  page: Page;
  onNavigate: (page: Page) => void;
  title: string;
  updatedAt?: string;
  busy: boolean;
  onRefresh: () => void;
  online: boolean;
  target?: string;
  host?: string;
  platform?: string;
  error: string;
  notice: string;
  onDismissAlert: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-slate-100">
      <Sidebar
        page={page}
        onNavigate={onNavigate}
        online={online}
        target={target}
        host={host}
        platform={platform}
      />

      <main className="min-w-0 flex-1">
        <Header
          title={title}
          updatedAt={updatedAt}
          busy={busy}
          onRefresh={onRefresh}
        />

        <ErrorBanner
          error={error}
          notice={notice}
          onDismiss={onDismissAlert}
        />

        <div className="mx-auto max-w-[1600px] p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
