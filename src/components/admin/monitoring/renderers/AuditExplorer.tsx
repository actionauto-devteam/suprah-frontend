"use client";

import React, { useState, useMemo } from 'react';
import { useAuditExplorer } from '@/hooks/api/use-admin-monitoring';
import { AuditLogTable } from './AuditLogTable';
import { LogDetailDialog } from './LogDetailDialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Search, Filter, ShieldCheck, Loader2, ArrowLeft, ArrowRight, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuditLogEntry } from '@/lib/types/monitoring';

export function AuditExplorer() {
    // 1. Filtering State
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [action, setAction] = useState<string>('all');
    const [entityType, setEntityType] = useState<string>('all');
    
    // 2. Selection State for Dialog
    const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // 3. API Query
    const queryParams = useMemo(() => ({
        page,
        limit: 20,
        search: search.length >= 3 ? search : undefined,
        action: action === 'all' ? undefined : action,
        entityType: entityType === 'all' ? undefined : entityType,
    }), [page, search, action, entityType]);

    const { data, isLoading, isFetching, refetch } = useAuditExplorer(queryParams);

    // 4. Handlers
    const handleViewDetail = (log: AuditLogEntry) => {
        setSelectedLog(log);
        setIsDialogOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="shadow-sm border-none bg-muted/20">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                System Audit Trail
                            </CardTitle>
                            <CardDescription className="mt-1">
                                Complete forensic record of all administrative and business-critical actions.
                            </CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => refetch()} 
                            disabled={isFetching}
                            className="hidden md:flex gap-2"
                        >
                            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                            {isFetching ? "Syncing..." : "Sync Logs"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Integrated Filters & Search Bar */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by Entity ID or Reason (min. 3 chars)..." 
                                className="pl-9 h-10 shadow-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Select value={action} onValueChange={setAction}>
                                <SelectTrigger className="w-full md:w-[150px] shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-3 w-3 text-muted-foreground" />
                                        <SelectValue placeholder="Action Type" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    <SelectItem value="CREATE">Create</SelectItem>
                                    <SelectItem value="UPDATE">Update</SelectItem>
                                    <SelectItem value="DELETE">Delete</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={entityType} onValueChange={setEntityType}>
                                <SelectTrigger className="w-full md:w-[150px] shadow-sm">
                                    <SelectValue placeholder="Entity Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Entities</SelectItem>
                                    <SelectItem value="Vehicle">Vehicle</SelectItem>
                                    <SelectItem value="Organization">Organization</SelectItem>
                                    <SelectItem value="User">User</SelectItem>
                                    <SelectItem value="Lead">Lead</SelectItem>
                                    <SelectItem value="Shipment">Shipment</SelectItem>
                                    <SelectItem value="Billing">Billing</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Data Visualization Layer */}
                    {isLoading ? (
                        <div className="h-[400px] flex flex-col items-center justify-center gap-4 border border-dashed rounded-lg bg-card shadow-inner">
                            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                            <div className="text-center animate-pulse">
                                <p className="text-sm font-semibold">Deciphering Audit Trails</p>
                                <p className="text-xs text-muted-foreground">Requesting paginated data from security pipeline...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <AuditLogTable 
                                logs={data?.logs || []} 
                                onViewDetail={handleViewDetail} 
                            />
                            
                            {/* Functional Pagination Controls */}
                            <div className="flex items-center justify-between px-2 pt-2 text-xs text-muted-foreground border-t">
                                <div className="flex items-center gap-4">
                                    <p className="font-medium">
                                        Found {data?.pagination?.total || 0} event records
                                    </p>
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 border border-dashed font-mono">
                                        <Info className="h-3 w-3" />
                                        <span>Page {page} of {data?.pagination?.pages || 1}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8" 
                                        disabled={page <= 1}
                                        onClick={() => setPage(p => p - 1)}
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8" 
                                        disabled={!data?.pagination?.pages || page >= data.pagination.pages}
                                        onClick={() => setPage(p => p + 1)}
                                    >
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Forensic Detail Overlay */}
            <LogDetailDialog 
                log={selectedLog} 
                open={isDialogOpen} 
                onOpenChange={setIsDialogOpen} 
            />
        </div>
    );
}