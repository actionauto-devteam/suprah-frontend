"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Loader2, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type InquiryStatus = "pending" | "invited" | "registered" | "dismissed";

interface DealershipInquiry {
  _id: string;
  email: string;
  status: InquiryStatus;
  createdAt: string;
  invitedAt?: string;
  invitedBy?: { name: string; email: string };
  registeredOrganizationId?: { name: string; slug: string };
}

const STATUS_TABS: { value: InquiryStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "invited", label: "Invited" },
  { value: "registered", label: "Registered" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
];

const STATUS_BADGE: Record<InquiryStatus, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  invited: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  registered: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  dismissed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export default function DealershipInquiriesPage() {
  const [status, setStatus] = useState<InquiryStatus | "all">("pending");
  const queryClient = useQueryClient();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-dealership-inquiries", status],
    queryFn: async () => {
      const res = await apiClient.get("/api/admin/dealership-inquiries", {
        params: { status },
      });
      return (res.data?.data?.inquiries ?? []) as DealershipInquiry[];
    },
  });

  const sendLink = async (id: string) => {
    setActioningId(id);
    try {
      await apiClient.post(`/api/admin/dealership-inquiries/${id}/send-link`);
      toast.success("Setup link sent");
      queryClient.invalidateQueries({ queryKey: ["admin-dealership-inquiries"] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send setup link");
    } finally {
      setActioningId(null);
    }
  };

  const dismiss = async (id: string) => {
    setActioningId(id);
    try {
      await apiClient.post(`/api/admin/dealership-inquiries/${id}/dismiss`);
      toast.success("Inquiry dismissed");
      queryClient.invalidateQueries({ queryKey: ["admin-dealership-inquiries"] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to dismiss inquiry");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6 container mx-auto">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dealership Inquiries</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Prospective dealerships that left their email. Send a private setup link once you&apos;re ready to onboard them.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              status === tab.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inquiries</CardTitle>
          <CardDescription>
            {status === "all" ? "All inquiries" : `${STATUS_TABS.find((t) => t.value === status)?.label} inquiries`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Failed to load inquiries."}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data && data.length > 0 ? (
                    data.map((inquiry) => (
                      <TableRow key={inquiry._id}>
                        <TableCell className="font-medium">
                          <Link href={`/admin/dealership-inquiries/${inquiry._id}`} className="hover:underline">
                            {inquiry.email}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_BADGE[inquiry.status]}>
                            {inquiry.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(inquiry.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {inquiry.status !== "registered" && inquiry.status !== "dismissed" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                disabled={actioningId === inquiry._id}
                                onClick={() => sendLink(inquiry._id)}
                              >
                                <Send className="h-3.5 w-3.5" />
                                {inquiry.status === "invited" ? "Resend" : "Send Link"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1.5 text-muted-foreground"
                                disabled={actioningId === inquiry._id}
                                onClick={() => dismiss(inquiry._id)}
                              >
                                <X className="h-3.5 w-3.5" />
                                Dismiss
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        No inquiries found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
