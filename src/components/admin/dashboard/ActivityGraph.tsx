"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/providers/AuthProvider"
import { apiClient } from "@/lib/api-client"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent
} from "@/components/ui/chart"
import { Loader2 } from "lucide-react"

export const description = "A stacked bar chart with a legend"

// Define colors for known entity types
const CHART_COLORS = {
    User: "var(--chart-1)",
    System: "var(--chart-2)",
    Organization: "var(--chart-3)",
    Lead: "var(--chart-4)",
    Quote: "var(--chart-5)",
    Conversation: "var(--chart-1)",
    Shipment: "var(--chart-2)",
    Driver: "var(--chart-3)",
    Invitation: "var(--chart-4)",
    Billing: "var(--chart-5)"
}

export function ActivityGraph() {
    const { getToken } = useAuth()

    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin-audit-stats'],
        queryFn: async () => {
            const token = await getToken()
            const res = await apiClient.get<any>('/api/admin/audit-logs/stats', {
                headers: { Authorization: `Bearer ${token}` }
            })
            return res.data?.data
        }
    })

    // Transform data for the chart
    const chartData = React.useMemo(() => {
        if (!stats) return []
        return stats.map((item: any) => ({
            date: item.date,
            ...item.breakdown
        }))
    }, [stats])

    // Generate chart config dynamically based on data keys, or use static map
    const chartConfig = React.useMemo(() => {
        const config: ChartConfig = {}
        if (!stats) return config

        // Collect all unique keys from all breakdowns
        const keys = new Set<string>()
        stats.forEach((item: any) => {
            if (item.breakdown) {
                Object.keys(item.breakdown).forEach(key => keys.add(key))
            }
        })

        keys.forEach(key => {
            config[key] = {
                label: key,
                color: CHART_COLORS[key as keyof typeof CHART_COLORS] || "var(--chart-1)",
            }
        })

        return config
    }, [stats])

    if (isLoading) {
        return (
            <Card className="h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>System Activity</CardTitle>
                <CardDescription>
                    Audit log events over the last 30 days.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="aspect-auto h-[350px] w-full">
                    <BarChart accessibilityLayer data={chartData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => {
                                return new Date(value).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    timeZone: "America/Denver",
                                })
                            }}
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent hideLabel />
                            }
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        {Object.keys(chartConfig).map((key) => (
                            <Bar
                                key={key}
                                dataKey={key}
                                stackId="a"
                                fill={chartConfig[key].color}
                                radius={[0, 0, 0, 0]}
                            />
                        ))}
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
