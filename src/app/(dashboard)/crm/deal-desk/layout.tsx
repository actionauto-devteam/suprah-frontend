import type { ReactNode } from 'react';

export const metadata = { title: 'Deal Desk · Suprah AI' };

export default function DealDeskLayout({ children }: { children: ReactNode }) {
  return <div className="relative min-h-full w-full">{children}</div>;
}
