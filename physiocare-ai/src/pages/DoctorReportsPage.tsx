"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { getActorHeaders } from "@/lib/actor-context";

export default function DoctorReportsPage() {
  const { status } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-sessions-reports"],
    queryFn: async () => {
      const response = await fetch("/api/doctor/sessions", { headers: getActorHeaders("DOCTOR") });
      if (!response.ok) {
        return { items: [] };
      }
      return response.json();
    },
    enabled: status !== "loading",
  });

  const items = Array.isArray(data?.items) ? data.items : [];

  if (status === "loading") {
    return (
      <DashboardLayout role="doctor">
        <div className="p-6 md:p-8 max-w-350 mx-auto">
          <GlassCard className="p-6">
            <p className="text-sm text-muted-foreground">Loading reports...</p>
          </GlassCard>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="doctor">
      <div className="p-6 md:p-8 max-w-350 mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Review exercise and telehealth AI reports.</p>
        </div>

        <GlassCard className="p-5 space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading reports...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports available yet.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/6 bg-secondary/30 p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.type === "telehealth" ? "Telehealth Call" : item.exerciseName}
                      {item.type === "exercise"
                        ? ` · ${item.accuracy ? Number(item.accuracy).toFixed(1) : "0.0"}% accuracy`
                        : item.durationSec
                          ? ` · ${Math.round(Number(item.durationSec))}s`
                          : ""}
                    </p>
                  </div>
                  <Link
                    href={`/doctor/review/${item.id}`}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                  >
                    View Report
                  </Link>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
