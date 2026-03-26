"use client";

import { Suspense } from "react";
import PatientDashboardContent from "@/components/patient/PatientDashboardContent";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background p-6 md:p-8">
          <div className="mx-auto max-w-350 grid grid-cols-12 gap-5">
            <div className="col-span-12 h-28 rounded-2xl bg-secondary/40" />
            <div className="col-span-12 lg:col-span-8 h-44 rounded-2xl bg-secondary/30" />
            <div className="col-span-12 lg:col-span-4 h-44 rounded-2xl bg-secondary/30" />
          </div>
        </div>
      }
    >
      <PatientDashboardContent />
    </Suspense>
  );
}
