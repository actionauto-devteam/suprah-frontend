"use client";

import React from 'react';
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip, 
    Cell,
    CartesianGrid
} from 'recharts';
import { LogStatsEntry } from '@/lib/types/monitoring';
import { fmtDateTime24MDT } from '@/lib/timezone';

interface LogHistogramProps {
    data: LogStatsEntry[] | undefined;
    isLoading: boolean;
}

export function LogHistogram({ data, isLoading }: LogHistogramProps) {
    if (isLoading) {
        return (
            <div className="h-24 w-full flex items-end gap-1 px-4 animate-pulse">
                {Array.from({ length: 40 }).map((_, i) => (
                    <div 
                        key={i} 
                        className="flex-1 bg-muted rounded-t-sm" 
                        style={{ height: `${Math.random() * 60 + 20}%` }}
                    />
                ))}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="h-24 w-full flex items-center justify-center text-xs text-muted-foreground border-b italic">
                // No logs recorded in this timeline.
            </div>
        );
    }

    // Merge data if needed or format for Recharts
    const chartData = data.map(entry => ({
        time: entry._id,
        total: entry.count,
        errors: entry.errors,
        warnings: entry.warnings,
        info: entry.count - (entry.errors + entry.warnings)
    }));

    return (
        <div className="h-28 w-full bg-background/50 border-b relative group">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <Tooltip 
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-popover border border-white/10 rounded-lg p-2.5 shadow-xl text-[10px] font-mono animate-in zoom-in-95 duration-200">
                                        <p className="text-muted-foreground mb-1.5">{fmtDateTime24MDT(new Date(data.time))}</p>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-blue-400">INFO</span>
                                                <span className="font-bold">{data.info}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-yellow-400">WARN</span>
                                                <span className="font-bold">{data.warnings}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-red-400">ERROR</span>
                                                <span className="font-bold">{data.errors}</span>
                                            </div>
                                            <div className="border-t border-white/5 pt-1 mt-1 flex items-center justify-between gap-4">
                                                <span className="text-foreground uppercase opacity-50">Total</span>
                                                <span className="font-bold">{data.total}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    />
                    <Bar dataKey="total" stackId="a">
                        {chartData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.errors > 0 ? '#ef4444' : entry.warnings > 0 ? '#eab308' : '#3b82f6'} 
                                fillOpacity={0.4}
                                className="transition-all duration-300 hover:fill-opacity-100"
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            
            <div className="absolute top-2 right-4 flex items-center gap-4">
                 <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500/40" />
                    <span className="text-[9px] uppercase tracking-tighter text-muted-foreground font-bold">Traffic</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500/60 animate-pulse" />
                    <span className="text-[9px] uppercase tracking-tighter text-muted-foreground font-bold">Errors</span>
                 </div>
            </div>
        </div>
    );
}
