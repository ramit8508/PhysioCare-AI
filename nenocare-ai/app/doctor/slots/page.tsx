import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Clock, Calendar } from "lucide-react";
import SlotForm from "./SlotForm";
import { createSlot } from "./actions";

const formatDateTime = (value: Date) =>
  value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  });

const formatTime = (value: Date) =>
  value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

export default async function DoctorSlotsPage() {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR") {
    redirect("/doctor/login");
  }

  const prismaAny = prisma as any;
  const slots = (await prismaAny.doctorSlot.findMany({
    where: { doctorId: session.userId },
    orderBy: { startAt: "asc" },
  })) as Array<any>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });

  const availableSlots = slots.filter((s: any) => s.status === "AVAILABLE").length;
  const bookedSlots = slots.filter((s: any) => s.status === "BOOKED").length;

  return (
    <main className="doctor-shell">
      <div className="doctor-header">
        <div>
          <h1 className="doctor-title">Manage Timeslots</h1>
          <p className="doctor-subtitle">
            Add your available consultation slots for patients to book.
          </p>
        </div>
        <div className="doctor-stats">
          <div className="doctor-stat-card">
            <div className="doctor-stat-icon" style={{ background: "#c7d2fe" }}>
              <Clock style={{ width: "20px", height: "20px", color: "#4f46e5" }} />
            </div>
            <div>
              <p className="doctor-stat-label">Available Slots</p>
              <p className="doctor-stat-value">{availableSlots}</p>
            </div>
          </div>
          <div className="doctor-stat-card">
            <div className="doctor-stat-icon" style={{ background: "#fed7aa" }}>
              <Calendar style={{ width: "20px", height: "20px", color: "#b45309" }} />
            </div>
            <div>
              <p className="doctor-stat-label">Booked</p>
              <p className="doctor-stat-value">{bookedSlots}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="doctor-content">
        <section className="doctor-card">
          <div className="doctor-section-header">
            <h2 className="doctor-section-heading">
              <Clock style={{ width: "20px", height: "20px" }} />
              Create New Slot
            </h2>
          </div>
          <SlotForm action={createSlot} />
        </section>

        <section className="doctor-card">
          <div className="doctor-section-header">
            <h2 className="doctor-section-heading">
              <Calendar style={{ width: "20px", height: "20px" }} />
              Weekly Overview
            </h2>
          </div>
          {slots.length === 0 ? (
            <p className="doctor-empty">No slots created yet.</p>
          ) : (
            <div className="doctor-week-grid">
              {days.map((day) => {
                const dayLabel = formatDate(day);
                const daySlots = slots.filter((slot: any) => {
                  const slotDate = new Date(slot.startAt);
                  return (
                    slotDate.getFullYear() === day.getFullYear() &&
                    slotDate.getMonth() === day.getMonth() &&
                    slotDate.getDate() === day.getDate()
                  );
                });

                return (
                  <div key={day.toISOString()} className="doctor-day-card">
                    <h3 className="doctor-day-label">{dayLabel}</h3>
                    <div className="doctor-day-slots">
                      {daySlots.length === 0 ? (
                        <p className="doctor-day-empty">No slots</p>
                      ) : (
                        daySlots.map((slot: any) => (
                          <div key={slot.id} className="doctor-slot-item">
                            <p className="doctor-slot-time">
                              {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
                            </p>
                            <span className={`doctor-slot-badge ${slot.status.toLowerCase()}`}>
                              {slot.status === "AVAILABLE" ? "Available" : "Booked"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="doctor-card">
          <div className="doctor-section-header">
            <h2 className="doctor-section-heading">All Timeslots</h2>
          </div>
          {slots.length === 0 ? (
            <p className="doctor-empty">No slots yet.</p>
          ) : (
            <div className="doctor-slot-list">
              {slots.map((slot: any) => (
                <div key={slot.id} className="doctor-slot-row">
                  <div>
                    <p className="doctor-slot-row-time">
                      {formatDateTime(slot.startAt)} - {formatDateTime(slot.endAt)}
                    </p>
                  </div>
                  <span className={`doctor-slot-badge ${slot.status.toLowerCase()}`}>
                    {slot.status === "AVAILABLE" ? "Available" : "Booked"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
