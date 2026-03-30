"use client";

import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { StaggerContainer, StaggerItem } from "@/components/shared/StaggerChildren";
import { Play, CalendarDays, TrendingUp, Stethoscope, Clock3, BadgeCheck, ArrowRight, Activity, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getActorHeaders } from "@/lib/actor-context";
import { motion } from "framer-motion";

export default function PatientDashboardContent() {
  const { status, data: session } = useSession();

  const { data } = useQuery({
    queryKey: ["patient-summary"],
    queryFn: async () => {
      const response = await fetch("/api/patient/summary", { headers: getActorHeaders("PATIENT") });
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
    enabled: status !== "loading",
    retry: false,
  });

  const availableDoctors = Array.isArray(data?.availableDoctors) ? data.availableDoctors : [];
  const isDemoPatient = Boolean(data?.isDemoPatient);
  const dashboard = data?.dashboard || {};

  const exercises: Array<{
    id?: string;
    name: string;
    reps: string;
    status: "completed" | "pending";
    intensity?: string;
  }> = Array.isArray(dashboard?.todayExercises) ? dashboard.todayExercises : [];
  const sessionsThisWeek = Number(dashboard?.sessionsThisWeek || 0);
  const sessionsWeeklyTarget = Number(dashboard?.sessionsWeeklyTarget || 7);
  const recoveryProgress = Number(dashboard?.recoveryProgress || 0);
  const formAccuracy = Number(dashboard?.formAccuracy || 0);
  const consecutiveDays = Number(dashboard?.consecutiveDays || 0);

  const nextSession = dashboard?.nextSession || {
    title: "No session scheduled",
    scheduledAt: null,
    exerciseCount: 0,
    approxMinutes: 0,
    demoTimeLabel: "",
  };

  const patientName = session?.user?.name || "Patient";
  const completedToday = exercises.filter((exercise) => exercise.status === "completed").length;
  const completionPercent = exercises.length ? Math.round((completedToday / exercises.length) * 100) : 0;

  const nextSessionLabel = (() => {
    if (isDemoPatient && nextSession?.demoTimeLabel) {
      return String(nextSession.demoTimeLabel);
    }

    if (!nextSession?.scheduledAt) {
      return "Not scheduled yet";
    }

    try {
      return new Date(nextSession.scheduledAt).toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "Not scheduled yet";
    }
  })();

  const getDoctorInitials = (doctor: any) => {
    const source = String(doctor?.fullName || doctor?.email || "Doctor").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  };

  return (
    <DashboardLayout role="patient">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <StaggerContainer className="space-y-8">
          {/* Welcome Hero */}
          <StaggerItem>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
                      className="glass-card p-8 md:p-10 bg-linear-to-br from-cyan-500/10 via-blue-500/5 to-transparent overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
              
              <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div>
                  <p className="text-sm uppercase tracking-widest text-cyan-400 font-semibold mb-2">Welcome Back</p>
                  <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3" style={{ letterSpacing: "-0.04em" }}>
                    {patientName.split(" ")[0]}.
                  </h1>
                  <p className="text-lg text-muted-foreground flex items-center gap-2">
                    <Activity size={18} className="text-cyan-400" />
                    <span>You&apos;ve completed <span className="text-cyan-400 font-bold">{completedToday}</span> out of <span className="font-medium">{exercises.length}</span> exercises today</span>
                  </p>
                </div>
                
                <Link
                  href="/patient/exercise"
                  className="group btn-primary shrink-0 px-8 py-4 text-base shadow-lg hover:shadow-xl"
                >
                  <Play fill="currentColor" size={20} className="group-hover:scale-110 transition-transform" />
                  <span>START SESSION</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </motion.div>
          </StaggerItem>

          {/* Stats Grid */}
          <StaggerItem>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { 
                  label: "Sessions This Week", 
                  value: `${sessionsThisWeek}/${sessionsWeeklyTarget}`, 
                  icon: Activity, 
                  color: "from-cyan-500 to-blue-500",
                  trend: sessionsThisWeek > 0 ? `${sessionsThisWeek} completed this week` : "No sessions yet"
                },
                { 
                  label: "Recovery Progress", 
                  value: `${recoveryProgress}%`, 
                  icon: TrendingUp, 
                  color: "from-green-500 to-emerald-500",
                  trend: recoveryProgress > 0 ? "Progress is improving" : "Start your first session"
                },
                { 
                  label: "Form Accuracy", 
                  value: `${formAccuracy}%`, 
                  icon: CheckCircle2, 
                  color: "from-purple-500 to-pink-500",
                  trend: formAccuracy > 0 ? "Based on completed sessions" : "No form data yet"
                },
                { 
                  label: "Consecutive Days", 
                  value: `${consecutiveDays}`, 
                  icon: Zap, 
                  color: "from-orange-500 to-red-500",
                  trend: consecutiveDays > 0 ? "Keep your streak alive" : "Build your streak"
                },
              ].map((stat, i) => {
                const IconComponent = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                  >
                    <div className="stat-card">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                          <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-xl bg-linear-to-br ${stat.color} bg-opacity-10`}>
                          <IconComponent size={20} className="text-white/80" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{stat.trend}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </StaggerItem>

          <div className="grid grid-cols-12 gap-6">
            {/* Care Team */}
            <StaggerItem className="col-span-12 lg:col-span-8">
              <div className="glass-card p-7">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Care Team</h2>
                    <p className="text-sm text-muted-foreground mt-1">Your assigned specialists</p>
                  </div>
                  <Link
                    href="/patient/appointments"
                    className="btn-secondary px-4 py-2"
                  >
                    <CalendarDays size={16} />
                    Book Appointment
                  </Link>
                </div>

                {availableDoctors.length === 0 ? (
                  <div className="rounded-2xl border border-white/6 bg-secondary/20 p-8 text-center">
                    <AlertCircle size={40} className="mx-auto text-muted-foreground mb-3 opacity-50" />
                    <p className="text-base font-semibold text-foreground">No doctors assigned yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Contact support to get assigned to a care team.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableDoctors.slice(0, 3).map((doctor: any, idx: number) => (
                      <motion.div
                        key={doctor.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.1 }}
                        className="group rounded-xl border border-white/8 bg-linear-to-r from-slate-800/50 to-slate-900/50 hover:from-slate-800/80 hover:to-slate-900/80 p-4 transition-all hover:border-white/12"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="h-12 w-12 rounded-xl bg-linear-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                              {getDoctorInitials(doctor)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground truncate">{doctor.fullName || doctor.email}</p>
                              <p className="text-xs text-muted-foreground truncate">{doctor.specialization || "Therapist"}</p>
                              {doctor.bio ? <p className="text-[11px] text-muted-foreground truncate mt-0.5">{doctor.bio}</p> : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                              doctor.hasAvailability ? "bg-green-500/15 text-green-400" : "bg-slate-600/30 text-slate-400"
                            }`}>
                              <BadgeCheck size={12} /> {doctor.hasAvailability ? "Available" : "Busy"}
                            </span>
                            <ArrowRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </StaggerItem>

            {/* Next Session Card */}
            <StaggerItem className="col-span-12 lg:col-span-4">
              <div className="glass-card p-7 bg-linear-to-br from-blue-500/10 to-cyan-500/5">
                <h3 className="text-lg font-bold text-foreground mb-4">Next Session</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Workout Type</p>
                    <p className="text-lg font-semibold text-foreground">{nextSession?.title || "No session scheduled"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Scheduled Time</p>
                    <div className="flex items-center gap-2 text-foreground">
                      <Clock3 size={16} className="text-cyan-400" />
                      <p className="font-semibold">{nextSessionLabel}</p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-white/5 border border-white/8 p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Exercises</p>
                    <p className="text-sm text-foreground">{Number(nextSession?.exerciseCount || 0)} exercises · ~{Number(nextSession?.approxMinutes || 0)} minutes</p>
                  </div>

                  <Link
                    href="/patient/exercise"
                    className="w-full btn-primary justify-center py-3 mt-4"
                  >
                    <Play fill="currentColor" size={16} />
                    Start Now
                  </Link>
                </div>
              </div>
            </StaggerItem>
          </div>

          {/* Prescribed Exercises */}
          <StaggerItem>
            <div className="glass-card p-7">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Today&apos;s Prescription</h2>
                  <p className="text-sm text-muted-foreground mt-1">{completedToday} of {exercises.length} completed</p>
                </div>
                <div className="w-16 h-16 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-cyan-400">{completionPercent}%</p>
                    <p className="text-[10px] text-muted-foreground">Complete</p>
                  </div>
                </div>
              </div>

              {exercises.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-secondary/20 p-6 text-center">
                  <p className="text-base font-semibold text-foreground">No exercises prescribed yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Once your doctor assigns exercises, they will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exercises.map((ex: any, idx: number) => (
                  <motion.div
                    key={ex.id || ex.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${
                      ex.status === "completed"
                        ? "border-green-500/20 bg-green-500/5 hover:bg-green-500/10"
                        : "border-white/8 bg-slate-800/30 hover:border-white/12 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {ex.status === "completed" && (
                        <CheckCircle2 size={20} className="text-green-400 shrink-0" />
                      )}
                      {ex.status === "pending" && (
                        <div className="w-5 h-5 rounded-full border-2 border-white/30 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{ex.name}</p>
                        <p className="text-xs text-muted-foreground">{ex.reps} • {ex.intensity || "Medium"} intensity</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full ${
                        ex.status === "completed"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {ex.status === "completed" ? "✓ DONE" : "PENDING"}
                      </span>
                      {ex.status === "pending" && (
                        <Link
                          href="/patient/exercise"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ArrowRight size={16} className="text-muted-foreground hover:text-foreground" />
                        </Link>
                      )}
                    </div>
                  </motion.div>
                  ))}
                </div>
              )}

              <Link
                href="/patient/exercises"
                className="w-full mt-6 flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 text-foreground hover:bg-white/5 px-4 py-3 rounded-xl font-semibold transition-all"
              >
                View Full Prescription
                <ArrowRight size={16} />
              </Link>
            </div>
          </StaggerItem>

          {/* Performance & Analytics CTA */}
          <StaggerItem>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "Performance Trends",
                  description: "Track your recovery progress with detailed charts and analytics",
                  icon: TrendingUp,
                  href: "/dashboard/performance",
                  color: "from-emerald-500 to-cyan-500"
                },
                {
                  title: "Exercise Library",
                  description: "Browse all prescribed exercises with video demonstrations",
                  icon: Activity,
                  href: "/patient/exercises",
                  color: "from-blue-500 to-purple-500"
                }
              ].map((cta, idx: number) => {
                const IconComponent = cta.icon;
                return (
                  <motion.div
                    key={cta.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 + idx * 0.1 }}
                  >
                    <Link href={cta.href}>
                      <div className={`glass-card p-6 bg-linear-to-br ${cta.color} bg-opacity-5 border border-white/8 hover:border-white/12 group cursor-pointer`}>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-foreground mb-1">{cta.title}</h3>
                            <p className="text-sm text-muted-foreground">{cta.description}</p>
                          </div>
                          <div className={`p-3 rounded-xl bg-linear-to-br ${cta.color} bg-opacity-20 group-hover:bg-opacity-30 transition-all`}>
                            <IconComponent size={20} className="text-white/70" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all">
                          Open <ArrowRight size={16} />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </DashboardLayout>
  );
}
