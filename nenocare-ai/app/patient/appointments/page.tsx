import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import AppointmentListClient from "./AppointmentListClient";
import { Calendar, Video, Clock, ChevronRight } from "lucide-react";

const formatDateTime = (value: Date) =>
  value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function PatientAppointmentsPage() {
  const session = await getSession();
  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  const prismaAny = prisma as any;
  const appointments = (await prismaAny.appointment.findMany({
    where: { patientId: session.userId },
    include: { doctor: true, slot: true },
    orderBy: { createdAt: "desc" },
  })) as Array<any>;

  // Separate upcoming and past appointments
  const now = new Date();
  const upcomingAppointments = appointments.filter(
    (apt) => new Date(apt.slot.startAt) > now
  );
  const pastAppointments = appointments.filter(
    (apt) => new Date(apt.slot.startAt) <= now
  );

  const items = appointments.map((appointment) => ({
    id: appointment.id,
    doctorEmail: appointment.doctor.email,
    startAt: formatDateTime(appointment.slot.startAt),
    endAt: formatDateTime(appointment.slot.endAt),
    status: appointment.status,
    roomId: appointment.roomId,
    meetingUrl: appointment.meetingUrl,
    startAtIso: new Date(appointment.slot.startAt).toISOString(),
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return { bg: "#dbeafe", color: "#0284c7" };
      case "PENDING":
        return { bg: "#fef3c7", color: "#d97706" };
      case "COMPLETED":
        return { bg: "#dcfce7", color: "#16a34a" };
      case "CANCELED":
        return { bg: "#fee2e2", color: "#dc2626" };
      default:
        return { bg: "#fef3c7", color: "#d97706" };
    }
  };

  return (
    <main className="patient-shell">
      <div className="patient-main">
        {/* Header */}
        <div className="patient-header">
          <h1 className="patient-header-title">Your Appointments</h1>
          <p className="patient-header-subtitle">
            View and manage all your scheduled telehealth sessions with our physiotherapists.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="patient-empty-state">
            <div className="patient-empty-icon">📅</div>
            <div className="patient-empty-title">No Appointments Yet</div>
            <p className="patient-empty-subtitle">
              You haven't booked any appointments. Start by browsing our available physiotherapists.
            </p>
            <Link href="/patient/doctors" className="patient-btn patient-btn-primary">
              <Calendar size={16} />
              Book an Appointment
            </Link>
          </div>
        ) : (
          <>
            {/* Upcoming Appointments */}
            {upcomingAppointments.length > 0 && (
              <div className="patient-section">
                <h2 className="patient-section-title">Upcoming Appointments</h2>
                <div style={{ display: "grid", gap: "16px" }}>
                  {upcomingAppointments.map((appointment: any) => {
                    const appointmentItem = items.find(
                      (item) => item.id === appointment.id
                    );
                    const statusColor = getStatusColor(appointment.status);
                    const doctorName = appointment.doctor.email?.split("@")[0] || "Doctor";

                    return (
                      <div
                        key={appointment.id}
                        className="patient-doctor-card"
                        style={{
                          borderLeft: "4px solid #6366f1",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: 600, color: "#6366f1" }}>
                              {doctorName}
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
                              Consultation Session
                            </div>
                          </div>
                          <div
                            className="patient-status-badge"
                            style={{
                              background: statusColor.bg,
                              color: statusColor.color,
                            }}
                          >
                            {appointment.status}
                          </div>
                        </div>

                        <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#64748b" }}>
                            <Calendar size={16} style={{ color: "#6366f1" }} />
                            <strong>{appointmentItem?.startAt}</strong>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#64748b" }}>
                            <Clock size={16} style={{ color: "#6366f1" }} />
                            <span>Session Duration: 45 minutes</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#64748b" }}>
                            <Video size={16} style={{ color: "#6366f1" }} />
                            <span>Telehealth via Video Call</span>
                          </div>
                        </div>

                        <AppointmentListClient
                          items={[appointmentItem!]}
                          userId={session.userId}
                          userName="Patient"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past Appointments */}
            {pastAppointments.length > 0 && (
              <div className="patient-section">
                <h2 className="patient-section-title">Completed Appointments</h2>
                <div style={{ display: "grid", gap: "16px" }}>
                  {pastAppointments.map((appointment: any) => {
                    const statusColor = getStatusColor(appointment.status);
                    const doctorName = appointment.doctor.email?.split("@")[0] || "Doctor";

                    return (
                      <div
                        key={appointment.id}
                        className="patient-doctor-card"
                        style={{
                          opacity: 0.7,
                          borderLeft: "4px solid #94a3b8",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>
                              {doctorName}
                            </div>
                            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
                              Consultation Session
                            </div>
                          </div>
                          <div
                            className="patient-status-badge"
                            style={{
                              background: statusColor.bg,
                              color: statusColor.color,
                            }}
                          >
                            {appointment.status}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "#94a3b8", marginTop: "12px" }}>
                          <Calendar size={16} />
                          <span>{formatDateTime(appointment.slot.startAt)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

