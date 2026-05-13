"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { FinanceApplicationFlow } from "@/components/finance/FinanceApplicationFlow";

export default function CustomerFinanceApplicationPage() {
  const params = useParams();
  const vehicleId = params.id as string;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
      <FinanceApplicationFlow vehicleId={vehicleId} />
    </div>
  );
}
