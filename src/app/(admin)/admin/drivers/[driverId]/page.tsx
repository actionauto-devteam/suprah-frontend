import { DriverDetailView } from "@/components/admin/drivers/driver-detail-view";

export default async function AdminDriverDetailPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;
  return <DriverDetailView driverId={driverId} />;
}
