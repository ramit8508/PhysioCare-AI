"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { useAppointments } from "@/hooks/useAppointments";
import { useSession } from "next-auth/react";
import { CalendarClock, CircleCheck, Clock3, Stethoscope, UserRound } from "lucide-react";

export default function PatientAppointmentsPage() {
  const { status } = useSession();

  const [activeDoctor, setActiveDoctor] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const { appointments, doctors, slots, isBooking, bookingError, bookSlot } = useAppointments(activeDoctor?.id);

  const availableSlots = useMemo(() => {
    if (!selectedDate) {
      return slots;
    }

    return slots.filter((slot: any) => {
      const slotDate = new Date(slot.startAt);
      return (
        slotDate.getFullYear() === selectedDate.getFullYear() &&
        slotDate.getMonth() === selectedDate.getMonth() &&
        slotDate.getDate() === selectedDate.getDate()
      );
    });
  }, [selectedDate, slots]);

  const openBookingDialog = (doctor: any) => {
    setActiveDoctor(doctor);
    setSelectedDate(new Date());
    setSelectedSlotId("");
    setOpen(true);
  };

  const requestAppointment = async () => {
    if (!selectedSlotId) {
      return;
    }

    try {
      await bookSlot(selectedSlotId);
      setOpen(false);
      setSelectedSlotId("");
    } catch {
      return;
    }
  };

  const statusPillClass = (status: string) => {
    if (status === "PENDING") {
      return "bg-warning/10 text-warning border border-warning/30";
    }
    if (status === "APPROVED") {
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
    }
    if (status === "COMPLETED") {
      return "bg-success/10 text-success border border-success/30";
    }
    return "bg-secondary text-muted-foreground border border-white/10";
  };

  const statusLabel = (status: string) => (status === "APPROVED" ? "CONFIRMED" : status);

  if (status === "loading") {
    return (
      <DashboardLayout role="patient">
        <div className="p-6 md:p-8 max-w-350 mx-auto">
          <GlassCard className="p-5">
            <p className="text-sm text-muted-foreground">Loading appointments...</p>
          </GlassCard>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="patient">
      <div className="p-6 md:p-8 max-w-350 mx-auto space-y-5">
        <div className="glass-card p-6 md:p-7 bg-linear-to-r from-cyan-500/10 via-blue-500/5 to-transparent border border-cyan-500/15">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-2">Patient Portal</p>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Appointments</h1>
              <p className="text-sm text-muted-foreground mt-1">Request appointments and join confirmed telehealth calls.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
              <CalendarClock size={14} className="text-cyan-400" />
              Easy scheduling with live slots
            </div>
          </div>
        </div>

        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Available Doctors</p>
            <span className="text-xs text-muted-foreground">{doctors.length} listed</span>
          </div>
          {doctors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No doctors available right now.</p>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {doctors.map((doctor: any) => (
                <div key={doctor.id} className="rounded-2xl border border-white/8 bg-linear-to-b from-slate-800/40 to-slate-900/40 p-4 space-y-3 hover:border-white/15 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-linear-to-br from-cyan-500 to-blue-500 text-white flex items-center justify-center text-xs font-bold">
                      {String(doctor.fullName || doctor.email || "DR")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part: string) => part[0]?.toUpperCase() || "")
                        .join("") || "DR"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{doctor.fullName || doctor.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">{doctor.specialization}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p>Degree: <span className="text-foreground/90">{doctor.degrees || "Not specified"}</span></p>
                    <p>Experience: <span className="text-foreground/90">{doctor.experienceYears ? `${doctor.experienceYears} years` : "Not specified"}</span></p>
                    <p className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-primary/10 text-primary">
                      <Clock3 size={12} /> {doctor.availableSlotsCount} open slots
                    </p>
                    {doctor.slotsPreview?.[0] && (
                      <p>
                        Next slot: <span className="text-foreground/90">{new Date(doctor.slotsPreview[0].startAt).toLocaleString()}</span>
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => openBookingDialog(doctor)}
                    disabled={!doctor.availableSlotsCount}
                    className="w-full rounded-xl bg-primary text-primary-foreground text-xs font-semibold py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Request Appointment
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">My Appointments</p>
            <span className="text-xs text-muted-foreground">{appointments.length} total</span>
          </div>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments yet.</p>
          ) : (
            <div className="grid gap-3">
              {appointments.map((appointment: any) => (
                <div key={appointment.id} className="rounded-2xl border border-white/8 bg-linear-to-b from-slate-800/40 to-slate-900/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                        <Stethoscope size={14} />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{appointment.doctorName || appointment.doctorEmail}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusPillClass(appointment.status)}`}>
                      {statusLabel(appointment.status)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Clock3 size={12} />
                    {new Date(appointment.startAt).toLocaleString()} → {new Date(appointment.endAt).toLocaleString()}
                  </p>

                  {appointment.status === "PENDING" && (
                    <button
                      disabled
                      className="inline-flex px-3 py-1.5 rounded-lg bg-warning/10 text-warning text-xs font-semibold cursor-not-allowed"
                    >
                      Awaiting Doctor Confirmation
                    </button>
                  )}

                  {appointment.status === "APPROVED" && appointment.meetingUrl && (
                    <a
                      href={`${appointment.meetingUrl}${String(appointment.meetingUrl).includes("?") ? "&" : "?"}actor=PATIENT`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 text-emerald-950 text-xs font-semibold animate-pulse"
                    >
                      <CircleCheck size={12} />
                      Join Video Call
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-xl border-white/15 bg-slate-950/95">
            <DialogHeader>
              <DialogTitle>Request Appointment</DialogTitle>
              <DialogDescription>
                {activeDoctor ? `Choose a date and slot for ${activeDoctor.fullName || activeDoctor.email}.` : "Choose a date and slot."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid md:grid-cols-[300px,1fr] gap-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                classNames={{
                  head_row: "grid grid-cols-7 gap-1",
                  row: "grid grid-cols-7 gap-1 mt-2",
                  head_cell: "text-muted-foreground rounded-md w-full text-center font-medium text-[0.78rem]",
                  cell: "h-9 w-full text-center text-sm p-0 relative",
                  day: "h-9 w-9 p-0 mx-auto rounded-md font-normal",
                }}
                disabled={(date) => {
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  return date < now;
                }}
                className="rounded-lg border border-white/6"
              />

              <div className="space-y-2 max-h-75 overflow-y-auto pr-1">
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <UserRound size={12} />
                  {selectedDate ? selectedDate.toDateString() : "Select a date"}
                </p>
                {availableSlots.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No open slots for this date.</p>
                ) : (
                  availableSlots.map((slot: any) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition ${
                        selectedSlotId === slot.id
                          ? "border-primary/50 bg-primary/15 text-foreground"
                          : "border-white/6 bg-secondary/30 text-muted-foreground hover:border-white/15"
                      }`}
                    >
                      {new Date(slot.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" "}→{" "}
                      {new Date(slot.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </button>
                  ))
                )}
              </div>
            </div>

            {bookingError && (
              <p className="text-xs text-destructive">{bookingError}</p>
            )}

            <DialogFooter>
              <button
                onClick={requestAppointment}
                disabled={!selectedSlotId || isBooking}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-60"
              >
                {isBooking ? "Submitting..." : "Submit Request"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

