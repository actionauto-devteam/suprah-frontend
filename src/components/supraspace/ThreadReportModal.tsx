'use client';

import { FileText, X } from 'lucide-react';

export type ThreadReportAction = 'pdf' | 'docx' | 'copy';

type ThreadReportModalProps = {
  conversationName: string;
  date: string;
  working: ThreadReportAction | null;
  onDateChange: (date: string) => void;
  onClose: () => void;
  onAction: (format: ThreadReportAction) => void;
};

export function ThreadReportModal({
  conversationName,
  date,
  working,
  onDateChange,
  onClose,
  onAction,
}: ThreadReportModalProps) {
  return (
    <div className="ss4-overlay fixed inset-0 z-210 flex items-center justify-center p-4" onClick={onClose}>
      <div className="ss4-modal w-full max-w-sm overflow-hidden" onClick={event => event.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border-1)' }}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
            <FileText className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="ss4-display truncate font-bold" style={{ color: 'var(--text-primary)', fontSize: 15 }}>Thread Report</p>
            <p className="truncate" style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>{conversationName}</p>
          </div>
          <button type="button" onClick={onClose} className="ss4-icon-btn h-8 w-8 shrink-0" aria-label="Close thread report">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <label className="block">
            <span className="mb-1.5 block font-semibold" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Date</span>
            <input
              type="date"
              value={date}
              onChange={event => onDateChange(event.target.value)}
              className="ss4-search-input h-10 w-full px-3 text-sm"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => onAction('pdf')} disabled={!!working || !date} className="ss4-send-btn h-10 px-2 font-semibold disabled:opacity-50" style={{ fontSize: 12 }}>
              {working === 'pdf' ? 'Saving...' : 'PDF'}
            </button>
            <button type="button" onClick={() => onAction('docx')} disabled={!!working || !date} className="ss4-send-btn h-10 px-2 font-semibold disabled:opacity-50" style={{ fontSize: 12 }}>
              {working === 'docx' ? 'Saving...' : 'DOCX'}
            </button>
            <button type="button" onClick={() => onAction('copy')} disabled={!!working || !date} className="ss4-send-btn h-10 px-2 font-semibold disabled:opacity-50" style={{ fontSize: 12 }}>
              {working === 'copy' ? 'Copying...' : 'Copy Text'}
            </button>
          </div>
          <div className="flex items-center justify-end">
            <button type="button" onClick={onClose} className="ss4-pill-btn h-9 px-3 font-semibold" style={{ fontSize: 12 }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
