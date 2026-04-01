"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { StaggerContainer, StaggerItem } from "@/components/shared/StaggerChildren";
import { Activity, TrendingUp, Clock, Target } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getActorHeaders } from "@/lib/actor-context";
import { parseAiReportSections } from "@/lib/report-format";

type PerformancePayload = {
  summary: {
    totalSessions: number;
    avgAccuracy: number;
    avgReps: number;
    bestAngle: number;
    totalMinutesEstimate: number;
  };
  chart: Array<{ day: string; score: number }>;
  combinedReport: string;
  prediction: {
    targetMobilityPercent: number;
    estimatedDaysToTarget: number;
    onTrack: boolean;
    confidence: "low" | "medium" | "high";
    reasoning: string;
  };
};

const defaultPayload: PerformancePayload = {
  summary: {
    totalSessions: 0,
    avgAccuracy: 0,
    avgReps: 0,
    bestAngle: 0,
    totalMinutesEstimate: 0,
  },
  chart: [],
  combinedReport: "No session data yet. Complete an exercise to generate your AI performance report.",
  prediction: {
    targetMobilityPercent: 90,
    estimatedDaysToTarget: 0,
    onTrack: false,
    confidence: "low",
    reasoning: "Not enough session data yet. Complete a few sessions to enable prediction.",
  },
};

export default function PerformancePage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<PerformancePayload>(defaultPayload);

  useEffect(() => {
    setMounted(true);

    const loadPerformance = async () => {
      try {
        const response = await fetch("/api/patient/performance", {
          headers: getActorHeaders("PATIENT"),
        });
        if (!response.ok) {
          setPayload(defaultPayload);
          return;
        }
        const data = (await response.json()) as PerformancePayload;
        setPayload(data);
      } catch {
        setPayload(defaultPayload);
      } finally {
        setLoading(false);
      }
    };

    loadPerformance();
  }, []);

  const chartData = payload.chart.length ? payload.chart : [{ day: "-", score: 0 }];
  const reportSections = parseAiReportSections(payload.combinedReport);

  return (
    <DashboardLayout role="patient">
      <div className="p-6 md:p-8 max-w-350 mx-auto">
        <StaggerContainer className="grid grid-cols-12 gap-5">
          <StaggerItem className="col-span-12 lg:col-span-4">
            <GlassCard className="p-6 h-full">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-xl bg-success/10 text-success">
                  <Activity size={22} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recovery Progress</p>
                  <p className="text-3xl font-mono font-bold text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {loading ? "--" : `${payload.summary.avgAccuracy.toFixed(1)}%`}
                  </p>
                </div>
              </div>
              <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(0, Math.min(100, payload.summary.avgAccuracy))}%` }}
                />
              </div>
              <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                <span>{payload.summary.totalSessions} sessions tracked</span>
                <span className="text-success font-medium flex items-center gap-1"><TrendingUp size={12} /> AI trend ready</span>
              </div>
            </GlassCard>
          </StaggerItem>

          {[
            { label: "Total Sessions", value: `${payload.summary.totalSessions}`, icon: Target, color: "text-primary" },
            { label: "Exercise Minutes", value: `${payload.summary.totalMinutesEstimate}m`, icon: Clock, color: "text-warning" },
            { label: "Best Angle", value: `${payload.summary.bestAngle.toFixed(1)}°`, icon: TrendingUp, color: "text-success" },
          ].map((stat) => (
            <StaggerItem key={stat.label} className="col-span-12 sm:col-span-6 lg:col-span-4">
              <GlassCard className="p-5 flex items-center gap-4" hover>
                <div className={`p-2.5 rounded-lg bg-secondary/50 ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold font-mono text-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>{stat.value}</p>
                </div>
              </GlassCard>
            </StaggerItem>
          ))}

          <StaggerItem className="col-span-12">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Mobility Trends</h3>
              <div className="h-80">
                {!mounted ? (
                  <div className="h-full w-full rounded-xl bg-secondary/30" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="skyGradPerformance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(199 89% 48%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(199 89% 48%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(215 16% 47%)", fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(215 16% 47%)", fontSize: 12 }} domain={[40, 100]} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(222 40% 8%)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "12px",
                          color: "#fff",
                        }}
                      />
                      <Area type="monotone" dataKey="score" stroke="hsl(199 89% 48%)" strokeWidth={2} fill="url(#skyGradPerformance)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>
          </StaggerItem>
          <StaggerItem className="col-span-12">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Predictive Recovery Timeline</h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">Calculating prediction...</p>
              ) : payload.prediction.estimatedDaysToTarget <= 0 ? (
                <p className="text-sm text-muted-foreground">{payload.prediction.reasoning}</p>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-white/8 bg-secondary/20 p-4">
                    <p className="text-sm text-foreground">
                      You are {payload.prediction.onTrack ? "on track" : "currently behind target"} to reach{" "}
                      <span className="font-semibold text-primary">{payload.prediction.targetMobilityPercent}% mobility</span> in about{" "}
                      <span className="font-semibold text-primary">{payload.prediction.estimatedDaysToTarget} day(s)</span>.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Confidence: <span className="text-foreground font-semibold uppercase">{payload.prediction.confidence}</span>
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{payload.prediction.reasoning}</p>
                </div>
              )}
            </GlassCard>
          </StaggerItem>

          <StaggerItem className="col-span-12">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Combined AI Rehab Report</h3>
              {loading ? (
                <p className="text-sm text-muted-foreground">Preparing your combined report...</p>
              ) : (
                <div className="space-y-3">
                  {reportSections.map((section, sectionIndex) => (
                    <div key={`${section.title}-${sectionIndex}`} className="rounded-xl border border-white/8 bg-secondary/20 p-4">
                      <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">{section.title}</p>
                      {section.bullets.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No details available.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {section.bullets.map((bullet, bulletIndex) => (
                            <li key={`${bullet}-${bulletIndex}`} className="text-sm text-muted-foreground leading-6">
                              • {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </DashboardLayout>
  );
}
