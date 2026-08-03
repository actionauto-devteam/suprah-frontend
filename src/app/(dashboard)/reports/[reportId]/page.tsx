import { notFound } from "next/navigation";

import ReportWorkspace from "@/components/reports/workspace/ReportWorkspace";
import { isReportId } from "@/types/report-filters";

interface ReportWorkspacePageProps {
  params: Promise<{
    reportId: string;
  }>;
}

export default async function ReportWorkspacePage({
  params,
}: ReportWorkspacePageProps) {
  const { reportId } = await params;

  if (!isReportId(reportId)) {
    notFound();
  }

  return <ReportWorkspace reportId={reportId} />;
}
