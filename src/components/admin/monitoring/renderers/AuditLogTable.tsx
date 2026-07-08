"use client";

import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AuditLogEntry } from '@/lib/types/monitoring';
import { MDT_TZ } from '@/lib/timezone';
import { Eye, User, Calendar, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AuditLogTableProps {
    logs: AuditLogEntry[];
    onViewDetail: (log: AuditLogEntry) => void;
}

const actionColors = {
    CREATE: 'bg-green-500/10 text-green-500 border-green-500/20',
    UPDATE: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    DELETE: 'bg-destructive/10 text-destructive border-destructive/20',
    OTHER: 'bg-muted text-muted-foreground border-muted-foreground/20',
};

export const AuditLogTable = React.memo(({ logs, onViewDetail }: AuditLogTableProps) => {
    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="w-[180px]">Timestamp</TableHead>
                        <TableHead className="w-[120px]">Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead className="hidden md:table-cell">Performed By</TableHead>
                        <TableHead>Reason / Details</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                No audit events found matching the criteria.
                            </TableCell>
                        </TableRow>
                    ) : (
                        logs.map((log) => (
                            <TableRow key={log._id} className="group hover:bg-muted/30 transition-colors">
                                <TableCell className="whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: MDT_TZ }) + ', ' + new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: MDT_TZ })}</span>
                                        <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleDateString('en-US', { year: 'numeric', timeZone: MDT_TZ })}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={actionColors[log.action as keyof typeof actionColors]}>
                                        {log.action}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold">{log.entityType}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">{log.entityId.slice(-8)}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <div className="flex items-center gap-2">
                                        <User className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-sm">
                                            {typeof log.performedBy === 'object' && log.performedBy ? (log.performedBy as any).name : 'System'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <p className="text-sm text-muted-foreground max-w-[300px] truncate">
                                        {log.reason || 'No specific reason provided.'}
                                    </p>
                                </TableCell>
                                <TableCell className="text-right">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => onViewDetail(log)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View Details</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
});

AuditLogTable.displayName = 'AuditLogTable';
