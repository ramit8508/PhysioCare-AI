import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppointmentListClient from "./AppointmentListClient";
import { Calendar } from "lucide-react";
import { approveAppointment, declineAppointment } from "./actions";

const formatDateTime = (value: Date) =>
  value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function DoctorAppointmentsPage() {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR") {
    redirect("/doctor/login");
  }

  const prismaAny = prisma as any;
  const appointments = (await prismaAny.appointment.findMany({
    where: { doctorId: session.userId },
    include: { patient: true, slot: true },
    orderBy: { createdAt: "desc" },
  })) as Array<any>;

  const items = appointments.map((appointment) => ({
    id: appointment.id,
    patientEmail: appointment.patient.email,
    startAt: formatDateTime(appointment.slot.startAt),
    endAt: formatDateTime(appointment.slot.endAt),
    status: appointment.status,
    roomId: appointment.roomId,
    meetingUrl: appointment.meetingUrl,
    startAtIso: new Date(appointment.slot.startAt).toISOString(),
  }));

  const upcomingCount = items.filter(
    (item) => item.status === "APPROVED"
  ).length;
  const pendingCount = items.filter(
    (item) => item.status === "PENDING"
  ).length;
  const completedCount = items.filter(
    (item) => item.status === "COMPLETED"
  ).length;

  return (
    <main className="doctor-shell">
      <div className="doctor-header">
        <div>
          <h1 className="doctor-title">Upcoming Appointments</h1>
          <p className="doctor-subtitle">
            Join sessions and review patient needs before the call.
          </p>
        </div>
        <div className="doctor-stats">
          <div className="doctor-stat-card">
            <div className="doctor-stat-icon" style={{ background: "#fef3c7" }}>
              <Calendar style={{ width: "20px", height: "20px", color: "#d97706" }} />
            </div>
            <div>
              <p className="doctor-stat-label">Upcoming Sessions</p>
              <p className="doctor-stat-value">{upcomingCount}</p>
            </div>
          </div>
          <div className="doctor-stat-card">
            <div className="doctor-stat-icon" style={{ background: "#d1fae5" }}>
              <span style={{ width: "20px", height: "20px", color: "#059669", fontSize: "14px" }}>
                ✓
              </span>
            </div>
            <div>
              <p className="doctor-stat-label">Completed</p>
              <p className="doctor-stat-value">{completedCount}</p>
            </div>
          </div>
          <div className="doctor-stat-card">
            <div className="doctor-stat-icon" style={{ background: "#ffedd5" }}>
              <span style={{ width: "20px", height: "20px", color: "#ea580c", fontSize: "14px" }}>
                ⏳
              </span>
            </div>
            <div>
              <p className="doctor-stat-label">Pending</p>
              <p className="doctor-stat-value">{pendingCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="doctor-content">
        {items.length === 0 ? (
          <div className="doctor-empty-state">
            <p className="doctor-empty-message">No appointments booked yet.</p>
          </div>
        ) : (
          <AppointmentListClient
            items={items}
            userId={session.userId}
            userName="Doctor"
            approveAction={approveAppointment}
            declineAction={declineAppointment}
          />
        )}
      </div>
    </main>
  );
}
