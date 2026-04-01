"use client";

import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/shared/GlassCard";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { BookOpen, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { getActorHeaders } from "@/lib/actor-context";

const PRESCRIPTIONS_CACHE_KEY = "physiocare_patient_prescriptions_cache";

function readPrescriptionCache() {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.sessionStorage.getItem(PRESCRIPTIONS_CACHE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as any[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePrescriptionCache(items: any[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(PRESCRIPTIONS_CACHE_KEY, JSON.stringify(items));
  } catch {
    return;
  }
}

function getYoutubeEmbedUrl(url: string) {
  const value = String(url || "").trim();
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v") || "";
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.replace(/^\//, "").trim();
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function getDemoType(url: string) {
  const normalized = String(url || "").trim().toLowerCase();
  if (!normalized) {
    return "none" as const;
  }

  if (getYoutubeEmbedUrl(normalized)) {
    return "youtube" as const;
  }

  if (/(\.mp4|\.webm|\.mov|\.m4v|\.ogg|\.ogv|\.m3u8)(\?.*)?$/.test(normalized)) {
    return "video" as const;
  }

  if (/(\.gif|\.png|\.jpe?g|\.webp|\.avif|\.svg)(\?.*)?$/.test(normalized)) {
    return "image" as const;
  }

  return "link" as const;
}

export default function PatientExercisesPage() {
  const { data } = useQuery({
    queryKey: ["patient-prescriptions"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/patient/prescriptions", { headers: getActorHeaders("PATIENT") });
        if (!response.ok) {
          return { items: readPrescriptionCache() };
        }
        const payload = await response.json();
        const items = Array.isArray(payload?.items) ? payload.items : [];
        writePrescriptionCache(items);
        return { items };
      } catch {
        return { items: readPrescriptionCache() };
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const prescriptions = Array.isArray(data?.items) ? data.items : [];

  return (
    <DashboardLayout role="patient">
      <div className="p-6 md:p-8 max-w-350 mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Prescribed Exercises</h1>
            <p className="text-sm text-muted-foreground">Review your recovery plan and start sessions.</p>
          </div>
        </div>

        {prescriptions.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <div className="text-4xl mb-3">🧘</div>
            <p className="text-lg font-semibold text-foreground">No exercises yet</p>
            <p className="text-sm text-muted-foreground mt-2">Once your doctor prescribes exercises, they will show here.</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {prescriptions.map((item: any) => (
              <GlassCard key={item.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <BookOpen size={18} />
                      <h3 className="text-lg font-semibold text-foreground">Recovery Plan</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">Prescribed by {item.doctor?.email?.split("@")[0] || "Doctor"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Timeline: {item.timelineDays || 7} day(s) · Day {item.timelineDayNumber || 1}/{item.timelineDays || 7}
                    </p>
                  </div>
                  {item.isActive ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success">
                      <CheckCircle2 size={12} /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">
                      Expired
                    </span>
                  )}
                </div>

                <div className="mt-3 rounded-xl border border-white/6 bg-secondary/20 p-3 space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {item.isActive
                      ? `Active until ${new Date(item.activeUntil).toLocaleDateString()} · ${item.daysRemaining} day(s) remaining`
                      : `Timeline ended on ${new Date(item.activeUntil).toLocaleDateString()}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Timeline sessions: {item.timelineSessionCount || 0} · Active days completed: {item.timelineCompletedDays || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Exercise completion: {item.completedExercisesCount || 0}/{item.totalExercises || 0}
                  </p>
                  <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Number(item.timelineProgressPercent || 0)}%` }}
                    />
                  </div>

                  {item.followUpEligible ? (
                    <a
                      href={`/patient/appointments?doctorId=${encodeURIComponent(String(item.followUpDoctorId || ""))}&followUpPrescriptionId=${encodeURIComponent(String(item.id || ""))}`}
                      className="inline-flex mt-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                    >
                      Request Follow-up Appointment (Same Doctor)
                    </a>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Complete all exercises in this plan to request a follow-up appointment with this doctor.
                    </p>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {(item.exercises || []).map((exercise: any) => (
                    <div key={exercise.id} className="rounded-xl bg-secondary/30 border border-white/6 p-3">
                      {(() => {
                        const demoUrl = String(exercise.demoUrl || "").trim() || null;
                        if (!demoUrl) {
                          return null;
                        }

                        const demoType = getDemoType(demoUrl);
                        const youtubeEmbedUrl = getYoutubeEmbedUrl(demoUrl);

                        if (demoType === "youtube" && youtubeEmbedUrl) {
                          return (
                            <iframe
                              src={youtubeEmbedUrl}
                              title={`${exercise.name || "Exercise"} demo`}
                              className="w-full h-40 rounded-lg border border-white/10 mb-3"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              referrerPolicy="strict-origin-when-cross-origin"
                              allowFullScreen
                            />
                          );
                        }

                        if (demoType === "video") {
                          return (
                            <video
                              src={demoUrl}
                              controls
                              className="w-full h-40 rounded-lg object-cover border border-white/10 mb-3"
                            />
                          );
                        }

                        if (demoType === "image") {
                          return (
                            <Image
                              src={demoUrl}
                              alt={`${exercise.name || "Exercise"} demo`}
                              width={640}
                              height={320}
                              className="w-full h-40 rounded-lg object-cover border border-white/10 mb-3"
                            />
                          );
                        }

                        return (
                          <a
                            href={demoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex mb-3 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-semibold"
                          >
                            Open Demo Reference
                          </a>
                        );
                      })()}

                      <p className="text-sm font-semibold text-foreground">{exercise.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {exercise.sets} sets · {exercise.reps} reps
                      </p>
                      {exercise.notes && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{exercise.notes}</p>}

                      {(() => {
                        const demoUrl = String(exercise.demoUrl || "").trim() || null;

                        if (!demoUrl) {
                          return (
                            <p className="text-xs text-muted-foreground mt-2">Demo video is being prepared by ExerciseDB.</p>
                          );
                        }

                        return (
                          <a
                            href={demoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex mt-2 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-semibold"
                          >
                            Demo Exercise Reference
                          </a>
                        );
                      })()}

                      <div className="mt-2">
                        {item.isActive ? (
                          <a
                            href={`/patient/exercise?prescriptionId=${item.id}&exerciseId=${exercise.id}`}
                            className="inline-flex px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                          >
                            Start Exercise
                          </a>
                        ) : (
                          <span className="inline-flex px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-semibold border border-white/8">
                            Timeline Ended
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

