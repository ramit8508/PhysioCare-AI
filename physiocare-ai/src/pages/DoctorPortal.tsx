"use client";

import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { StaggerContainer, StaggerItem } from "@/components/shared/StaggerChildren";
import { Search, ChevronRight, Activity, TrendingUp, Users, AlertCircle, Calendar, Clock, Target, Zap, Filter } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getActorHeaders } from "@/lib/actor-context";
import { motion } from "framer-motion";

export default function DoctorPortal() {
  const { status } = useSession();
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("all");

  const { data } = useQuery({
    queryKey: ["doctor-patients"],
    queryFn: async () => {
      const response = await fetch("/api/doctor/patients", { headers: getActorHeaders("DOCTOR") });
      if (!response.ok) {
        return { items: [] };
      }
      return response.json();
    },
    enabled: status !== "loading",
  });

  const { data: profileData } = useQuery({
    queryKey: ["doctor-profile"],
    queryFn: async () => {
      const response = await fetch("/api/doctor/profile", { headers: getActorHeaders("DOCTOR") });
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
    enabled: status !== "loading",
  });

  const profile = profileData?.item;

  const patients = (Array.isArray(data?.items) ? data.items : []).map((item: any, index: number) => ({
    id: item.id,
    name: item.displayName || item.email.split("@")[0],
    age: "-",
    condition: "Recovery program",
    progress: 50 + ((index * 11) % 45),
    lastSession: item.lastAppointmentAt ? new Date(item.lastAppointmentAt).toLocaleDateString() : "N/A",
    status: item.lastStatus === "CANCELED" ? "inactive" : "active",
    risk: item.lastStatus === "PENDING" ? "medium" : "low",
    avatar: item.displayName?.charAt(0).toUpperCase() || "P",
  }));

  const filtered = patients
    .filter((patient: any) => patient.name.toLowerCase().includes(search.toLowerCase()))
    .filter((patient: any) => {
      if (filterRisk === "all") return true;
      return patient.risk === filterRisk;
    });

  const stats = [
    { label: "Total Patients", value: patients.length, icon: Users, color: "from-blue-500 to-cyan-500" },
    { label: "Active Sessions", value: patients.filter((p: any) => p.status === "active").length, icon: Activity, color: "from-green-500 to-emerald-500" },
    { label: "Avg Recovery", value: Math.round(patients.reduce((sum: number, p: any) => sum + p.progress, 0) / (patients.length || 1)) + "%", icon: TrendingUp, color: "from-purple-500 to-pink-500" },
    { label: "At-Risk Patients", value: patients.filter((p: any) => p.risk === "high").length, icon: AlertCircle, color: "from-orange-500 to-red-500" },
  ];

  if (status === "loading") {
    return (
      <DashboardLayout role="doctor">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card h-24 animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="doctor">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <StaggerContainer className="space-y-8">
          {/* Header */}
          <StaggerItem>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
              <div>
                <h1 className="text-4xl font-bold text-foreground" style={{ letterSpacing: "-0.04em" }}>Patient Queue</h1>
                <p className="text-muted-foreground mt-2">Monitor recovery progress and manage your patient roster</p>
              </div>
            </div>
          </StaggerItem>

          {/* Stats Grid */}
          <StaggerItem>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {stats.map((stat, i) => {
                const IconComponent = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <div className="stat-card">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                          <p className="text-3xl font-bold font-mono text-foreground">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-xl bg-linear-to-br ${stat.color} bg-opacity-10`}>
                          <IconComponent size={18} className="text-white/70" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </StaggerItem>

          {/* Controls */}
          <StaggerItem>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search patients by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-modern pl-11 w-full"
                />
              </div>
              <button
                onClick={() => setFilterRisk(filterRisk === "all" ? "high" : "all")}
                className="btn-secondary px-4"
              >
                <Filter size={16} />
                Risk: {filterRisk === "all" ? "All" : "High"}
              </button>
            </div>
          </StaggerItem>

          {profile ? (
            <StaggerItem>
              <div className="glass-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Your Profile</p>
                    <p className="text-base font-semibold text-foreground mt-1">{profile.fullName || profile.email}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {profile.specialization || "General Rehabilitation"} · {profile.degrees || "Degree not set"} · {profile.experienceYears ?? 0} yrs
                    </p>
                  </div>
                  <Link href="/doctor/settings" className="btn-secondary px-4 py-2">Update Details</Link>
                </div>
              </div>
            </StaggerItem>
          ) : null}

          {/* Patient List */}
          <StaggerItem>
            <div className="glass-card overflow-hidden">
              <div className="border-b border-white/6 px-6 py-5">
                <h2 className="text-lg font-bold text-foreground">Assigned Patients</h2>
              </div>
              
              <div className="divide-y divide-white/4">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users size={40} className="mx-auto text-muted-foreground mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground">No patients found matching your criteria</p>
                  </div>
                ) : (
                  filtered.map((p: any, idx: number) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Link
                        href={`/doctor/review/${p.id}`}
                        className="flex items-center justify-between px-6 py-5 hover:bg-white/2 transition-all group border-b border-white/2 last:border-b-0"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="h-12 w-12 rounded-xl bg-linear-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                            {p.avatar}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{p.condition}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 ml-4">
                          {/* Progress Bar */}
                          <div className="hidden md:block">
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-linear-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                                  style={{ width: `${p.progress}%` }}
                                />
                              </div>
                              <p className="text-sm font-mono font-medium text-foreground w-12 text-right">{p.progress}%</p>
                            </div>
                          </div>

                          {/* Risk Badge */}
                          <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0 ${
                            p.risk === "low"
                              ? "bg-green-500/15 text-green-400"
                              : p.risk === "medium"
                              ? "bg-yellow-500/15 text-yellow-400"
                              : "bg-red-500/15 text-red-400"
                          }`}>
                            {p.risk === "low" ? "✓ LOW" : p.risk === "medium" ? "⚠ MED" : "🔴 HIGH"}
                          </span>

                          {/* Last Session */}
                          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar size={14} />
                            {p.lastSession}
                          </div>

                          <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                        </div>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </StaggerItem>

          {/* Quick Actions */}
          {filtered.length > 0 && (
            <StaggerItem>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  {
                    title: "Review Reports",
                    description: "Analyze AI-generated session reports",
                    icon: Target,
                    color: "from-blue-500 to-cyan-500",
                    href: "/doctor/reports"
                  },
                  {
                    title: "Schedule Sessions",
                    description: "Manage patient appointments and slots",
                    icon: Calendar,
                    color: "from-purple-500 to-pink-500",
                    href: "/doctor/appointments"
                  },
                  {
                    title: "Send Prescriptions",
                    description: "Create and update exercise programs",
                    icon: Zap,
                    color: "from-orange-500 to-red-500",
                    href: "/patient/exercises"
                  }
                ].map((action, idx: number) => {
                  const IconComponent = action.icon;
                  return (
                    <motion.div
                      key={action.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 + idx * 0.1 }}
                    >
                      <Link href={action.href}>
                        <div className={`glass-card p-6 bg-linear-to-br ${action.color} bg-opacity-5 group cursor-pointer`}>
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-bold text-foreground mb-1">{action.title}</h3>
                              <p className="text-sm text-muted-foreground">{action.description}</p>
                            </div>
                            <div className={`p-3 rounded-xl bg-linear-to-br ${action.color} bg-opacity-20 group-hover:bg-opacity-30 transition-all shrink-0`}>
                              <IconComponent size={20} className="text-white/70" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                            Access <ChevronRight size={16} />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </StaggerItem>
          )}
        </StaggerContainer>
      </div>
    </DashboardLayout>
  );
}
