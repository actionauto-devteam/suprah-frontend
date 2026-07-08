"use client";

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AuditLogEntry } from '@/lib/types/monitoring';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fmtLongDateTimeMDT } from '@/lib/timezone';
import { ShieldCheck, User, Calendar, Database, Info } from 'lucide-react';

interface LogDetailDialogProps {
    log: AuditLogEntry | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LogDetailDialog({ log, open, onOpenChange }: LogDetailDialogProps) {
    if (!log) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <DialogTitle>Audit Event Details</DialogTitle>
                    </div>
                    <DialogDescription>
                        Complete forensic record of system-wide changes.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="mt-4 max-h-[60vh] pr-4">
                    <div className="space-y-6">
                        {/* Event Metadata */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1 p-3 rounded-md bg-muted/50 border">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                    <Calendar className="h-3 w-3" />
                                    Timestamp
                                </div>
                                <span className="text-sm font-medium">
                                    {fmtLongDateTimeMDT(new Date(log.timestamp))}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 p-3 rounded-md bg-muted/50 border">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                    <Database className="h-3 w-3" />
                                    Entity Type
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{log.entityType}</span>
                                    <Badge variant="outline" className="text-[10px] scale-90 px-1">
                                        ID {log.entityId.slice(-8)}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 p-3 rounded-md bg-muted/50 border col-span-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                    <User className="h-3 w-3" />
                                    Actor
                                </div>
                                <span className="text-sm font-medium">
                                    {typeof log.performedBy === 'object' && log.performedBy ? (log.performedBy as any).name : 'System Pipeline'}
                                    {typeof log.performedBy === 'object' && log.performedBy && (
                                        <span className="text-xs text-muted-foreground ml-2">
                                            ({(log.performedBy as any).email})
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Reason Section */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-bold">
                                <Info className="h-3 w-3" />
                                Justification / Reason
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground bg-muted/30 p-3 rounded-md border border-dashed italic">
                                "{log.reason || 'No specific reasoning was provided for this action.'}"
                            </p>
                        </div>

                        {/* Payload / Change Diff */}
                        {log.changes && Object.keys(log.changes).length > 0 && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-bold">
                                    <Database className="h-3 w-3" />
                                    Payload Delta
                                </div>
                                <div className="rounded-md border bg-black p-4 font-mono text-[11px] leading-normal text-green-400 overflow-x-auto shadow-inner">
                                    <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                
                <div className="flex justify-end mt-4">
                    <Badge variant="secondary" className="font-mono text-[10px]">
                        Event: {log._id}
                    </Badge>
                </div>
            </DialogContent>
        </Dialog>
    );
}
