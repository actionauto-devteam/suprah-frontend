import type { Lead } from "@/types/lead";

export function safeText(
  value: unknown,
  fallback = "—",
): string {
  const text = String(value ?? "").trim();

  return text || fallback;
}

export function formatLeadName(
  lead: Lead,
): string {
  const name = [
    lead.firstName,
    lead.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    name ||
    safeText(
      lead.senderName,
      "Unnamed lead",
    )
  );
}

export function formatVehicle(
  lead: Lead,
): string {
  return (
    [
      lead.vehicle?.year,
      lead.vehicle?.make,
      lead.vehicle?.model,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "—"
  );
}

export function formatDate(
  value: unknown,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPercentage(
  part: number,
  whole: number,
  decimalPlaces = 0,
): string {
  if (whole <= 0) {
    return decimalPlaces > 0
      ? `${(0).toFixed(decimalPlaces)}%`
      : "0%";
  }

  const value = (part / whole) * 100;

  return decimalPlaces > 0
    ? `${value.toFixed(decimalPlaces)}%`
    : `${Math.round(value)}%`;
}

export function addPdfFooter(
  doc: any,
  label: string,
  generatedAt: string,
): void {
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);

    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240);
    doc.line(14, height - 12, width - 14, height - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);

    doc.text(`Suprah.AI • ${label}`, 14, height - 7);

    doc.text(generatedAt, width / 2, height - 7, {
      align: "center",
    });

    doc.text(`Page ${page} of ${pages}`, width - 14, height - 7, {
      align: "right",
    });
  }
}

export function drawPdfHeader(
  doc: any,
  title: string,
  subtitle: string,
  period: string,
  accent: [number, number, number] = [16, 185, 129],
): void {
  const width = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, width, 25, "F");

  doc.setFillColor(...accent);
  doc.roundedRect(14, 7, 10, 10, 2, 2, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("S", 19, 13.7, {
    align: "center",
  });

  doc.setFontSize(13);
  doc.text(title, 29, 11.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(subtitle, 29, 17);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(period, width - 14, 11.5, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text("Generated locally in Suprah.AI", width - 14, 17, {
    align: "right",
  });
}

export function drawPdfSummaryCards(
  doc: any,
  items: Array<{
    label: string;
    value: string;
  }>,
  startY = 32,
  valueColor: [number, number, number] = [5, 150, 105],
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const gap = 4;
  const left = 14;
  const available = pageWidth - 28;

  const cardWidth =
    (available - gap * (items.length - 1)) / items.length;

  items.forEach((item, index) => {
    const x = left + index * (cardWidth + gap);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);

    doc.roundedRect(
      x,
      startY,
      cardWidth,
      17,
      2,
      2,
      "FD",
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);

    doc.text(
      item.label,
      x + 3,
      startY + 5.5,
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...valueColor);

    doc.text(
      item.value,
      x + 3,
      startY + 12.5,
    );
  });
}