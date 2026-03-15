"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { angleBetweenPoints } from "@/lib/poseMath";

type PoseLandmark = { x: number; y: number; visibility?: number };

type Props = {
  prescriptionId: string;
  targetAngle?: number;
  exerciseName: string;
  exerciseGif?: string;
  onUploadComplete?: (url: string) => void;
  onGenerateReport: (payload: {
    prescriptionId: string;
    videoUrl: string;
    videoPublicId?: string;
    accuracy: number;
    reps: number;
    maxAngle: number;
  }) => Promise<{ id: string; reportText: string } | void>;
};

export default function ExerciseSession({
  prescriptionId,
  targetAngle = 90,
  exerciseName,
  exerciseGif,
  onUploadComplete,
  onGenerateReport,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [maxAngle, setMaxAngle] = useState(0);
  const [goodFrames, setGoodFrames] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [stage, setStage] = useState<"up" | "down">("up");
  const [recording, setRecording] = useState(false);
  const [glow, setGlow] = useState(false);
  const [goalHit, setGoalHit] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [reportText, setReportText] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const goalReps = 10;

  const angleText = useMemo(() => `${targetAngle}° target`, [targetAngle]);

  useEffect(() => {
    let poseInstance: any;
    let cameraInstance: any;
    let active = true;

    const load = async () => {
      const [poseModule, cameraModule, drawingModule] = await Promise.all([
        import("@mediapipe/pose"),
        import("@mediapipe/camera_utils"),
        import("@mediapipe/drawing_utils"),
      ]);

      const { Pose } = poseModule;
      const POSE_CONNECTIONS = (poseModule as unknown as { POSE_CONNECTIONS: any })
        .POSE_CONNECTIONS;
      const { Camera } = cameraModule;
      const { drawConnectors, drawLandmarks } = drawingModule;

      if (!videoRef.current || !canvasRef.current || !active) {
        return;
      }

      poseInstance = new Pose({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
      });

      poseInstance.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      poseInstance.onResults((results: any) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas) {
          return;
        }

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        if (results.poseLandmarks) {
          drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
            color: "#00ff99",
            lineWidth: 2,
          });
          drawLandmarks(ctx, results.poseLandmarks, {
            color: "#ffffff",
            lineWidth: 1,
          });

          const [shoulder, elbow, wrist] = [
            results.poseLandmarks[11],
            results.poseLandmarks[13],
            results.poseLandmarks[15],
          ] as PoseLandmark[];

          const angle = angleBetweenPoints(shoulder, elbow, wrist);
          setTotalFrames((value) => value + 1);
          if (angle <= targetAngle) {
            setGoodFrames((value) => value + 1);
          }
          setMaxAngle((value) => Math.max(value, angle));

          if (angle < targetAngle && stage === "up") {
            setStage("down");
          }
          if (angle > targetAngle + 15 && stage === "down") {
            setStage("up");
            setRepCount((count) => count + 1);
            setGlow(true);
          }

          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(16, 16, 140, 50);
          ctx.fillStyle = "#fff";
          ctx.font = "16px sans-serif";
          ctx.fillText(`Reps: ${repCount}`, 24, 38);
          ctx.fillText(angleText, 24, 58);
        }

        ctx.restore();
      });

      cameraInstance = new Camera(videoRef.current, {
        onFrame: async () => {
          await poseInstance.send({ image: videoRef.current });
        },
        width: 960,
        height: 540,
      });

      cameraInstance.start();
      setReady(true);
    };

    load();

    return () => {
      active = false;
      if (cameraInstance) {
        cameraInstance.stop();
      }
      if (poseInstance) {
        poseInstance.close();
      }
    };
  }, [angleText, targetAngle, stage, repCount, maxAngle, goodFrames, totalFrames]);

  useEffect(() => {
    if (!glow) {
      return;
    }
    const timer = setTimeout(() => setGlow(false), 900);
    return () => clearTimeout(timer);
  }, [glow]);

  useEffect(() => {
    if (goalHit || repCount < goalReps) {
      return;
    }
    setGoalHit(true);
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#38bdf8", "#10b981", "#e2e8f0"],
    });
  }, [goalHit, repCount]);

  const startRecording = () => {
    if (!canvasRef.current || recording) {
      return;
    }

    const stream = canvasRef.current.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });

    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const formData = new FormData();
      formData.append("file", blob, "session.webm");

      const response = await fetch("/api/cloudinary/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const videoUrl = payload.url as string;
      const videoPublicId = payload.publicId as string | undefined;
      const accuracy = totalFrames > 0 ? (goodFrames / totalFrames) * 100 : 0;
      const report = await onGenerateReport({
        prescriptionId,
        videoUrl,
        videoPublicId,
        accuracy: Math.round(accuracy),
        reps: repCount,
        maxAngle: Math.round(maxAngle),
      });
      if (report && "reportText" in report) {
        setReportText(report.reportText);
      }
      setShowSummary(true);
      onUploadComplete?.(videoUrl);
    };

    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  };

  const stopRecording = () => {
    if (recorderRef.current && recording) {
      recorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <section className="mt-6">
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Session Complete</DialogTitle>
            <DialogDescription>
              Your exercise report has been generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Performance</p>
              <p className="text-base font-semibold">
                {repCount} reps · {Math.round(maxAngle)}° max · {Math.round(totalFrames > 0 ? (goodFrames / totalFrames) * 100 : 0)}% accuracy
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Groq Summary</p>
              <p className="mt-2 whitespace-pre-wrap">
                {reportText || "Report is being finalized."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex-1">
          <h3 className="text-xl font-semibold">{exerciseName}</h3>
          {exerciseGif ? (
            <img
              src={exerciseGif}
              alt={exerciseName}
              className="mt-3 w-full max-w-sm rounded-xl border border-slate-200"
            />
          ) : null}
        </div>

        <Card className="glass w-full flex-1 p-4">
          <div className="relative">
            <video ref={videoRef} className="hidden" playsInline muted />
            <div
              className={`relative overflow-hidden rounded-xl border border-slate-200 ${
                glow ? "animate-pulseGlow" : ""
              }`}
            >
              {!ready ? (
                <div className="skeleton-loader">
                  <div className="skeleton-body">
                    <div className="skeleton-bone short" />
                    <div className="skeleton-bone" />
                    <div className="skeleton-bone medium" />
                    <div className="skeleton-bone" />
                    <p className="text-xs">Loading pose model...</p>
                  </div>
                </div>
              ) : null}
              <canvas
                ref={canvasRef}
                width={960}
                height={540}
                className="w-full max-w-full"
              />
            </div>

            <div className="glass absolute left-4 top-4 rounded-xl px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300">
                Live Stats
              </p>
              <motion.div
                key={repCount}
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ scale: 1.05, opacity: 1 }}
                transition={{ type: "spring", stiffness: 220, damping: 18 }}
                className="text-2xl font-semibold"
              >
                {repCount} reps
              </motion.div>
              <p className="text-xs text-slate-500">
                Goal: {goalReps} · Target {angleText}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="button" onClick={startRecording} disabled={!ready || recording}>
              Start Session
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={stopRecording}
              disabled={!recording}
            >
              End Session
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
