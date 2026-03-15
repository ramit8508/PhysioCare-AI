import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { bookSlot } from "./actions";
import { Calendar, Clock, Award } from "lucide-react";

const formatDateTime = (value: Date) =>
  value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function PatientDoctorsPage() {
  const session = await getSession();
  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  const doctors = await prisma.user.findMany({
    where: { role: "DOCTOR", isBlacklisted: false },
    include: { doctorProfile: true },
    orderBy: { createdAt: "desc" },
  });

  const prismaAny = prisma as any;
  const slots = (await prismaAny.doctorSlot.findMany({
    where: { status: "AVAILABLE", startAt: { gte: new Date() } },
    orderBy: { startAt: "asc" },
  })) as Array<any>;

  const slotsByDoctor = new Map<string, typeof slots>();
  slots.forEach((slot: any) => {
    const list = slotsByDoctor.get(slot.doctorId) || [];
    list.push(slot);
    slotsByDoctor.set(slot.doctorId, list);
  });

  return (
    <main className="patient-shell">
      <div className="patient-main">
        {/* Header */}
        <div className="patient-header">
          <h1 className="patient-header-title">Book a Doctor</h1>
          <p className="patient-header-subtitle">
            Choose a physiotherapist and reserve a consultation slot. Our experienced professionals are here to help your recovery journey.
          </p>
        </div>

        {/* Doctors Grid */}
        {doctors.length === 0 ? (
          <div className="patient-empty-state">
            <div className="patient-empty-icon">👨‍⚕️</div>
            <div className="patient-empty-title">No Doctors Available</div>
            <p className="patient-empty-subtitle">
              Please check back soon. We're adding more physiotherapists to our platform.
            </p>
            <Link href="/patient" className="patient-btn patient-btn-primary">
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div className="patient-grid">
            {doctors.map((doctor) => {
              const doctorSlots = slotsByDoctor.get(doctor.id) || [];
              const doctorName = doctor.email?.split("@")[0] || "Doctor";
              return (
                <div key={doctor.id} className="patient-doctor-card">
                  {/* Doctor Info */}
                  <div className="patient-doctor-info">
                    <div className="patient-doctor-name">{doctorName}</div>
                    <div className="patient-doctor-specialty">
                      {doctor.doctorProfile?.degrees || "Physiotherapist"}
                    </div>
                    <div className="patient-doctor-experience">
                      <Award size={14} style={{ display: "inline", marginRight: "6px" }} />
                      {doctor.doctorProfile?.experienceYears ?? 0} years of experience
                    </div>
                  </div>

                  {/* Bio */}
                  <div className="patient-doctor-bio">
                    {doctor.doctorProfile?.bio || "Expert in recovery-focused rehabilitation programs."}
                  </div>

                  {/* Action */}
                  <div style={{ marginBottom: "16px" }}>
                    <Link href={`/patient/doctors/${doctor.id}`} className="patient-btn patient-btn-secondary" style={{ width: "100%", textAlign: "center" }}>
                      View Full Profile
                    </Link>
                  </div>

                  {/* Available Slots */}
                  <div>
                    {doctorSlots.length === 0 ? (
                      <div style={{
                        padding: "12px",
                        background: "linear-gradient(135deg, rgba(251, 146, 60, 0.05), rgba(249, 115, 22, 0.05))",
                        border: "1px solid rgba(251, 146, 60, 0.2)",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: "#ea580c",
                        textAlign: "center",
                      }}>
                        ⏰ No open slots available
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Available Slots
                        </div>
                        <div className="patient-slots-grid">
                          {doctorSlots.map((slot: any) => (
                            <form
                              key={slot.id}
                              action={bookSlot}
                              className="patient-slot-item"
                            >
                              <div>
                                <div className="patient-slot-time">
                                  <Calendar size={14} style={{ display: "inline", marginRight: "6px" }} />
                                  {formatDateTime(slot.startAt)}
                                </div>
                              </div>
                              <input type="hidden" name="slotId" value={slot.id} />
                              <button type="submit" className="patient-btn patient-btn-primary" style={{ fontSize: "12px", padding: "8px 16px" }}>
                                Book Now
                              </button>
                            </form>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
