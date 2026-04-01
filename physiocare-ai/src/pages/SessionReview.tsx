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

type RomPoint = {
  id: string;
  createdAt: string;
  maxAngle: number;
  accuracy: number;
  repCount: number;
};

function buildRomChartDataUrl(points: RomPoint[]) {
  if (typeof window === "undefined") {
    return null;
  }

  const width = 520;
  const height = 220;
  const pad = { top: 20, right: 20, bottom: 36, left: 42 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const values = points.map((p) => Number(p.maxAngle || 0));
  const maxValue = Math.max(1, ...values);
  const minValue = Math.min(...values, 0);
  const valueRange = Math.max(1, maxValue - minValue);

  ctx.strokeStyle = "#dbe3ee";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, height - pad.bottom);
  ctx.lineTo(width - pad.right, height - pad.bottom);
  ctx.stroke();

  ctx.strokeStyle = "#e9eff7";
  for (let i = 1; i <= 4; i += 1) {
    const y = pad.top + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#607184";
  ctx.font = "11px sans-serif";
  for (let i = 0; i <= 4; i += 1) {
    const value = maxValue - (valueRange / 4) * i;
    const y = pad.top + (chartH / 4) * i + 4;
    ctx.fillText(`${Math.round(value)}°`, 6, y);
  }

  if (points.length > 0) {
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = pad.left + (chartW * (points.length === 1 ? 0.5 : index / (points.length - 1)));
      const y = pad.top + ((maxValue - point.maxAngle) / valueRange) * chartH;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    ctx.fillStyle = "#0284c7";
    points.forEach((point, index) => {
      const x = pad.left + (chartW * (points.length === 1 ? 0.5 : index / (points.length - 1)));
      const y = pad.top + ((maxValue - point.maxAngle) / valueRange) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      if (index === 0 || index === points.length - 1) {
        const dayLabel = new Date(point.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        ctx.fillStyle = "#607184";
        ctx.font = "10px sans-serif";
        ctx.fillText(dayLabel, x - 14, height - 12);
        ctx.fillStyle = "#0284c7";
      }
    });
  }

  ctx.fillStyle = "#34495e";
  ctx.font = "12px sans-serif";
  ctx.fillText("ROM Improvement (Max Angle)", pad.left, 14);

  return canvas.toDataURL("image/png");
}

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

  const exportInsurancePdf = async () => {
    if (!item) {
      return;
    }

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 44;
    let y = margin;

    const ensureSpace = (need = 30) => {
      if (y + need > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("PhysioCare AI - Insurance-Ready Clinical Summary", margin, y);
    y += 24;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 20;

    doc.setDrawColor(220, 228, 236);
    doc.line(margin, y, pageW - margin, y);
    y += 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Clinical Session Snapshot", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);

    const summaryLines = isTelehealth
      ? [
          `Patient: ${item.patient?.email || "Unknown"}`,
          `Session Type: Telehealth Call`,
          `Duration: ${Math.round(Number(item.durationSec || 0))} seconds`,
          `Status: ${item.appointment?.status || "RECORDED"}`,
        ]
      : [
          `Patient: ${item.patient?.email || "Unknown"}`,
          `Repetitions: ${Number(item.repCount || 0)}`,
          `Accuracy: ${Number(item.accuracy || 0).toFixed(1)}%`,
          `Maximum ROM Angle: ${Number(item.maxAngle || 0).toFixed(1)}°`,
        ];

    summaryLines.forEach((line) => {
      ensureSpace(14);
      doc.text(line, margin, y);
      y += 14;
    });

    if (!isTelehealth && Array.isArray(item.romHistory) && item.romHistory.length > 0) {
      ensureSpace(260);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Range of Motion (ROM) Improvement Chart", margin, y);
      y += 12;

      const chartDataUrl = buildRomChartDataUrl(item.romHistory as RomPoint[]);
      if (chartDataUrl) {
        doc.addImage(chartDataUrl, "PNG", margin, y, 500, 210);
        y += 220;
      }
    }

    ensureSpace(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Groq-Generated Clinical Analysis", margin, y);
    y += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const analysisText = String(item?.reportText || "No AI report text available.");
    const wrapped = doc.splitTextToSize(analysisText, pageW - margin * 2);
    wrapped.forEach((line: string) => {
      ensureSpace(13);
      doc.text(line, margin, y);
      y += 13;
    });

    ensureSpace(80);
    y += 10;
    doc.setDrawColor(18, 86, 138);
    doc.roundedRect(margin, y, 260, 58, 8, 8);
    doc.setTextColor(18, 86, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("DOCTOR VERIFICATION - DIGITAL STAMP", margin + 12, y + 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const doctorEmail = String(item?.doctorVerification?.doctorEmail || "doctor@physiocare.local");
    doc.text(`Verified by: ${doctorEmail}`, margin + 12, y + 36);
    doc.text(`Verification Time: ${new Date().toLocaleString()}`, margin + 12, y + 50);
    doc.setTextColor(0, 0, 0);

    const patientRef = String(item?.patient?.email || "patient").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    doc.save(`clinical-summary-${patientRef}.pdf`);
  };

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
            <button
              onClick={exportInsurancePdf}
              className="flex items-center gap-2 glass-subtle px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-secondary/60 transition-all"
            >
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

              <GlassCard className="p-6">
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

                  <div className="rounded-xl border border-white/6 bg-secondary/20 p-3">
                    <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-2">Complete Report (Raw)</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-6">
                      {String(item?.reportText || "No report text available.")}
                    </p>
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
