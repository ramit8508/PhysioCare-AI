"use client";

import { useEffect, useRef, useState } from "react";
import MeetingRoom from "@/components/MeetingRoom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AppointmentItem = {
  id: string;
  patientEmail: string;
  startAt: string;
  endAt: string;
  status: string;
  roomId?: string | null;
  meetingUrl?: string | null;
  startAtIso: string;
};

type Props = {
  items: AppointmentItem[];
  userId: string;
  userName: string;
  approveAction: (formData: FormData) => void | Promise<void>;
  declineAction: (formData: FormData) => void | Promise<void>;
};

export default function AppointmentListClient({ items, userId, userName, approveAction, declineAction }: Props) {
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        return;
      }
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.07;

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
      oscillator.onended = () => ctx.close();
    } catch {
      // Ignore audio errors (autoplay restrictions, etc.)
    }
  };

  useEffect(() => {
    items.forEach((appointment) => {
      const diff = new Date(appointment.startAtIso).getTime() - now.getTime();
      if (diff <= 0 && !notifiedRef.current.has(appointment.id)) {
        notifiedRef.current.add(appointment.id);
        playBeep();
      }
    });
  }, [items, now]);

  const getCountdown = (startAtIso: string) => {
    const diff = new Date(startAtIso).getTime() - now.getTime();
    if (diff <= 0) {
      return { label: "Live now", urgent: true };
    }
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const urgent = hours === 0 && minutes < 10;
    return { label: `${hours}h ${minutes}m ${seconds}s`, urgent };
  };

  return (
    <section className="mt-6 grid gap-4">
      <Dialog open={Boolean(activeRoom)} onOpenChange={() => setActiveRoom(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Telehealth Session</DialogTitle>
          </DialogHeader>
          {activeRoom ? (
            <MeetingRoom roomId={activeRoom} userId={userId} userName={userName} />
          ) : null}
        </DialogContent>
      </Dialog>

      {items.map((appointment) => (
        <Card key={appointment.id} className="glass">
          <CardHeader>
            <CardTitle>{appointment.patientEmail}</CardTitle>
            <p className="text-sm text-slate-500">
              {appointment.startAt} - {appointment.endAt}
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Status: {appointment.status}</p>
            {(() => {
              const countdown = getCountdown(appointment.startAtIso);
              return (
                <p className={countdown.urgent ? "text-xs text-rose-300" : "text-xs text-emerald-300"}>
                  {countdown.label}
                </p>
              );
            })()}
            {appointment.status === "PENDING" ? (
              <div className="flex items-center gap-2">
                <form action={approveAction}>
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <Button type="submit">Approve</Button>
                </form>
                <form action={declineAction}>
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <Button type="submit" variant="outline">
                    Decline
                  </Button>
                </form>
              </div>
            ) : appointment.status === "APPROVED" && appointment.meetingUrl ? (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <a
                  href={appointment.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "12px",
                    color: "#6366f1",
                    textDecoration: "underline",
                    whiteSpace: "nowrap",
                  }}
                >
                  🔗 Share Link
                </a>
                <Button type="button" onClick={() => setActiveRoom(appointment.roomId!)} style={{ fontSize: "12px" }}>
                  Join Call
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Not available</p>
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
