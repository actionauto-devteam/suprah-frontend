"use client";

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtLongDateTimeMDT } from '@/lib/timezone';
import { 
    Activity, 
    Network, 
    Code, 
    Copy, 
    ExternalLink, 
    AlertCircle,
    Server,
    Globe,
    Cpu,
    User,
    ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SystemLogEntry } from '@/lib/types/monitoring';
import { cn } from '@/lib/utils';

interface CloudLogDetailDialogProps {
    log: SystemLogEntry | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTraceRequest?: (requestId: string) => void;
}

export function CloudLogDetailDialog({ log, open, onOpenChange, onTraceRequest }: CloudLogDetailDialogProps) {
    if (!log) return null;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`Copied ${label} to clipboard`);
    };

    const isError = ['ERROR', 'FATAL'].includes(log.level);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none bg-background shadow-2xl">
                <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
                   <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "p-2.5 rounded-xl",
                                isError ? "bg-red-400/10 text-red-500" : "bg-blue-400/10 text-blue-500"
                            )}>
                                <Activity className="h-5 w-5" />
                            </div>
                            <div className="space-y-0.5">
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    Log Diagnostics
                                    <Badge variant={isError ? "destructive" : "secondary"} className="uppercase text-[10px] scale-90">
                                        {log.level}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="font-mono text-[11px] truncate max-w-[500px]">
                                    {log._id} • {fmtLongDateTimeMDT(new Date(log.timestamp))}
                                </DialogDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {log.req?.id && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 gap-2 border-primary/20 text-primary hover:bg-primary/10"
                                    onClick={() => onTraceRequest?.(log.req?.id ?? '')}
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Trace Full Request
                                </Button>
                            )}
                        </div>
                   </div>
                </DialogHeader>

                <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 border-b bg-muted/10">
                        <TabsList className="bg-transparent h-12 gap-6 p-0 border-none">
                            <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1">Overview</TabsTrigger>
                            <TabsTrigger value="network" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1">Network</TabsTrigger>
                            <TabsTrigger value="trace" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1">Trace & JSON</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 p-6">
                        {/* OVERVIEW CONTENT */}
                        <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="p-4 rounded-xl bg-muted/30 border border-white/5 space-y-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <ShieldAlert className="h-3 w-3" />
                                    Event Message
                                </span>
                                <p className="text-sm font-mono leading-relaxed break-words">
                                    {log.message}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-muted/30 border border-white/5 space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Server className="h-3 w-3" />
                                        Environment
                                    </span>
                                    <Badge variant="outline" className="uppercase font-mono tracking-widest text-[11px] bg-background">
                                        {log.env}
                                    </Badge>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/30 border border-white/5 space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <Cpu className="h-3 w-3" />
                                        Context Source
                                    </span>
                                    <span className="text-sm font-medium">{log.context || 'Global Middleware'}</span>
                                </div>
                            </div>

                            {log.req?.userId && (
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                                   <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                            <User className="h-3 w-3" />
                                            Authenticatable Identity
                                        </span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => copyToClipboard(log.req?.userId ?? '', 'User ID')}>
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                   </div>
                                    <p className="text-xs font-mono font-bold">{log.req.userId}</p>
                                </div>
                            )}
                        </TabsContent>

                        {/* NETWORK CONTENT */}
                        <TabsContent value="network" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-muted/30 border border-white/5 space-y-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Method</span>
                                    <p className="text-lg font-bold font-mono text-primary">{log.req?.method || 'N/A'}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/30 border border-white/5 space-y-2 col-span-2">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status Response</span>
                                    <div className="flex items-center gap-3">
                                        <p className={cn(
                                            "text-lg font-bold font-mono",
                                            (log.res?.statusCode ?? 0) >= 400 ? "text-red-400" : "text-green-400"
                                        )}>
                                            {log.res?.statusCode || 'Pending'}
                                        </p>
                                        <Badge variant="outline" className="text-[10px]">
                                            {(log.res?.statusCode ?? 0) >= 400 ? 'Client/Server Error' : 'Success Outcome'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-muted/30 border border-white/5 space-y-3">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Globe className="h-3 w-3" />
                                    Full Request URL
                                </span>
                                <div className="rounded-lg bg-black/40 p-3 font-mono text-xs border border-white/5 text-blue-400 break-all">
                                    {log.req?.url || 'Internal Runtime Process'}
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-muted/30 border border-white/5 space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Source Address</span>
                                <p className="text-sm font-mono text-foreground/80">{log.req?.remoteAddress || 'No IP Captured'}</p>
                            </div>
                        </TabsContent>

                        {/* TRACE CONTENT */}
                        <TabsContent value="trace" className="mt-0 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                           <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Code className="h-3 w-3" />
                                    Forensic JSON Payload
                                </span>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 text-[10px] gap-2"
                                    onClick={() => copyToClipboard(JSON.stringify(log, null, 2), 'Raw Log')}
                                >
                                    <Copy className="h-3 w-3" />
                                    Copy Raw Data
                                </Button>
                           </div>

                            <div className="rounded-xl border bg-black p-5 font-mono text-[11px] leading-relaxed relative group overflow-hidden">
                                {isError && (
                                    <div className="absolute top-0 right-0 p-2 bg-red-500/10 text-red-500 rounded-bl-lg font-bold text-[8px] uppercase tracking-widest">
                                        Stack Detected
                                    </div>
                                )}
                                <pre className="text-green-400/90 overflow-x-auto selection:bg-green-500/30">
                                    {JSON.stringify(log, (key, value) => key === '_id' ? undefined : value, 2)}
                                </pre>
                            </div>
                        </TabsContent>
                    </ScrollArea>
                </Tabs>

                <DialogFooter className="p-4 border-t bg-muted/20">
                    <div className="w-full flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <span className="text-[9px] font-mono text-muted-foreground uppercase opacity-50 px-2 border-r">
                                PID: INTERNAL
                            </span>
                            <span className="text-[9px] font-mono text-muted-foreground uppercase opacity-50">
                                Indexed Logic v3
                            </span>
                         </div>
                         <Button variant="ghost" className="h-8 text-[11px]" onClick={() => onOpenChange(false)}>
                            Dismiss Intelligence
                         </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
