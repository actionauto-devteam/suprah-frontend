import { DriverDetailView } from "@/components/admin/drivers/driver-detail-view";

export default async function AdminDriverDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ driverId: string }>;
  searchParams: Promise<{ review?: string }>;
}) {
  const { driverId } = await params;
  const { review } = await searchParams;
  return <DriverDetailView driverId={driverId} autoOpenReview={review === "1"} />;
}
