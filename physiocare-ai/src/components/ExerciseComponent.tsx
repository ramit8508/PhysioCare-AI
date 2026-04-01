"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BrainCircuit, Play, Square, Loader2, Mic, MicOff, Send, Volume2, Pause } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/shared/GlassCard";
import { getActorHeaders } from "@/lib/actor-context";
import { parseAiReportSections } from "@/lib/report-format";
import { useToast } from "@/hooks/use-toast";
import { useLocaleContext } from "@/lib/locale-context";

const TARGET_REPS = 10;
const PRESCRIPTIONS_CACHE_KEY = "physiocare_patient_prescriptions_cache";
const LOW_BANDWIDTH_MODE_KEY = "physiocare_low_bandwidth_mode";

type GhostFrame = {
  shoulderX: number;
  shoulderY: number;
  elbowX: number;
  elbowY: number;
  wristX: number;
  wristY: number;
};

type GhostSnapshot = {
  score: number;
  frames: GhostFrame[];
  createdAt: number;
};

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
  const cameraFrameCounterRef = useRef(0);
  const poseSamplesRef = useRef<Array<{ t: number; angle: number; stage: "up" | "down"; quality: "good" | "needs_correction" }>>([]);
  const ghostFramesRef = useRef<GhostFrame[]>([]);
  const bestGhostRef = useRef<GhostSnapshot | null>(null);
  const processingFrameRef = useRef(false);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const lastMetricUiUpdateAtRef = useRef(0);
  const recognitionRef = useRef<any>(null);
  const commandRecognitionRef = useRef<any>(null);
  const lastHapticAtRef = useRef(0);
  const sessionPausedRef = useRef(false);
  const commandEnabledRef = useRef(false);

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [maxAngle, setMaxAngle] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [statusText, setStatusText] = useState("Ready to start");
  const [finalReport, setFinalReport] = useState<string>("");
  const [savedSessionId, setSavedSessionId] = useState<string>("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceAdvice, setVoiceAdvice] = useState("");
  const [voiceUrgency, setVoiceUrgency] = useState<"low" | "medium" | "high" | "">("");
  const [doctorNotified, setDoctorNotified] = useState(false);
  const [lowVisionMode, setLowVisionMode] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [voiceControlEnabled, setVoiceControlEnabled] = useState(true);
  const [voiceControlListening, setVoiceControlListening] = useState(false);
  const [ghostMode, setGhostMode] = useState(true);
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false);
  const [bestGhostScore, setBestGhostScore] = useState<number | null>(null);
  const { toast } = useToast();
  const t = useTranslations("exercise");
  const { locale, setLocale } = useLocaleContext();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const speechCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(Boolean(speechCtor));

    return () => {
      try {
        recognitionRef.current?.stop?.();
        commandRecognitionRef.current?.stop?.();
      } catch {
        return;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(LOW_BANDWIDTH_MODE_KEY);
      if (stored === "1") {
        setLowBandwidthMode(true);
      }
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(LOW_BANDWIDTH_MODE_KEY, lowBandwidthMode ? "1" : "0");
    } catch {
      return;
    }
  }, [lowBandwidthMode]);

  useEffect(() => {
    commandEnabledRef.current = voiceControlEnabled;
  }, [voiceControlEnabled]);

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

  const prescriptionItems = useMemo(
    () => (Array.isArray(prescriptionsData?.items) ? prescriptionsData.items : []),
    [prescriptionsData],
  );

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

  const selectedPrescriptionIsActive = useMemo(() => {
    if (!selectedPrescription) {
      return false;
    }

    if (typeof selectedPrescription.isActive === "boolean") {
      return selectedPrescription.isActive;
    }

    const timelineDays = Math.min(365, Math.max(1, Number(selectedPrescription.timelineDays || 7)));
    const activeUntil = selectedPrescription.activeUntil
      ? new Date(selectedPrescription.activeUntil)
      : new Date(new Date(selectedPrescription.createdAt).getTime() + timelineDays * 24 * 60 * 60 * 1000);

    return Date.now() <= activeUntil.getTime();
  }, [selectedPrescription]);

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

  const selectedExerciseDemoType = useMemo(
    () => getDemoType(selectedExerciseGif || ""),
    [selectedExerciseGif],
  );

  const selectedExerciseYouTubeEmbedUrl = useMemo(
    () => getYoutubeEmbedUrl(selectedExerciseGif || ""),
    [selectedExerciseGif],
  );

  const finalReportSections = useMemo(() => parseAiReportSections(finalReport), [finalReport]);

  const ghostStorageKey = useMemo(() => {
    const prescriptionKey = selectedPrescription?.id || "none";
    const exerciseKey = selectedExercise?.id || "none";
    return `physiocare_ghost_${prescriptionKey}_${exerciseKey}`;
  }, [selectedPrescription?.id, selectedExercise?.id]);

  useEffect(() => {
    if (typeof window === "undefined" || !ghostStorageKey) {
      return;
    }
    try {
      const raw = window.localStorage.getItem(ghostStorageKey);
      if (!raw) {
        bestGhostRef.current = null;
        setBestGhostScore(null);
        return;
      }
      const parsed = JSON.parse(raw) as GhostSnapshot;
      if (!Array.isArray(parsed?.frames) || typeof parsed?.score !== "number") {
        bestGhostRef.current = null;
        setBestGhostScore(null);
        return;
      }
      bestGhostRef.current = parsed;
      setBestGhostScore(parsed.score);
    } catch {
      bestGhostRef.current = null;
      setBestGhostScore(null);
    }
  }, [ghostStorageKey]);

  const addFeedback = (text: string) => {
    setFeedback((prev) => {
      if (prev[prev.length - 1] === text) {
        return prev;
      }
      return [...prev.slice(-5), text];
    });
  };

  const triggerHapticIncorrectForm = () => {
    if (!hapticEnabled || typeof window === "undefined") {
      return;
    }
    if (!("vibrate" in navigator)) {
      return;
    }

    const now = Date.now();
    if (now - lastHapticAtRef.current < 1200) {
      return;
    }

    lastHapticAtRef.current = now;
    navigator.vibrate(90);
  };

  const stopCommandListening = () => {
    commandEnabledRef.current = false;
    setVoiceControlListening(false);
    try {
      commandRecognitionRef.current?.stop?.();
    } catch {
      return;
    }
  };

  const resumeSession = () => {
    if (!sessionActive || !sessionPaused) {
      return;
    }
    sessionPausedRef.current = false;
    setSessionPaused(false);
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
    }
    setStatusText("Live tracking resumed");
  };

  const pauseSession = () => {
    if (!sessionActive || sessionPaused) {
      return;
    }
    sessionPausedRef.current = true;
    setSessionPaused(true);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
    }
    setStatusText("Exercise paused. Resume when ready.");
  };

  const runVoiceCommand = async (text: string) => {
    const normalized = String(text || "").trim().toLowerCase();
    if (!normalized) {
      return;
    }

    if (normalized.includes("pause")) {
      pauseSession();
      return;
    }

    if (normalized.includes("resume") || normalized.includes("continue") || normalized.includes("start again")) {
      resumeSession();
      return;
    }

    if (normalized.includes("stop") || normalized.includes("end")) {
      await stopSession();
      return;
    }
  };

  const startCommandListening = () => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor || !sessionActive || !voiceControlEnabled) {
      return;
    }

    commandEnabledRef.current = true;

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setVoiceControlListening(true);
      recognition.onerror = () => setVoiceControlListening(false);
      recognition.onend = () => {
        setVoiceControlListening(false);
        if (commandEnabledRef.current && sessionActive && !submitting) {
          try {
            recognition.start();
          } catch {
            return;
          }
        }
      };
      recognition.onresult = (event: any) => {
        const result = event.results?.[event.results.length - 1]?.[0]?.transcript || "";
        void runVoiceCommand(String(result));
      };

      commandRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setVoiceControlListening(false);
    }
  };

  useEffect(() => {
    if (!sessionActive || !voiceControlEnabled || submitting) {
      stopCommandListening();
      return;
    }
    startCommandListening();
    return () => {
      stopCommandListening();
    };
  }, [sessionActive, voiceControlEnabled, submitting]);

  const saveGhostIfBest = (score: number) => {
    if (typeof window === "undefined") {
      return;
    }

    if (!ghostStorageKey || ghostFramesRef.current.length < 20) {
      return;
    }

    const existing = bestGhostRef.current;
    if (existing && existing.score >= score) {
      return;
    }

    const snapshot: GhostSnapshot = {
      score,
      frames: ghostFramesRef.current.slice(0, 260),
      createdAt: Date.now(),
    };

    bestGhostRef.current = snapshot;
    setBestGhostScore(score);
    try {
      window.localStorage.setItem(ghostStorageKey, JSON.stringify(snapshot));
    } catch {
      return;
    }
  };

  const startSession = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    if (!selectedPrescription) {
      setStatusText("No prescription found. Ask your doctor for one.");
      return;
    }

    if (!selectedPrescriptionIsActive) {
      setStatusText("Prescription timeline has ended. Ask your doctor to renew the exercise plan.");
      return;
    }

    setStarting(true);
    setFinalReport("");
    setSavedSessionId("");
    setFeedback([]);
    setRepCount(0);
    setAccuracy(0);
    setMaxAngle(0);
    setSessionPaused(false);
    sessionPausedRef.current = false;
    setStatusText("Camera Initializing...");

    goodFramesRef.current = 0;
    totalFramesRef.current = 0;
    maxAngleRef.current = 0;
    stageRef.current = "down";
    frameCounterRef.current = 0;
    cameraFrameCounterRef.current = 0;
    poseSamplesRef.current = [];
    ghostFramesRef.current = [];
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
          width: lowBandwidthMode ? { ideal: 640, max: 854 } : { ideal: 960, max: 1280 },
          height: lowBandwidthMode ? { ideal: 360, max: 480 } : { ideal: 540, max: 720 },
          frameRate: lowBandwidthMode ? { ideal: 15, max: 20 } : { ideal: 30, max: 30 },
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

        const ghost = bestGhostRef.current;
        if (ghostMode && ghost?.frames?.length) {
          const ghostFrames = ghost.frames;

          canvasCtx.save();
          canvasCtx.globalAlpha = 0.38;
          canvasCtx.strokeStyle = "#cbd5e1";
          canvasCtx.lineWidth = 2;
          canvasCtx.beginPath();
          ghostFrames.forEach((frame, index) => {
            const x = frame.elbowX * width;
            const y = frame.elbowY * height;
            if (index === 0) {
              canvasCtx.moveTo(x, y);
            } else {
              canvasCtx.lineTo(x, y);
            }
          });
          canvasCtx.stroke();

          const ghostIndex = frameCounterRef.current % ghostFrames.length;
          const ghostFrame = ghostFrames[ghostIndex];

          const sx = ghostFrame.shoulderX * width;
          const sy = ghostFrame.shoulderY * height;
          const ex = ghostFrame.elbowX * width;
          const ey = ghostFrame.elbowY * height;
          const wx = ghostFrame.wristX * width;
          const wy = ghostFrame.wristY * height;

          canvasCtx.strokeStyle = "#94a3b8";
          canvasCtx.lineWidth = 3;
          canvasCtx.beginPath();
          canvasCtx.moveTo(sx, sy);
          canvasCtx.lineTo(ex, ey);
          canvasCtx.lineTo(wx, wy);
          canvasCtx.stroke();

          canvasCtx.fillStyle = "#e2e8f0";
          [
            [sx, sy],
            [ex, ey],
            [wx, wy],
          ].forEach(([x, y]) => {
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 4, 0, Math.PI * 2);
            canvasCtx.fill();
          });
          canvasCtx.restore();
        }

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

            const poseSampleStride = lowBandwidthMode ? 6 : 4;
            if (frameCounterRef.current % poseSampleStride === 0 && poseSamplesRef.current.length < 160) {
              poseSamplesRef.current.push({
                t: Date.now(),
                angle: Number(angle.toFixed(2)),
                stage: stageRef.current,
                quality: goodFrame ? "good" : "needs_correction",
              });
            }

            const ghostSampleStride = lowBandwidthMode ? 5 : 3;
            if (frameCounterRef.current % ghostSampleStride === 0 && ghostFramesRef.current.length < 260) {
              ghostFramesRef.current.push({
                shoulderX: Number(shoulder.x || 0),
                shoulderY: Number(shoulder.y || 0),
                elbowX: Number(elbow.x || 0),
                elbowY: Number(elbow.y || 0),
                wristX: Number(wrist.x || 0),
                wristY: Number(wrist.y || 0),
              });
            }

            const computedAccuracy = totalFramesRef.current
              ? (goodFramesRef.current / totalFramesRef.current) * 100
              : 0;
            const metricRefreshMs = lowBandwidthMode ? 220 : 120;
            if (now - lastMetricUiUpdateAtRef.current > metricRefreshMs) {
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
              triggerHapticIncorrectForm();
            }
            if (angle < 40) {
              addFeedback("Avoid over-compressing the elbow angle.");
              triggerHapticIncorrectForm();
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
          if (sessionPausedRef.current) {
            return;
          }
          cameraFrameCounterRef.current += 1;
          const frameStride = lowBandwidthMode ? 2 : 1;
          if (cameraFrameCounterRef.current % frameStride !== 0) {
            return;
          }
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
        width: lowBandwidthMode ? 640 : 960,
        height: lowBandwidthMode ? 360 : 540,
      });

      poseRef.current = pose;
      cameraRef.current = camera;
      await camera.start();

      setSessionActive(true);
      setStatusText(lowBandwidthMode ? "Live tracking in progress (Low Bandwidth Mode)" : "Live tracking in progress");
    } catch (error) {
      setStatusText("Camera Initializing...");
      console.error(error);
    } finally {
      setStarting(false);
    }
  };

  const stopSession = async () => {
    if (!sessionActive || submitting) {
      return;
    }

    setSessionActive(false);
    setSessionPaused(false);
    sessionPausedRef.current = false;
    setSubmitting(true);
    setStatusText("Generating Report...");
    stopCommandListening();

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

      const sessionScore = Number((accuracy + repCount * 3 + maxAngle * 0.1).toFixed(2));
      saveGhostIfBest(sessionScore);
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

  const startListening = () => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      toast({
        title: "Voice not supported",
        description: "Your browser does not support speech recognition. You can type your message instead.",
        variant: "destructive",
      });
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setListening(true);
      recognition.onerror = () => {
        setListening(false);
      };
      recognition.onend = () => setListening(false);
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          transcript += String(event.results[i]?.[0]?.transcript || "");
        }
        setVoiceTranscript((prev) => {
          const next = transcript.trim();
          return next || prev;
        });
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setListening(false);
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      return;
    }
  };

  const speakAdvice = () => {
    if (typeof window === "undefined" || !voiceAdvice.trim()) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(voiceAdvice);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const askVoiceAssistant = async () => {
    const message = voiceTranscript.trim();
    if (!message) {
      toast({
        title: "Add your concern",
        description: "Speak or type what you are feeling before sending.",
      });
      return;
    }

    setVoiceLoading(true);
    setDoctorNotified(false);

    try {
      const response = await fetch("/api/patient/voice-assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getActorHeaders("PATIENT"),
        },
        body: JSON.stringify({
          message,
          prescriptionId: selectedPrescription?.id,
          exerciseName: selectedExercise?.name,
          repCount,
          accuracy,
          maxAngle,
          sessionActive,
        }),
      });

      if (!response.ok) {
        toast({
          title: "Assistant unavailable",
          description: "Could not process your voice concern right now.",
          variant: "destructive",
        });
        return;
      }

      const payload = await response.json();
      const adviceText = String(payload?.advice || "").trim();
      const urgency = payload?.urgency === "high" || payload?.urgency === "medium" || payload?.urgency === "low"
        ? payload.urgency
        : "";
      const flagged = Boolean(payload?.shouldFlagDoctor);
      const notified = Boolean(payload?.doctorNotified);

      setVoiceAdvice(adviceText || "No advice available.");
      setVoiceUrgency(urgency);
      setDoctorNotified(notified);

      if (flagged) {
        toast({
          title: notified ? "Doctor alerted" : "Potential concern detected",
          description: notified
            ? "Your concern has been flagged to your doctor for review."
            : "Concern detected. Link this session to a prescription to notify your doctor.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Assistant response ready",
          description: "Live modification guidance generated.",
        });
      }
    } catch {
      toast({
        title: "Assistant error",
        description: "Could not process your request.",
        variant: "destructive",
      });
    } finally {
      setVoiceLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 min-h-18">
        <Link href="/patient/exercises" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={18} /> {t("backToExercises")}
        </Link>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${sessionActive ? "bg-success animate-pulse" : "bg-muted"}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {sessionActive ? t("liveSession") : t("ready")}
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
              <p className="text-[11px] text-primary font-bold uppercase tracking-[0.15em]">{t("repetitions")}</p>
              <p className="text-5xl font-mono font-black text-foreground">
                {repCount}
                <span className="text-2xl text-muted-foreground">/{TARGET_REPS}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">{t("accuracy")}: {accuracy.toFixed(1)}%</p>
            </GlassCard>
          </div>

          <div className="absolute bottom-8 left-8 right-8">
            <GlassCard className="px-5 py-3 min-h-14 flex items-center">
              <p className="text-sm text-muted-foreground">{statusText}</p>
            </GlassCard>
          </div>
        </div>

        <div className={`w-85 border-l border-white/6 bg-slate-950/60 backdrop-blur-xl overflow-y-auto hidden lg:block ${lowVisionMode ? "text-[1.05rem]" : ""}`}>
          <div className="p-6 space-y-4">
            <h3 className="font-bold text-foreground">{t("liveFormFeedback")}</h3>

            <GlassCard className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("language")}</p>
                <div className="inline-flex rounded-lg overflow-hidden border border-white/10">
                  <button
                    onClick={() => setLocale("en")}
                    className={`px-3 py-1.5 text-xs font-semibold ${locale === "en" ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground"}`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setLocale("hi")}
                    className={`px-3 py-1.5 text-xs font-semibold ${locale === "hi" ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground"}`}
                  >
                    HI
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{t("lowVision")}</p>
                <button
                  onClick={() => setLowVisionMode((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${lowVisionMode ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground"}`}
                >
                  {lowVisionMode ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{t("haptic")}</p>
                <button
                  onClick={() => setHapticEnabled((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${hapticEnabled ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground"}`}
                >
                  {hapticEnabled ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{t("voiceControl")}</p>
                <button
                  onClick={() => setVoiceControlEnabled((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${voiceControlEnabled ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground"}`}
                >
                  {voiceControlEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {voiceControlListening ? t("voiceListeningActive") : t("voiceListeningIdle")} {t("voiceHint")}
              </p>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Ghost Mode (Best Overlay)</p>
                <button
                  onClick={() => setGhostMode((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${ghostMode ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground"}`}
                >
                  {ghostMode ? "ON" : "OFF"}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {bestGhostScore ? `Best ghost score: ${bestGhostScore.toFixed(1)}` : "Complete a session to generate your first ghost track."}
              </p>

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">Low Bandwidth Mode</p>
                <button
                  onClick={() => setLowBandwidthMode((prev) => !prev)}
                  disabled={sessionActive}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${lowBandwidthMode ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-muted-foreground"} disabled:opacity-60`}
                >
                  {lowBandwidthMode ? "ON" : "OFF"}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {lowBandwidthMode
                  ? "Optimized for slower internet and low-end phones (reduced camera quality and sampling)."
                  : "Uses standard camera quality and full pose sampling."}
              </p>
            </GlassCard>

            {feedback.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("startToReceiveCorrections")}</p>
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
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("maxAngle")}</p>
              <p className="text-3xl font-mono font-bold text-foreground">{maxAngle}°</p>
            </GlassCard>

            <GlassCard className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{t("referenceDemo")}</p>
              {selectedExerciseGif ? (
                selectedExerciseDemoType === "youtube" && selectedExerciseYouTubeEmbedUrl ? (
                  <iframe
                    src={selectedExerciseYouTubeEmbedUrl}
                    title="Exercise demonstration"
                    className="w-full h-44 rounded-lg border border-white/10"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                ) : selectedExerciseDemoType === "video" ? (
                  <video
                    src={selectedExerciseGif}
                    controls
                    className="w-full h-44 rounded-lg object-cover border border-white/10"
                  />
                ) : selectedExerciseDemoType === "image" ? (
                  <Image
                    src={selectedExerciseGif}
                    alt="Exercise demonstration"
                    width={640}
                    height={352}
                    className="w-full h-44 rounded-lg object-cover border border-white/10"
                  />
                ) : (
                  <a
                    href={selectedExerciseGif}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-semibold"
                  >
                    {t("openDemoReference")}
                  </a>
                )
              ) : (
                <p className="text-xs text-muted-foreground">{t("demoPending")}</p>
              )}
            </GlassCard>

            {selectedExercise?.notes && (
              <GlassCard className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("clinicalNotes")}</p>
                <p className="text-sm text-foreground whitespace-pre-line">{selectedExercise.notes}</p>
              </GlassCard>
            )}

            {submitting && (
              <GlassCard className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{t("aiAnalysis")}</p>
                <p className="text-sm text-foreground">{t("generatingReport")}</p>
              </GlassCard>
            )}

            {finalReport && (
              <GlassCard className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{t("groqFinalReport")}</p>
                <div className="space-y-3">
                  {finalReportSections.map((section, sectionIndex) => (
                    <div key={`${section.title}-${sectionIndex}`} className="rounded-xl border border-white/8 bg-secondary/20 p-3">
                      <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-2">{section.title}</p>
                      {section.bullets.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t("noDetails")}</p>
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
                    {t("sessionSaved")}
                  </Link>
                )}
              </GlassCard>
            )}

            <GlassCard className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Smart Assistant (Voice)</p>
                {voiceUrgency && (
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                      voiceUrgency === "high"
                        ? "bg-destructive/15 text-destructive"
                        : voiceUrgency === "medium"
                          ? "bg-amber-500/15 text-amber-500"
                          : "bg-success/15 text-success"
                    }`}
                  >
                    {voiceUrgency} urgency
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Say what you feel during a set (example: “I’m feeling lower back pain during this movement”).
              </p>

              <textarea
                value={voiceTranscript}
                onChange={(event) => setVoiceTranscript(event.target.value)}
                placeholder="Speak or type your symptom/concern..."
                className="w-full min-h-20 rounded-xl border border-white/10 bg-secondary/30 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />

              <div className="flex flex-wrap items-center gap-2">
                {!listening ? (
                  <button
                    onClick={startListening}
                    disabled={!voiceSupported || voiceLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60"
                  >
                    <Mic size={14} /> Start Voice
                  </button>
                ) : (
                  <button
                    onClick={stopListening}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold"
                  >
                    <MicOff size={14} /> Stop
                  </button>
                )}

                <button
                  onClick={askVoiceAssistant}
                  disabled={voiceLoading || !voiceTranscript.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold border border-white/10 disabled:opacity-60"
                >
                  {voiceLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Ask AI
                </button>

                <button
                  onClick={speakAdvice}
                  disabled={!voiceAdvice.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold border border-white/10 disabled:opacity-60"
                >
                  <Volume2 size={14} /> Speak
                </button>
              </div>

              {voiceAdvice && (
                <div className="rounded-xl border border-white/10 bg-secondary/20 p-3 space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-primary font-semibold">AI Guidance</p>
                  <p className="text-xs text-muted-foreground leading-5">{voiceAdvice}</p>
                  {doctorNotified && (
                    <p className="text-[11px] font-semibold text-destructive">Doctor has been notified for review.</p>
                  )}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      <div className="border-t border-white/6 px-6 py-4 flex items-center gap-3 bg-slate-950/80 min-h-18">
        {!sessionActive ? (
          <button
            onClick={startSession}
            disabled={starting || !selectedPrescription || !selectedPrescriptionIsActive}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} {selectedPrescriptionIsActive ? t("startExercise") : t("timelineEnded")}
          </button>
        ) : (
          <>
            {!sessionPaused ? (
              <button
                onClick={pauseSession}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-amber-950 text-sm font-semibold disabled:opacity-60"
              >
                <Pause size={16} /> {t("pauseExercise")}
              </button>
            ) : (
              <button
                onClick={resumeSession}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                <Play size={16} /> {t("resumeExercise")}
              </button>
            )}

            <button
              onClick={stopSession}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Square size={16} />} {t("stopAndGenerate")}
            </button>
          </>
        )}

        <span className="text-xs text-muted-foreground">
          {t("targetExercise")}: {selectedExercise?.name || t("noExerciseSelected")}
          {selectedPrescription?.timelineDays
            ? ` · Timeline ${selectedPrescription.timelineDayNumber || 1}/${selectedPrescription.timelineDays} day(s)`
            : ""}
        </span>
      </div>
    </div>
  );
}
