import type { Lead } from "@/types/lead";
import type { ReportExportContextInput } from "@/components/reports/export/report-export-context";
import { generateLeadReportExcel } from "@/components/reports/crm/shared/lead-report-export";

export function generateLeadSourceExcel(
  leads: Lead[],
  context: ReportExportContextInput,
): Promise<Blob> {
  return generateLeadReportExcel("source", leads, context);
}
