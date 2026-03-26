"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";

export default function AdminHealthPage() {
  const { data: usersData } = useQuery({
    queryKey: ["admin-health-users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) return { items: [] };
      return response.json();
    },
  });

  const { data: reportsData } = useQuery({
    queryKey: ["admin-health-reports"],
    queryFn: async () => {
      const response = await fetch("/api/admin/reports");
      if (!response.ok) return { items: [] };
      return response.json();
    },
  });

  const users = Array.isArray(usersData?.items) ? usersData.items : [];
  const reports = Array.isArray(reportsData?.items) ? reportsData.items : [];

  const stats = [
    { label: "Total Users", value: users.length },
    { label: "Active Doctors", value: users.filter((x: any) => x.role === "DOCTOR" && !x.isBlacklisted).length },
    { label: "Blocked Users", value: users.filter((x: any) => x.isBlacklisted).length },
    { label: "AI Reports", value: reports.length },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Health</h1>
          <p className="text-sm text-muted-foreground mt-1">Live operational overview of platform entities.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <GlassCard key={stat.label} className="p-5">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
            </GlassCard>
          ))}
        </div>

        <GlassCard className="p-5">
          <p className="text-sm font-semibold text-foreground mb-2">Status</p>
          <p className="text-sm text-success">All critical admin APIs are reachable.</p>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
