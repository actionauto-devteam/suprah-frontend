import type { Lead } from "@/types/lead";
import type { ReportExportContextInput } from "@/components/reports/export/report-export-context";
import { generateLeadReportPdf } from "@/components/reports/crm/shared/lead-report-export";

export function generateLeadSourcePdf(
  leads: Lead[],
  context: ReportExportContextInput,
): Promise<Blob> {
  return generateLeadReportPdf("source", leads, context);
}
