"use client";

import ExerciseComponent from "@/components/ExerciseComponent";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

export default function ExercisePage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Camera Initializing...</p>
        </div>
      }
    >
      <ExerciseComponent />
    </ErrorBoundary>
  );
}
