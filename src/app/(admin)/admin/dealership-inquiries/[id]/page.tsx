"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";

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

const STATUS_BADGE: Record<InquiryStatus, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  invited: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  registered: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  dismissed: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export default function DealershipInquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isActioning, setIsActioning] = useState(false);

  const { data: inquiry, isLoading, isError, error } = useQuery({
    queryKey: ["admin-dealership-inquiry", id],
    queryFn: async () => {
      const res = await apiClient.get(`/api/admin/dealership-inquiries/${id}`);
      return res.data?.data as DealershipInquiry;
    },
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-dealership-inquiry", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-dealership-inquiries"] });
  };

  const sendLink = async () => {
    setIsActioning(true);
    try {
      await apiClient.post(`/api/admin/dealership-inquiries/${id}/send-link`);
      toast.success("Setup link sent");
      invalidate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send setup link");
    } finally {
      setIsActioning(false);
    }
  };

  const dismiss = async () => {
    setIsActioning(true);
    try {
      await apiClient.post(`/api/admin/dealership-inquiries/${id}/dismiss`);
      toast.success("Inquiry dismissed");
      invalidate();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to dismiss inquiry");
    } finally {
      setIsActioning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !inquiry) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md border-destructive/30 bg-destructive/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <CardTitle>Inquiry Not Found</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "This inquiry could not be loaded."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 container mx-auto max-w-2xl">
      <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => router.push("/admin/dealership-inquiries")}>
        <ArrowLeft className="h-4 w-4" /> Back to inquiries
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{inquiry.email}</CardTitle>
            <Badge variant="outline" className={STATUS_BADGE[inquiry.status]}>
              {inquiry.status}
            </Badge>
          </div>
          <CardDescription>
            Submitted {new Date(inquiry.createdAt).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inquiry.invitedAt && (
            <div className="text-sm text-muted-foreground">
              Setup link sent {new Date(inquiry.invitedAt).toLocaleString()}
              {inquiry.invitedBy ? ` by ${inquiry.invitedBy.name}` : ""}
            </div>
          )}
          {inquiry.registeredOrganizationId && (
            <div className="text-sm text-muted-foreground">
              Registered as <span className="font-medium text-foreground">{inquiry.registeredOrganizationId.name}</span>
            </div>
          )}

          {inquiry.status !== "registered" && inquiry.status !== "dismissed" && (
            <div className="flex gap-2 pt-2">
              <Button className="gap-1.5" disabled={isActioning} onClick={sendLink}>
                <Send className="h-4 w-4" />
                {inquiry.status === "invited" ? "Resend Setup Link" : "Send Setup Link"}
              </Button>
              <Button variant="outline" className="gap-1.5" disabled={isActioning} onClick={dismiss}>
                <X className="h-4 w-4" />
                Dismiss
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
