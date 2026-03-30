"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getActorHeaders } from "@/lib/actor-context";
import { CalendarPlus2, CheckCircle2, Clock3, FileText, UserRound, XCircle } from "lucide-react";

export default function DoctorAppointmentsPage() {
  const { status } = useSession();

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [savingSlot, setSavingSlot] = useState(false);
  const [prescriptionForAppointment, setPrescriptionForAppointment] = useState<string | null>(null);
  const [prescribedExercises, setPrescribedExercises] = useState<Array<{ name: string; reps: number }>>([
    { name: "", reps: 10 },
  ]);

  const { data: appointmentsData, refetch: refetchAppointments } = useQuery({
    queryKey: ["doctor-appointments"],
    queryFn: async () => {
      const response = await fetch("/api/doctor/appointments", { headers: getActorHeaders("DOCTOR") });
      if (!response.ok) {
        return { items: [] };
      }
      return response.json();
    },
    enabled: status !== "loading",
  });

  const { data: slotsData, refetch: refetchSlots } = useQuery({
    queryKey: ["doctor-slots"],
    queryFn: async () => {
      const response = await fetch("/api/doctor/slots", { headers: getActorHeaders("DOCTOR") });
      if (!response.ok) {
        return { items: [] };
      }
      return response.json();
    },
    enabled: status !== "loading",
  });

  const appointments = Array.isArray(appointmentsData?.items) ? appointmentsData.items : [];
  const slots = Array.isArray(slotsData?.items) ? slotsData.items : [];
  const pendingCount = appointments.filter((appointment: any) => appointment.status === "PENDING").length;
  const approvedCount = appointments.filter((appointment: any) => appointment.status === "APPROVED").length;

  const { data: sessionsData } = useQuery({
    queryKey: ["doctor-sessions"],
    queryFn: async () => {
      const response = await fetch("/api/doctor/sessions", { headers: getActorHeaders("DOCTOR") });
      if (!response.ok) {
        return { items: [] };
      }
      return response.json();
    },
    enabled: status !== "loading",
  });

  const sessions = Array.isArray(sessionsData?.items) ? sessionsData.items : [];

  const appointmentStatusChip = (statusValue: string) => {
    if (statusValue === "PENDING") {
      return "bg-warning/10 text-warning border border-warning/30";
    }
    if (statusValue === "APPROVED") {
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
    }
    if (statusValue === "COMPLETED") {
      return "bg-success/10 text-success border border-success/30";
    }
    if (statusValue === "DECLINED") {
      return "bg-destructive/10 text-destructive border border-destructive/30";
    }
    return "bg-secondary text-muted-foreground border border-white/10";
  };

  if (status === "loading") {
    return (
      <DashboardLayout role="doctor">
        <div className="p-6 md:p-8 max-w-350 mx-auto">
          <GlassCard className="p-6">
            <p className="text-sm text-muted-foreground">Loading appointments...</p>
          </GlassCard>
        </div>
      </DashboardLayout>
    );
  }

  const createSlot = async () => {
    if (!startAt || !endAt) {
      return;
    }

    setSavingSlot(true);
    await fetch("/api/doctor/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getActorHeaders("DOCTOR") },
      body: JSON.stringify({
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
      }),
    });
    setSavingSlot(false);
    setStartAt("");
    setEndAt("");
    await refetchSlots();
  };

  const approve = async (appointmentId: string) => {
    await fetch("/api/doctor/appointments/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getActorHeaders("DOCTOR") },
      body: JSON.stringify({ appointmentId }),
    });
    await refetchAppointments();
  };

  const decline = async (appointmentId: string) => {
    await fetch("/api/doctor/appointments/decline", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getActorHeaders("DOCTOR") },
      body: JSON.stringify({ appointmentId }),
    });
    await Promise.all([refetchAppointments(), refetchSlots()]);
  };

  const submitPrescription = async (appointment: any) => {
    const cleanedExercises = prescribedExercises
      .map((exercise) => ({
        name: exercise.name.trim(),
        reps: Number(exercise.reps || 0),
      }))
      .filter((exercise) => exercise.name.length > 0 && exercise.reps > 0);

    if (cleanedExercises.length === 0) {
      return;
    }

    await fetch("/api/doctor/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getActorHeaders("DOCTOR") },
      body: JSON.stringify({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        exercises: cleanedExercises.map((exercise) => ({
          name: exercise.name,
          sets: 3,
          reps: exercise.reps,
        })),
      }),
    });

    setPrescriptionForAppointment(null);
    setPrescribedExercises([{ name: "", reps: 10 }]);
    await refetchAppointments();
  };

  const updateExercise = (index: number, field: "name" | "reps", value: string | number) => {
    setPrescribedExercises((prev) =>
      prev.map((exercise, i) =>
        i === index
          ? {
              ...exercise,
              [field]: field === "reps" ? Number(value || 0) : String(value),
            }
          : exercise,
      ),
    );
  };

  const addExerciseRow = () => {
    setPrescribedExercises((prev) => [...prev, { name: "", reps: 10 }]);
  };

  const removeExerciseRow = (index: number) => {
    setPrescribedExercises((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ name: "", reps: 10 }];
    });
  };

  return (
    <DashboardLayout role="doctor">
      <div className="p-6 md:p-8 max-w-350 mx-auto space-y-5">
        <div className="glass-card p-6 md:p-7 bg-linear-to-r from-cyan-500/10 via-blue-500/5 to-transparent border border-cyan-500/15">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-2">Doctor Workspace</p>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Appointments</h1>
              <p className="text-sm text-muted-foreground mt-1">Create slots, approve bookings, and send prescriptions.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-white/10 bg-secondary/30 px-3 py-2 text-muted-foreground">
                Pending: <span className="text-warning font-semibold">{pendingCount}</span>
              </div>
              <div className="rounded-xl border border-white/10 bg-secondary/30 px-3 py-2 text-muted-foreground">
                Confirmed: <span className="text-emerald-400 font-semibold">{approvedCount}</span>
              </div>
            </div>
          </div>
        </div>

        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarPlus2 size={16} className="text-cyan-400" />
            Create Time Slot
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              className="rounded-xl bg-secondary/50 border border-white/6 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="datetime-local"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
              className="rounded-xl bg-secondary/50 border border-white/6 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={createSlot}
            disabled={savingSlot}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {savingSlot ? "Saving..." : "Add Slot"}
          </button>
        </GlassCard>

        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">My Slots</p>
            <span className="text-xs text-muted-foreground">{slots.length} total</span>
          </div>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slots added yet.</p>
          ) : (
            <div className="space-y-2">
              {slots.map((slot: any) => (
                <div key={slot.id} className="rounded-xl border border-white/8 bg-linear-to-r from-slate-800/45 to-slate-900/45 p-3">
                  <p className="text-sm text-foreground inline-flex items-center gap-1">
                    <Clock3 size={13} className="text-cyan-400" />
                    {new Date(slot.startAt).toLocaleString()} → {new Date(slot.endAt).toLocaleString()}
                  </p>
                  <p className={`text-[11px] inline-flex mt-2 px-2 py-0.5 rounded-full ${appointmentStatusChip(slot.status)}`}>{slot.status}</p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Patient Appointments</p>
            <span className="text-xs text-muted-foreground">{appointments.length} bookings</span>
          </div>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment: any) => (
                <div key={appointment.id} className="rounded-2xl border border-white/8 bg-linear-to-b from-slate-800/40 to-slate-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                        <UserRound size={14} />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{appointment.patientEmail}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${appointmentStatusChip(appointment.status)}`}>
                      {appointment.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Clock3 size={12} />
                    {new Date(appointment.startAt).toLocaleString()} → {new Date(appointment.endAt).toLocaleString()}
                  </p>

                  {appointment.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(appointment.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                      >
                        <CheckCircle2 size={12} />
                        Approve
                      </button>
                      <button
                        onClick={() => decline(appointment.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-semibold"
                      >
                        <XCircle size={12} />
                        Decline
                      </button>
                    </div>
                  )}

                  {appointment.status === "APPROVED" && appointment.meetingUrl && (
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={`${appointment.meetingUrl}${String(appointment.meetingUrl).includes("?") ? "&" : "?"}actor=DOCTOR`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                      >
                        Join Video Call
                      </a>
                      <button
                        onClick={() => setPrescriptionForAppointment(appointment.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold"
                        disabled={Array.isArray(appointment.prescriptionExercises) && appointment.prescriptionExercises.length > 0}
                      >
                        <FileText size={12} />
                        {Array.isArray(appointment.prescriptionExercises) && appointment.prescriptionExercises.length > 0
                          ? "Prescription Added"
                          : "Prescribe Exercise"}
                      </button>
                    </div>
                  )}

                  {Array.isArray(appointment.prescriptionExercises) && appointment.prescriptionExercises.length > 0 && (
                    <div className="rounded-xl border border-white/6 p-3 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Prescribed Exercises</p>
                      {appointment.prescriptionExercises.map((exercise: any) => (
                        <div key={exercise.id} className="text-xs text-muted-foreground">
                          <span className="text-foreground font-semibold">{exercise.name}</span> · {exercise.sets} sets · {exercise.reps} reps
                        </div>
                      ))}
                    </div>
                  )}

                  {prescriptionForAppointment === appointment.id && (
                    <div className="space-y-2 rounded-xl border border-white/8 bg-secondary/20 p-3">
                      {prescribedExercises.map((exercise, index) => (
                        <div key={`exercise-row-${index}`} className="grid grid-cols-[1fr_140px_110px] gap-2">
                          <input
                            value={exercise.name}
                            onChange={(event) => updateExercise(index, "name", event.target.value)}
                            placeholder="Exercise name"
                            className="w-full rounded-lg bg-secondary/50 border border-white/6 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <input
                            type="number"
                            min={1}
                            value={exercise.reps}
                            onChange={(event) => updateExercise(index, "reps", Number(event.target.value || 0))}
                            placeholder="Reps"
                            className="w-full rounded-lg bg-secondary/50 border border-white/6 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <button
                            onClick={() => removeExerciseRow(index)}
                            className="rounded-lg bg-destructive/20 text-destructive text-xs font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                      ))}

                      <button
                        onClick={addExerciseRow}
                        className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-semibold"
                      >
                        + Add Exercise
                      </button>

                      <button
                        onClick={() => submitPrescription(appointment)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                      >
                        Save Prescription
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Recent AI Reports</p>
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed session reports yet.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session: any) => (
                <div key={session.id} className="rounded-xl border border-white/6 bg-secondary/30 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{session.patientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.exerciseName}
                      {session.type === "exercise"
                        ? ` · ${session.accuracy ? Number(session.accuracy).toFixed(1) : "0.0"}% accuracy`
                        : session.durationSec
                          ? ` · ${Math.round(Number(session.durationSec))}s`
                          : ""}
                    </p>
                  </div>
                  <Link
                    href={`/doctor/review/${session.id}`}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
