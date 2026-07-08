"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface GoldenSignalData {
    timestamp: string;
    requests: number;
    errors: number;
    latency: number;
}

interface GoldenSignalsChartProps {
    data: GoldenSignalData[];
}

export const GoldenSignalsChart = React.memo(({ data }: GoldenSignalsChartProps) => {
    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle>Golden Signals (Real-time)</CardTitle>
                <CardDescription>
                    Tracking requests, error rates, and p95 latency.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <XAxis
                                dataKey="timestamp"
                                stroke="#888888"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(str) => {
                                    const date = new Date(str);
                                    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Denver' });
                                }}
                            />
                            <YAxis
                                yAxisId="left"
                                stroke="#888888"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                label={{ value: 'Req/s', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#888888' } }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#888888"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                label={{ value: 'Latency (ms)', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: '#888888' } }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--background)',
                                    borderColor: 'var(--border)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                }}
                                itemStyle={{ padding: '2px 0' }}
                            />
                            <Legend />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="requests"
                                stroke="var(--primary)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                                name="Requests/s"
                                isAnimationActive={false}
                            />
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="errors"
                                stroke="var(--destructive)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                                name="Errors/s"
                                isAnimationActive={false}
                            />
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="latency"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4 }}
                                name="p95 Latency (ms)"
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
});

GoldenSignalsChart.displayName = 'GoldenSignalsChart';
