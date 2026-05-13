"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { FinanceApplicationFlow } from "@/components/finance/FinanceApplicationFlow";

export default function AdminFinanceApplicationPage() {
  const params = useParams();
  const vehicleId = params.id as string;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 px-4 py-3 bg-zinc-900 text-white rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-sm font-bold uppercase tracking-widest">
            Dealership Assistance Mode
          </p>
        </div>
        <p className="text-xs text-zinc-400 font-medium">
          Viewing as Administrator
        </p>
      </div>

      <FinanceApplicationFlow vehicleId={vehicleId} />
    </div>
  );
}
