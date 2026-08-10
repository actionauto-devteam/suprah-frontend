import type {
  ReportAnalyticsChart,
  ReportAnalyticsModel,
  ReportAnalyticsSeries,
} from "@/components/reports/analytics/report-analytics-data";
import {
  hasReportAnalyticsChartData,
  SUPRAH_ANALYTICS_COLORS,
} from "@/components/reports/analytics/report-analytics-data";

interface DrawPdfAnalyticsOptions {
  left: number;
  right: number;
  startY: number;
  pageWidth: number;
  maxCharts?: number;
}

const CANVAS_WIDTH = 1600;
const CANVAS_HEIGHT = 430;

function formatValue(value: number, series?: ReportAnalyticsSeries): string {
  if (series?.format === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (series?.format === "percentage") return `${value.toFixed(1)}%`;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function truncate(context: CanvasRenderingContext2D, value: string, maxWidth: number): string {
  if (context.measureText(value).width <= maxWidth) return value;
  let result = value;
  while (result.length > 1 && context.measureText(`${result}...`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}...`;
}

function drawChartFrame(
  context: CanvasRenderingContext2D,
  chart: ReportAnalyticsChart,
): void {
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  context.fillStyle = "#0F172A";
  roundRect(context, 18, 18, CANVAS_WIDTH - 36, CANVAS_HEIGHT - 36, 22);
  context.fill();

  context.fillStyle = "#FFFFFF";
  roundRect(context, 24, 24, CANVAS_WIDTH - 48, CANVAS_HEIGHT - 48, 18);
  context.fill();

  context.fillStyle = "#10B981";
  roundRect(context, 24, 24, 14, CANVAS_HEIGHT - 48, 8);
  context.fill();

  context.fillStyle = "#0F172A";
  context.font = "700 34px Arial, Helvetica, sans-serif";
  context.fillText(chart.title, 66, 72);

  context.fillStyle = "#64748B";
  context.font = "400 20px Arial, Helvetica, sans-serif";
  context.fillText(truncate(context, chart.description, CANVAS_WIDTH - 140), 66, 105);

  context.fillStyle = "#ECFDF5";
  roundRect(context, CANVAS_WIDTH - 300, 44, 238, 42, 21);
  context.fill();
  context.fillStyle = "#047857";
  context.font = "700 17px Arial, Helvetica, sans-serif";
  context.textAlign = "center";
  context.fillText("SUPRAH ANALYTICS", CANVAS_WIDTH - 181, 71);
  context.textAlign = "left";
}

function drawDonut(context: CanvasRenderingContext2D, chart: ReportAnalyticsChart): void {
  const data = chart.data.filter((item) => Number(item.value || 0) > 0);
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const centerX = 360;
  const centerY = 268;
  const outerRadius = 122;
  const innerRadius = 73;
  let angle = -Math.PI / 2;

  if (total <= 0) {
    context.fillStyle = "#94A3B8";
    context.font = "600 24px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.fillText("No analytics data", centerX, centerY);
    context.textAlign = "left";
    return;
  }

  data.forEach((item, index) => {
    const value = Number(item.value || 0);
    const nextAngle = angle + (value / total) * Math.PI * 2;
    context.beginPath();
    context.arc(centerX, centerY, outerRadius, angle, nextAngle);
    context.arc(centerX, centerY, innerRadius, nextAngle, angle, true);
    context.closePath();
    context.fillStyle = SUPRAH_ANALYTICS_COLORS[index % SUPRAH_ANALYTICS_COLORS.length];
    context.fill();
    angle = nextAngle;
  });

  context.fillStyle = "#0F172A";
  context.font = "800 48px Arial, Helvetica, sans-serif";
  context.textAlign = "center";
  context.fillText(total.toLocaleString("en-US"), centerX, centerY + 6);
  context.fillStyle = "#64748B";
  context.font = "700 18px Arial, Helvetica, sans-serif";
  context.fillText("RECORDS", centerX, centerY + 38);
  context.textAlign = "left";

  const legendX = 650;
  const legendItems = data.slice(0, 8);
  const legendTop = 138;
  const legendBottom = CANVAS_HEIGHT - 48;
  const availableLegendHeight = Math.max(1, legendBottom - legendTop);
  const rowHeight =
    legendItems.length > 1
      ? Math.min(40, availableLegendHeight / (legendItems.length - 1))
      : 40;

  legendItems.forEach((item, index) => {
    const y = legendTop + index * rowHeight;
    context.fillStyle =
      SUPRAH_ANALYTICS_COLORS[index % SUPRAH_ANALYTICS_COLORS.length];
    context.beginPath();
    context.arc(legendX, y, 8, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#334155";
    context.font = "600 21px Arial, Helvetica, sans-serif";
    context.fillText(
      truncate(context, item.label, 455),
      legendX + 22,
      y + 7,
    );

    const value = Number(item.value || 0);
    const share = total > 0 ? (value / total) * 100 : 0;
    context.fillStyle = "#0F172A";
    context.font = "700 21px Arial, Helvetica, sans-serif";
    context.textAlign = "right";
    context.fillText(
      `${value.toLocaleString("en-US")} (${share.toFixed(1)}%)`,
      CANVAS_WIDTH - 92,
      y + 7,
    );
    context.textAlign = "left";
  });
}

function drawBars(context: CanvasRenderingContext2D, chart: ReportAnalyticsChart): void {
  const data = chart.data.slice(0, 8);
  const series = chart.series;
  const left = 250;
  const top = 140;
  const right = CANVAS_WIDTH - 100;
  const bottom = CANVAS_HEIGHT - 54;
  const chartWidth = right - left;
  const chartHeight = bottom - top;
  const values = data.flatMap((item) => series.map((entry) => Number(item[entry.key] || 0)));
  const maxValue = Math.max(1, ...values);

  context.strokeStyle = "#E2E8F0";
  context.lineWidth = 2;
  for (let step = 0; step <= 4; step += 1) {
    const x = left + (chartWidth * step) / 4;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, bottom);
    context.stroke();
    context.fillStyle = "#64748B";
    context.font = "500 16px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.fillText(formatValue((maxValue * step) / 4, series[0]), x, bottom + 26);
  }
  context.textAlign = "left";

  const groupHeight = chartHeight / Math.max(1, data.length);
  const barGap = 7;
  const barHeight = Math.min(24, (groupHeight - 8 - barGap * Math.max(0, series.length - 1)) / Math.max(1, series.length));

  data.forEach((item, dataIndex) => {
    const groupTop = top + dataIndex * groupHeight + 4;
    context.fillStyle = "#334155";
    context.font = "600 18px Arial, Helvetica, sans-serif";
    context.textAlign = "right";
    context.fillText(truncate(context, item.label, 190), left - 18, groupTop + groupHeight / 2 + 6);

    series.forEach((entry, seriesIndex) => {
      const value = Number(item[entry.key] || 0);
      const width = (value / maxValue) * chartWidth;
      const y = groupTop + seriesIndex * (barHeight + barGap);
      context.fillStyle = entry.color;
      roundRect(context, left, y, Math.max(2, width), barHeight, 5);
      context.fill();

      context.font = "700 15px Arial, Helvetica, sans-serif";
      if (width > 100) {
        context.fillStyle = "#FFFFFF";
        context.textAlign = "right";
        context.fillText(
          formatValue(value, entry),
          left + width - 8,
          y + barHeight - 6,
        );
      } else {
        context.fillStyle = "#334155";
        context.textAlign = "left";
        context.fillText(
          formatValue(value, entry),
          Math.min(right - 2, left + width + 8),
          y + barHeight - 6,
        );
      }
    });
  });

  context.textAlign = "left";
  let legendX = left;
  series.forEach((entry) => {
    context.fillStyle = entry.color;
    roundRect(context, legendX, 112, 18, 8, 4);
    context.fill();
    context.fillStyle = "#475569";
    context.font = "600 16px Arial, Helvetica, sans-serif";
    context.fillText(entry.label, legendX + 26, 121);
    legendX += context.measureText(entry.label).width + 70;
  });
}

function drawLines(context: CanvasRenderingContext2D, chart: ReportAnalyticsChart): void {
  const data = chart.data;
  const series = chart.series;
  const left = 125;
  const top = 145;
  const right = CANVAS_WIDTH - 90;
  const bottom = CANVAS_HEIGHT - 70;
  const chartWidth = right - left;
  const chartHeight = bottom - top;
  const values = data.flatMap((item) =>
    series.map((entry) => Number(item[entry.key] || 0)),
  );
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const range = Math.max(1, maximum - minimum);
  const valueToY = (value: number) =>
    bottom - ((value - minimum) / range) * chartHeight;

  context.strokeStyle = "#E2E8F0";
  context.lineWidth = 2;
  for (let step = 0; step <= 4; step += 1) {
    const value = minimum + (range * step) / 4;
    const y = valueToY(value);
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(right, y);
    context.stroke();

    context.fillStyle = "#64748B";
    context.font = "500 15px Arial, Helvetica, sans-serif";
    context.textAlign = "right";
    context.fillText(formatValue(value, series[0]), left - 14, y + 5);
  }

  if (minimum < 0 && maximum > 0) {
    const zeroY = valueToY(0);
    context.strokeStyle = "#94A3B8";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(left, zeroY);
    context.lineTo(right, zeroY);
    context.stroke();
  }

  const pointX = (index: number) =>
    data.length === 1
      ? left + chartWidth / 2
      : left + (chartWidth * index) / (data.length - 1);

  series.forEach((entry) => {
    context.strokeStyle = entry.color;
    context.lineWidth = 5;
    context.beginPath();
    data.forEach((item, index) => {
      const x = pointX(index);
      const value = Number(item[entry.key] || 0);
      const y = valueToY(value);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();

    data.forEach((item, index) => {
      const x = pointX(index);
      const value = Number(item[entry.key] || 0);
      const y = valueToY(value);
      context.fillStyle = entry.color;
      context.beginPath();
      context.arc(x, y, 6, 0, Math.PI * 2);
      context.fill();
    });
  });

  context.fillStyle = "#64748B";
  context.font = "500 16px Arial, Helvetica, sans-serif";
  context.textAlign = "center";
  data.forEach((item, index) => {
    const x = pointX(index);
    context.fillText(truncate(context, item.label, 150), x, bottom + 28);
  });
  context.textAlign = "left";

  let legendX = left;
  series.forEach((entry) => {
    context.fillStyle = entry.color;
    roundRect(context, legendX, 112, 18, 8, 4);
    context.fill();
    context.fillStyle = "#475569";
    context.font = "600 16px Arial, Helvetica, sans-serif";
    context.fillText(entry.label, legendX + 26, 121);
    legendX += context.measureText(entry.label).width + 70;
  });
}

function chartDataUrl(chart: ReportAnalyticsChart): string | null {
  if (typeof document === "undefined") return null;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return null;

    drawChartFrame(context, chart);
    if (chart.kind === "donut") drawDonut(context, chart);
    else if (chart.kind === "bar") drawBars(context, chart);
    else drawLines(context, chart);

    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export function drawReportAnalyticsCharts(
  doc: any,
  model: ReportAnalyticsModel,
  options: DrawPdfAnalyticsOptions,
): number {
  const charts = model.charts
    .filter(hasReportAnalyticsChartData)
    .sort(
      (first, second) =>
        (first.pdfPriority ?? Number.MAX_SAFE_INTEGER) -
        (second.pdfPriority ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, options.maxCharts ?? 2);

  if (charts.length === 0) return options.startY;

  const contentWidth = options.right - options.left;
  const gap = 7;
  const pageHeight = Number(
    doc.internal?.pageSize?.getHeight?.() ?? 210,
  );
  const footerTop = pageHeight - 14;
  const headingReserve = 14;
  const availableForCharts = Math.max(
    48,
    footerTop - options.startY - headingReserve - gap * Math.max(0, charts.length - 1),
  );
  const imageHeight = Math.min(61, availableForCharts / charts.length);
  let y = options.startY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(model.title.toUpperCase(), options.left, y);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.7);
  doc.line(options.left, y + 2.2, options.right, y + 2.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.1);
  doc.setTextColor(100, 116, 139);
  const description = doc.splitTextToSize(model.description, contentWidth);
  doc.text(description.slice(0, 2), options.left, y + 7);
  y += 14;

  charts.forEach((chart) => {
    const image = chartDataUrl(chart);
    if (!image) return;

    try {
      doc.addImage(
        image,
        "PNG",
        options.left,
        y,
        contentWidth,
        imageHeight,
        undefined,
        "FAST",
      );
      y += imageHeight + gap;
    } catch {
      // A single chart-rendering failure should not prevent the report export.
    }
  });

  return y;
}