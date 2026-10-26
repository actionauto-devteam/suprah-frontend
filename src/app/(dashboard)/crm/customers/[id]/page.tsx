"use client";

import { useParams } from "next/navigation";
import { CustomerProfile } from "@/components/customer-records/CustomerProfile";

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  return id ? <CustomerProfile key={id} customerId={id} /> : null;
}
