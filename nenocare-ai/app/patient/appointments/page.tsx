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
      return "bg-warning/10 text-warning";
    }
    if (status === "APPROVED") {
      return "bg-emerald-500/10 text-emerald-400";
    }
    if (status === "COMPLETED") {
      return "bg-success/10 text-success";
    }
    return "bg-secondary text-muted-foreground";
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
      <div className="p-6 md:p-8 max-w-350 mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
          <p className="text-sm text-muted-foreground">Request appointments and join confirmed telehealth calls.</p>
        </div>

        <GlassCard className="p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">Available Doctors</p>
          {doctors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No doctors available right now.</p>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {doctors.map((doctor: any) => (
                <div key={doctor.id} className="rounded-xl border border-white/6 bg-secondary/30 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{doctor.fullName || doctor.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">{doctor.specialization}</p>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p>Degree: <span className="text-foreground/90">{doctor.degrees || "Not specified"}</span></p>
                    <p>Experience: <span className="text-foreground/90">{doctor.experienceYears ? `${doctor.experienceYears} years` : "Not specified"}</span></p>
                    <p>{doctor.availableSlotsCount} open slots</p>
                    {doctor.slotsPreview?.[0] && (
                      <p>
                        Next slot: <span className="text-foreground/90">{new Date(doctor.slotsPreview[0].startAt).toLocaleString()}</span>
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => openBookingDialog(doctor)}
                    disabled={!doctor.availableSlotsCount}
                    className="w-full rounded-lg bg-primary text-primary-foreground text-xs font-semibold py-2 disabled:opacity-60"
                  >
                    Request Appointment
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">My Appointments</p>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments yet.</p>
          ) : (
            <div className="grid gap-3">
              {appointments.map((appointment: any) => (
                <div key={appointment.id} className="rounded-xl border border-white/6 bg-secondary/30 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{appointment.doctorName || appointment.doctorEmail}</p>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusPillClass(appointment.status)}`}>
                      {statusLabel(appointment.status)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
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
                      className="inline-flex px-3 py-1.5 rounded-lg bg-emerald-500 text-emerald-950 text-xs font-semibold animate-pulse"
                    >
                      Join Video Call
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-xl">
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
                disabled={(date) => {
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  return date < now;
                }}
                className="rounded-lg border border-white/6"
              />

              <div className="space-y-2 max-h-75 overflow-y-auto pr-1">
                {availableSlots.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No open slots for this date.</p>
                ) : (
                  availableSlots.map((slot: any) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition ${
                        selectedSlotId === slot.id
                          ? "border-primary/50 bg-primary/10 text-foreground"
                          : "border-white/6 bg-secondary/30 text-muted-foreground"
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

