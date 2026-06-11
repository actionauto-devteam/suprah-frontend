"use client";

import * as React from "react";
import { ListingWizard } from "@/components/customer/auction/wizard/ListingWizard";

export default function NewListingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      }
    >
      <ListingWizard />
    </React.Suspense>
  );
}
