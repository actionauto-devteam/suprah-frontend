"use client";

import React from 'react';
import { 
    Clock, 
    AlertCircle, 
    Info, 
    ShieldAlert, 
    ChevronRight, 
    ChevronDown, 
    Copy,
    Link as LinkIcon
} from 'lucide-react';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { SystemLogEntry } from '@/lib/types/monitoring';
import { MDT_TZ } from '@/lib/timezone';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CloudLogDetailDialog } from './CloudLogDetailDialog';

interface AdvancedLogTableProps {
    logs: SystemLogEntry[] | undefined;
    isLoading: boolean;
    onTraceRequest?: (requestId: string) => void;
}

const LEVEL_CONFIG = {
    ERROR: { color: 'text-red-400', bg: 'bg-red-400/5', icon: ShieldAlert, border: 'border-red-400/20' },
    FATAL: { color: 'text-red-600', bg: 'bg-red-600/5', icon: ShieldAlert, border: 'border-red-600/20' },
    WARN: { color: 'text-yellow-400', bg: 'bg-yellow-400/5', icon: AlertCircle, border: 'border-yellow-400/20' },
    INFO: { color: 'text-blue-400', bg: 'bg-blue-400/5', icon: Info, border: 'border-blue-400/20' },
    DEBUG: { color: 'text-gray-400', bg: 'bg-gray-400/5', icon: Clock, border: 'border-gray-800' },
};

export function AdvancedLogTable({ logs, isLoading, onTraceRequest }: AdvancedLogTableProps) {
    const [selectedLog, setSelectedLog] = React.useState<SystemLogEntry | null>(null);
    const [dialogOpen, setDialogOpen] = React.useState(false);

    if (isLoading) {
        return (
            <div className="space-y-4 p-8 animate-pulse">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted/40 rounded-lg w-full" />
                ))}
            </div>
        );
    }

    if (!logs || logs.length === 0) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center text-sm text-muted-foreground italic gap-2">
                <div className="p-4 rounded-full bg-muted/20">
                    <Info className="h-6 w-6 opacity-30" />
                </div>
                // No log entries found matching your query.
            </div>
        );
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`Copied ${label} to clipboard`);
    };

    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-[#0a0a0a]">
            {/* Table Header (Fixed) */}
            <div className="grid grid-cols-[160px_100px_130px_1fr] items-center border-b px-6 py-2.5 bg-background/50 backdrop-blur-md sticky top-0 z-10 select-none">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Time</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-4">Status</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Request</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Message</span>
            </div>

            <ScrollArea className="h-full">
                <div className="flex flex-col">
                    {logs.map((log) => {
                        const config = LEVEL_CONFIG[log.level as keyof typeof LEVEL_CONFIG] || LEVEL_CONFIG.INFO;
                        const LogIcon = config.icon;
                        
                        return (
                            <div 
                                key={log._id} 
                                className={cn(
                                    "grid grid-cols-[160px_100px_130px_1fr] items-start px-6 py-2 border-b border-white/5 hover:bg-white/[0.04] transition-all group cursor-pointer active:scale-[0.995]",
                                    config.bg,
                                    selectedLog?._id === log._id && "bg-white/[0.06] border-l-2 border-l-primary"
                                )}
                                onClick={() => {
                                    setSelectedLog(log);
                                    setDialogOpen(true);
                                }}
                            >
                                {/* Timestamp */}
                                <div className="text-[11px] font-mono text-muted-foreground py-0.5 tabular-nums">
                                    {new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: MDT_TZ }) + ', ' + new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: MDT_TZ })}
                                </div>

                                {/* Status */}
                                <div className="flex items-center gap-2 pl-4">
                                    <LogIcon className={cn("h-3.5 w-3.5", config.color)} />
                                    <span className={cn("text-[10px] font-bold uppercase tracking-tighter", config.color)}>
                                        {log.level}
                                    </span>
                                </div>

                                {/* Method / Path Fragment */}
                                <div className="flex items-center gap-2">
                                    {log.req && (
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-mono bg-background text-primary/80 border-primary/20">
                                                {log.req.method}
                                            </Badge>
                                            {log.res?.statusCode && (
                                                <span className={cn(
                                                    "text-[10px] font-mono font-bold px-1 rounded",
                                                    log.res.statusCode >= 400 ? "text-red-400" : "text-green-400"
                                                )}>
                                                    {log.res.statusCode}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Message Content */}
                                <div className="flex flex-col gap-1 pr-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <p className="text-[11px] font-mono leading-relaxed text-gray-300 break-all line-clamp-3">
                                            {log.message}
                                        </p>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {log.req?.id && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        copyToClipboard(log.req?.id ?? '', 'Request ID');
                                                    }}
                                                >
                                                    <LinkIcon className="h-3 w-3" />
                                                </Button>
                                            )}
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyToClipboard(JSON.stringify(log, null, 2), 'Log JSON');
                                                }}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {/* Sub-Context (Environment) */}
                                    {log.env && (
                                        <span className="text-[9px] font-mono text-muted-foreground uppercase opacity-50 tracking-widest pl-1 border-l-2 border-primary/20">
                                            env:{log.env}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            <CloudLogDetailDialog 
                log={selectedLog}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onTraceRequest={(requestId) => {
                    setDialogOpen(false);
                    onTraceRequest?.(requestId);
                }}
            />
        </div>
    );
}
