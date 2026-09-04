'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Kbd } from '@/components/admin/primitives';

const GROUPS = [
  {
    title: 'Anywhere',
    items: [
      { keys: ['⌘', 'K'], label: 'Search drivers, dealerships and pages' },
      { keys: ['?'], label: 'Show this list' },
    ],
  },
  {
    title: 'Document review',
    items: [
      { keys: ['A'], label: 'Approve the open document' },
      { keys: ['R'], label: 'Reject the open document' },
      { keys: ['←', '→'], label: 'Previous / next document' },
      { keys: ['+', '−'], label: 'Zoom in / out' },
      { keys: ['Esc'], label: 'Close the reviewer' },
    ],
  },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== '?') return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
      event.preventDefault();
      setOpen((previous) => !previous);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Keyboard shortcuts</DialogTitle>
          <DialogDescription>Press ? at any time to bring this back.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </p>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.keys.map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
