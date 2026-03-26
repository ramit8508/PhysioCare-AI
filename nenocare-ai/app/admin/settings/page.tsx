"use client";

import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";

export default function AdminSettingsPage() {
  return (
    <DashboardLayout role="admin">
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-level preferences and governance.</p>
        </div>

        <GlassCard className="p-6 space-y-3">
          <p className="text-sm font-semibold text-foreground">Access Policy</p>
          <p className="text-sm text-muted-foreground">Doctor account creation is restricted to admins only.</p>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
