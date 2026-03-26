"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { PageTransition } from "@/components/shared/PageTransition";
import { ArrowLeft, Download, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { parseAiReportSections } from "@/lib/report-format";

export default function SessionReview() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-session", id],
    queryFn: async () => {
      const response = await fetch(`/api/doctor/sessions/${id}`);
      if (!response.ok) {
        return null;
      }
      return response.json();
    },
    enabled: !!id,
  });

  const item = data?.item;
  const isTelehealth = item?.sessionType === "telehealth";
  const reportSections = useMemo(() => parseAiReportSections(String(item?.reportText || "")), [item?.reportText]);

  return (
    <DashboardLayout role="doctor">
      <PageTransition>
        <div className="p-6 md:p-8 max-w-400 mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/doctor/appointments" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">Session Review</h1>
                <p className="text-sm text-muted-foreground">AI-assisted patient performance report</p>
              </div>
            </div>
            <button className="flex items-center gap-2 glass-subtle px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-secondary/60 transition-all">
              <Download size={16} /> Export Report
            </button>
          </div>

          {isLoading ? (
            <GlassCard className="p-6">
              <p className="text-sm text-muted-foreground">Loading report...</p>
            </GlassCard>
          ) : !item ? (
            <GlassCard className="p-6">
              <p className="text-sm text-muted-foreground">Session report not found.</p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard className="overflow-hidden">
                <div className="aspect-video bg-slate-950">
                  <video src={item.videoUrl} controls className="w-full h-full object-cover" />
                </div>
                <div className="px-5 py-4 border-t border-white/6 space-y-1">
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="text-sm font-semibold text-foreground">{item.patient?.email || "Unknown patient"}</p>
                  {isTelehealth && (
                    <p className="text-xs text-muted-foreground">Room: {item.appointment?.roomId || item.roomId || "-"}</p>
                  )}
                </div>
              </GlassCard>

              <GlassCard className="p-6 overflow-y-auto max-h-150">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-foreground">Final AI Report</h3>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle2 size={12} /> Generated
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-white/6 bg-secondary/30 p-3 text-sm text-muted-foreground">
                    {isTelehealth ? (
                      <>
                        <p>Session Type: <span className="text-foreground font-semibold">Telehealth Call</span></p>
                        <p>Duration: <span className="text-foreground font-semibold">{Math.round(Number(item.durationSec || 0))}s</span></p>
                        <p>Status: <span className="text-foreground font-semibold">{item.appointment?.status || "RECORDED"}</span></p>
                      </>
                    ) : (
                      <>
                        <p>Repetitions: <span className="text-foreground font-semibold">{item.repCount ?? 0}</span></p>
                        <p>Accuracy: <span className="text-foreground font-semibold">{Number(item.accuracy || 0).toFixed(1)}%</span></p>
                        <p>Max Angle: <span className="text-foreground font-semibold">{Number(item.maxAngle || 0).toFixed(1)}°</span></p>
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                    {reportSections.length === 0 ? (
                      <div className="rounded-xl border border-white/6 bg-secondary/30 p-3">
                        <p className="text-sm text-foreground">No report text available.</p>
                      </div>
                    ) : (
                      reportSections.map((section, sectionIndex) => (
                        <div key={`${section.title}-${sectionIndex}`} className="rounded-xl border border-white/6 bg-secondary/30 p-3">
                          <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-2">{section.title}</p>
                          {section.bullets.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No details available.</p>
                          ) : (
                            <ul className="space-y-1">
                              {section.bullets.map((bullet, bulletIndex) => (
                                <li key={`${bullet}-${bulletIndex}`} className="text-sm text-foreground leading-6">
                                  • {bullet}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
