"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import MeetingRoom from "@/components/MeetingRoom";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { getActorContext } from "@/lib/actor-context";

async function blobToBase64(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function MeetPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = typeof params?.roomId === "string" ? params.roomId : Array.isArray(params?.roomId) ? params.roomId[0] : "";
  const { data } = useSession();
  const [zegoIdentity, setZegoIdentity] = useState<{ id: string; name: string } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recordMsg, setRecordMsg] = useState("");

  useEffect(() => {
    const actorParam = (searchParams?.get("actor") || "").toUpperCase();
    const actorRole = actorParam === "DOCTOR" ? "DOCTOR" : actorParam === "PATIENT" ? "PATIENT" : null;
    const actorFromStorage = actorRole ? getActorContext(actorRole) : null;

    const user = data?.user as any;
    const baseId = actorFromStorage?.id || user?.id;
    const baseName = actorFromStorage?.name || user?.name || user?.email || "Participant";

    if (!roomId || !baseId) {
      return;
    }

    const storageKey = "nerocare_tab_id";
    let tabId = sessionStorage.getItem(storageKey);
    if (!tabId) {
      tabId = Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(storageKey, tabId);
    }

    const rawZegoId = `${String(baseId)}_${tabId}`;
    const safeZegoId = rawZegoId.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 60) || `user_${tabId}`;

    setZegoIdentity({
      id: safeZegoId,
      name: String(baseName),
    });
  }, [data?.user, roomId, searchParams]);

  if (!roomId || !data?.user || !zegoIdentity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Unable to join the room.</p>
      </div>
    );
  }

  const startRecording = async () => {
    setRecordMsg("");
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      mediaStreamRef.current = displayStream;
      chunksRef.current = [];
      startedAtRef.current = Date.now();

      const recorder = new MediaRecorder(displayStream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordMsg("Recording started.");
    } catch {
      setRecordMsg("Could not start recording.");
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) {
      return;
    }

    setSaving(true);
    setRecordMsg("Saving recording...");

    const recorder = mediaRecorderRef.current;
    const blob: Blob | null = await new Promise((resolve) => {
      recorder.onstop = () => {
        const output = chunksRef.current.length
          ? new Blob(chunksRef.current, { type: "video/webm" })
          : null;
        resolve(output);
      };
      recorder.stop();
    });

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    setRecording(false);

    if (!blob) {
      setSaving(false);
      setRecordMsg("No recording data captured.");
      return;
    }

    try {
      const videoBase64 = await blobToBase64(blob);
      const durationSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));

      const response = await fetch("/api/meetings/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          videoBase64,
          durationSec,
        }),
      });

      if (!response.ok) {
        setRecordMsg("Failed to save recording.");
      } else {
        setRecordMsg("Recording saved and attached to doctor history.");
      }
    } catch {
      setRecordMsg("Failed to save recording.");
    } finally {
      setSaving(false);
      chunksRef.current = [];
    }
  };

  return (
    <div className="w-screen h-screen bg-slate-950">
      <div className="absolute z-50 top-4 left-4 right-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!recording ? (
            <button
              onClick={startRecording}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60"
            >
              Start Call Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-semibold disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : "Stop & Save Recording"}
            </button>
          )}
        </div>
        {recordMsg && (
          <p className="text-xs text-white/90 bg-black/40 px-3 py-1.5 rounded-lg">{recordMsg}</p>
        )}
      </div>
      <ErrorBoundary
        fallback={
          <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
            Camera Initializing...
          </div>
        }
      >
        <MeetingRoom
          roomId={roomId}
          userId={zegoIdentity.id}
          userName={zegoIdentity.name}
          fullScreen
        />
      </ErrorBoundary>
    </div>
  );
}
