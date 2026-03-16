import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { bookSlot } from "./actions";
import DoctorCard from "./DoctorCard";
import { Search } from "lucide-react";

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
        <div className="patient-header">
          <h1 className="patient-header-title">Book a Doctor</h1>
          <p className="patient-header-subtitle">
            Choose a physiotherapist and reserve a consultation slot. Our experienced professionals are here to help your recovery journey.
          </p>
        </div>

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
          <>
            <div className="patient-stats">
              <div className="patient-stat-card">
                <div className="patient-stat-value">{doctors.length}</div>
                <div className="patient-stat-label">Available Doctors</div>
              </div>
              <div className="patient-stat-card">
                <div className="patient-stat-value">{slots.length}</div>
                <div className="patient-stat-label">Open Slots</div>
              </div>
              <div className="patient-stat-card">
                <div className="patient-stat-value">
                  {Math.round(
                    doctors.reduce(
                      (sum, doc) => sum + (doc.doctorProfile?.experienceYears ?? 0),
                      0
                    ) / doctors.length
                  )}
                </div>
                <div className="patient-stat-label">Avg. Experience (Years)</div>
              </div>
              <div className="patient-stat-card">
                <div className="patient-stat-value">4.8</div>
                <div className="patient-stat-label">Avg. Rating</div>
              </div>
            </div>

            <div className="patient-grid">
              {doctors.map((doctor) => {
                const doctorSlots = slotsByDoctor.get(doctor.id) || [];
                return (
                  <DoctorCard
                    key={doctor.id}
                    doctor={doctor}
                    slots={doctorSlots}
                    formatDateTime={formatDateTime}
                    bookSlot={bookSlot}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
