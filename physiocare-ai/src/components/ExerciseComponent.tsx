"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BrainCircuit, Play, Square, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/shared/GlassCard";
import { getActorHeaders } from "@/lib/actor-context";
import { parseAiReportSections } from "@/lib/report-format";

const TARGET_REPS = 10;
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

function calculateAngle(a: any, b: any, c: any) {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

async function blobToBase64(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function ExerciseComponent() {
  const searchParams = useSearchParams();
  const queryPrescriptionId = searchParams?.get("prescriptionId") || "";
  const queryExerciseId = searchParams?.get("exerciseId") || "";

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRef = useRef<any>(null);
  const poseRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const stageRef = useRef<"down" | "up">("down");
  const goodFramesRef = useRef(0);
  const totalFramesRef = useRef(0);
  const maxAngleRef = useRef(0);
  const sessionStartedAtRef = useRef<number>(0);
  const frameCounterRef = useRef(0);
  const poseSamplesRef = useRef<Array<{ t: number; angle: number; stage: "up" | "down"; quality: "good" | "needs_correction" }>>([]);
  const processingFrameRef = useRef(false);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const lastMetricUiUpdateAtRef = useRef(0);

  const [sessionActive, setSessionActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [maxAngle, setMaxAngle] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [statusText, setStatusText] = useState("Ready to start");
  const [finalReport, setFinalReport] = useState<string>("");
  const [savedSessionId, setSavedSessionId] = useState<string>("");

  const { data: prescriptionsData } = useQuery({
    queryKey: ["patient-prescriptions-for-exercise"],
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

  const prescriptionItems = Array.isArray(prescriptionsData?.items) ? prescriptionsData.items : [];

  const selectedPrescription = useMemo(() => {
    if (queryPrescriptionId) {
      const matched = prescriptionItems.find((item: any) => item.id === queryPrescriptionId);
      if (matched) {
        return matched;
      }
    }
    return prescriptionItems[0] || null;
  }, [prescriptionItems, queryPrescriptionId]);

  const selectedExercise = useMemo(() => {
    const exercises = Array.isArray(selectedPrescription?.exercises) ? selectedPrescription.exercises : [];
    if (queryExerciseId) {
      const matched = exercises.find((item: any) => item.id === queryExerciseId);
      if (matched) {
        return matched;
      }
    }
    return exercises[0] || null;
  }, [selectedPrescription, queryExerciseId]);

  const selectedExerciseGif = useMemo(() => {
    const fromExercise = String((selectedExercise as any)?.demoUrl || "").trim();
    if (fromExercise) {
      return fromExercise;
    }

    const fromNotes = String(selectedExercise?.notes || "")
      .match(/https?:\/\/\S+/i)?.[0]
      ?.replace(/[),.;]+$/, "")
      ?.trim();
    if (fromNotes) {
      return fromNotes;
    }

    const fromPrescription = String((selectedPrescription as any)?.gifUrl || "").trim();
    return fromPrescription || null;
  }, [selectedExercise, selectedPrescription]);

  const finalReportSections = useMemo(() => parseAiReportSections(finalReport), [finalReport]);

  const addFeedback = (text: string) => {
    setFeedback((prev) => {
      if (prev[prev.length - 1] === text) {
        return prev;
      }
      return [...prev.slice(-5), text];
    });
  };

  const startSession = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    if (!selectedPrescription) {
      setStatusText("No prescription found. Ask your doctor for one.");
      return;
    }

    setStarting(true);
    setFinalReport("");
    setSavedSessionId("");
    setFeedback([]);
    setRepCount(0);
    setAccuracy(0);
    setMaxAngle(0);
    setStatusText("Camera Initializing...");

    goodFramesRef.current = 0;
    totalFramesRef.current = 0;
    maxAngleRef.current = 0;
    stageRef.current = "down";
    frameCounterRef.current = 0;
    poseSamplesRef.current = [];
    sessionStartedAtRef.current = Date.now();
    processingFrameRef.current = false;
    canvasSizeRef.current = { width: 0, height: 0 };
    lastMetricUiUpdateAtRef.current = 0;

    try {
      const [poseModule, drawingUtils, cameraUtils] = await Promise.all([
        import("@mediapipe/pose"),
        import("@mediapipe/drawing_utils"),
        import("@mediapipe/camera_utils"),
      ]);
      const { Pose, POSE_CONNECTIONS } = poseModule as any;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 960, max: 1280 },
          height: { ideal: 540, max: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
      streamRef.current = stream;

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      mediaChunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      const pose = new Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      pose.setOptions({
        modelComplexity: 0,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      pose.onResults((results: any) => {
        if (!canvasRef.current || !videoRef.current) {
          return;
        }

        const canvasCtx = canvasRef.current.getContext("2d");
        if (!canvasCtx) {
          return;
        }

        const width = videoRef.current.videoWidth || 960;
        const height = videoRef.current.videoHeight || 540;
        if (canvasSizeRef.current.width !== width || canvasSizeRef.current.height !== height) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
          canvasSizeRef.current = { width, height };
        }

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (results.poseLandmarks) {
          drawingUtils.drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS || [], {
            color: "#22d3ee",
            lineWidth: 3,
          });
          drawingUtils.drawLandmarks(canvasCtx, results.poseLandmarks, { color: "#38bdf8", lineWidth: 1 });

          const shoulder = results.poseLandmarks[12];
          const elbow = results.poseLandmarks[14];
          const wrist = results.poseLandmarks[16];

          if (shoulder && elbow && wrist) {
            const now = performance.now();
            const angle = calculateAngle(shoulder, elbow, wrist);
            maxAngleRef.current = Math.max(maxAngleRef.current, angle);

            totalFramesRef.current += 1;
            frameCounterRef.current += 1;
            const goodFrame = angle < 70 || angle > 150;
            if (goodFrame) {
              goodFramesRef.current += 1;
            }

            if (frameCounterRef.current % 4 === 0 && poseSamplesRef.current.length < 160) {
              poseSamplesRef.current.push({
                t: Date.now(),
                angle: Number(angle.toFixed(2)),
                stage: stageRef.current,
                quality: goodFrame ? "good" : "needs_correction",
              });
            }

            const computedAccuracy = totalFramesRef.current
              ? (goodFramesRef.current / totalFramesRef.current) * 100
              : 0;
            if (now - lastMetricUiUpdateAtRef.current > 120) {
              setMaxAngle(Math.round(maxAngleRef.current));
              setAccuracy(Number(computedAccuracy.toFixed(1)));
              lastMetricUiUpdateAtRef.current = now;
            }

            if (angle > 150) {
              stageRef.current = "down";
            }
            if (angle < 70 && stageRef.current === "down") {
              stageRef.current = "up";
              setRepCount((prev) => prev + 1);
              setStatusText("Live tracking in progress");
            }

            if (angle >= 70 && angle <= 120) {
              addFeedback("Bend elbow more to complete each rep.");
            }
            if (angle < 40) {
              addFeedback("Avoid over-compressing the elbow angle.");
            }
            if (angle > 165) {
              addFeedback("Controlled extension detected. Good posture.");
            }
          }
        } else {
          setStatusText("Move fully into camera frame for pose tracking.");
        }

        canvasCtx.restore();
      });

      const camera = new cameraUtils.Camera(videoRef.current, {
        onFrame: async () => {
          if (processingFrameRef.current) {
            return;
          }
          if (poseRef.current && videoRef.current) {
            processingFrameRef.current = true;
            try {
              await poseRef.current.send({ image: videoRef.current });
            } finally {
              processingFrameRef.current = false;
            }
          }
        },
        width: 960,
        height: 540,
      });

      poseRef.current = pose;
      cameraRef.current = camera;
      await camera.start();

      setSessionActive(true);
      setStatusText("Live tracking in progress");
    } catch (error) {
      setStatusText("Camera Initializing...");
      console.error(error);
    } finally {
      setStarting(false);
    }
  };

  const stopSession = async () => {
    setSessionActive(false);
    setSubmitting(true);
    setStatusText("Generating Report...");

    try {
      if (cameraRef.current?.stop) {
        cameraRef.current.stop();
      }

      if (poseRef.current?.close) {
        await poseRef.current.close();
      }

      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const recorder = mediaRecorderRef.current;
      let videoBase64 = "";

      if (recorder) {
        const blob: Blob | null = await new Promise((resolve) => {
          if (recorder.state === "inactive") {
            resolve(mediaChunksRef.current.length ? new Blob(mediaChunksRef.current, { type: "video/webm" }) : null);
            return;
          }

          recorder.onstop = () => {
            const output = mediaChunksRef.current.length
              ? new Blob(mediaChunksRef.current, { type: "video/webm" })
              : null;
            resolve(output);
          };
          recorder.stop();
        });

        if (blob) {
          videoBase64 = await blobToBase64(blob);
        }
      }

      if (!selectedPrescription?.id) {
        setStatusText("No prescription selected for saving this session.");
        setSubmitting(false);
        return;
      }

      const response = await fetch("/api/patient/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getActorHeaders("PATIENT"),
        },
        body: JSON.stringify({
          prescriptionId: selectedPrescription.id,
          repCount,
          accuracy,
          maxAngle,
          feedback,
          durationSec: Math.max(1, Math.round((Date.now() - sessionStartedAtRef.current) / 1000)),
          rawPoseSamples: poseSamplesRef.current,
          videoBase64,
        }),
      });

      if (!response.ok) {
        setStatusText("Failed to save session report.");
        setSubmitting(false);
        return;
      }

      const payload = await response.json();
      setFinalReport(payload?.item?.reportText || "Report generated.");
      setSavedSessionId(payload?.item?.id || "");
      setStatusText("Session completed and report generated.");
    } catch (error) {
      console.error(error);
      setStatusText("Failed to process session.");
    } finally {
      setSubmitting(false);
      cameraRef.current = null;
      poseRef.current = null;
      streamRef.current = null;
      mediaRecorderRef.current = null;
      mediaChunksRef.current = [];
      processingFrameRef.current = false;
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 min-h-18">
        <Link href="/patient/exercises" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} /> Back to Exercises
        </Link>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${sessionActive ? "bg-success animate-pulse" : "bg-muted"}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {sessionActive ? "LIVE SESSION" : "READY"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BrainCircuit className="text-primary" size={18} />
          <span className="font-medium text-foreground">{selectedExercise?.name || "Exercise Session"}</span>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden flex">
        <div className="flex-1 relative bg-slate-950 flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

          <div className="absolute top-8 left-8">
            <GlassCard className="px-6 py-4 border-primary/30 min-w-36">
              <p className="text-[11px] text-primary font-bold uppercase tracking-[0.15em]">Repetitions</p>
              <p className="text-5xl font-mono font-black text-foreground">
                {repCount}
                <span className="text-2xl text-muted-foreground">/{TARGET_REPS}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">Accuracy: {accuracy.toFixed(1)}%</p>
            </GlassCard>
          </div>

          <div className="absolute bottom-8 left-8 right-8">
            <GlassCard className="px-5 py-3 min-h-14 flex items-center">
              <p className="text-sm text-muted-foreground">{statusText}</p>
            </GlassCard>
          </div>
        </div>

        <div className="w-85 border-l border-white/6 bg-slate-950/60 backdrop-blur-xl overflow-y-auto hidden lg:block">
          <div className="p-6 space-y-4">
            <h3 className="font-bold text-foreground">Live Form Feedback</h3>

            {feedback.length === 0 ? (
              <p className="text-xs text-muted-foreground">Start a session to receive real-time corrections.</p>
            ) : (
              <div className="space-y-2">
                {feedback.map((text, index) => (
                  <div key={`${text}-${index}`} className="p-3 rounded-xl border border-white/6 bg-secondary/30">
                    <p className="text-xs text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
            )}

            <GlassCard className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Max Angle</p>
              <p className="text-3xl font-mono font-bold text-foreground">{maxAngle}°</p>
            </GlassCard>

            <GlassCard className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Reference Exercise Demo</p>
              {selectedExerciseGif ? (
                <img src={selectedExerciseGif} alt="Exercise demonstration" className="w-full h-44 rounded-lg object-cover border border-white/10" />
              ) : (
                <p className="text-xs text-muted-foreground">Demo video will appear after ExerciseDB match is resolved.</p>
              )}
            </GlassCard>

            {selectedExercise?.notes && (
              <GlassCard className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Clinical Notes</p>
                <p className="text-sm text-foreground whitespace-pre-line">{selectedExercise.notes}</p>
              </GlassCard>
            )}

            {submitting && (
              <GlassCard className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">AI Analysis</p>
                <p className="text-sm text-foreground">Generating Report...</p>
              </GlassCard>
            )}

            {finalReport && (
              <GlassCard className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Groq Final Report</p>
                <div className="space-y-3">
                  {finalReportSections.map((section, sectionIndex) => (
                    <div key={`${section.title}-${sectionIndex}`} className="rounded-xl border border-white/8 bg-secondary/20 p-3">
                      <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-2">{section.title}</p>
                      {section.bullets.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No details available.</p>
                      ) : (
                        <ul className="space-y-1">
                          {section.bullets.map((bullet, bulletIndex) => (
                            <li key={`${bullet}-${bulletIndex}`} className="text-xs text-muted-foreground leading-5">
                              • {bullet}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
                {savedSessionId && (
                  <Link href="/patient/exercises" className="inline-flex mt-3 text-xs font-semibold text-primary hover:underline">
                    Session saved successfully
                  </Link>
                )}
              </GlassCard>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/6 px-6 py-4 flex items-center gap-3 bg-slate-950/80 min-h-18">
        {!sessionActive ? (
          <button
            onClick={startSession}
            disabled={starting || !selectedPrescription}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Start Exercise
          </button>
        ) : (
          <button
            onClick={stopSession}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />} Stop & Generate Report
          </button>
        )}

        <span className="text-xs text-muted-foreground">
          Target exercise: {selectedExercise?.name || "No exercise selected"}
        </span>
      </div>
    </div>
  );
}
