"use client";

import * as React from "react";
import { CustomerRecordsList } from "@/components/customer-records/CustomerRecordsList";

export default function CustomerRecordsPage() {
  return (
    <React.Suspense fallback={null}>
      <CustomerRecordsList />
    </React.Suspense>
  );
}
