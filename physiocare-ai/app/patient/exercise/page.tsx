"use client";

import { Suspense } from "react";
import ExerciseComponent from "@/components/ExerciseComponent";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">Camera Initializing...</div>}>
      <ErrorBoundary
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">
            Camera Initializing...
          </div>
        }
      >
        <ExerciseComponent />
      </ErrorBoundary>
    </Suspense>
  );
}
