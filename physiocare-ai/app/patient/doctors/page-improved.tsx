import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import DoctorCard from "./DoctorCard";

const formatDateTime = (value: Date) =>
  value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

async function bookSlot(formData: FormData) {
  "use server";

  const session = await getSession();
  const sessionUser = session?.user as { id?: string; role?: string } | undefined;
  if (!sessionUser || sessionUser.role !== "PATIENT" || !sessionUser.id) {
    throw new Error("Unauthorized");
  }
  const patientId = sessionUser.id;

  const slotId = String(formData.get("slotId") || "");
  if (!slotId) {
    throw new Error("slotId is required");
  }

  await prisma.$transaction(async (tx) => {
    const slot = await tx.doctorSlot.findUnique({ where: { id: slotId } });

    if (!slot) {
      throw new Error("Slot not found");
    }

    if (slot.status !== "AVAILABLE") {
      throw new Error("Slot already booked");
    }

    if (slot.startAt < new Date()) {
      throw new Error("Cannot book past slot");
    }

    await tx.appointment.create({
      data: {
        doctorId: slot.doctorId,
        patientId,
        slotId: slot.id,
        status: "PENDING",
      },
    });

    await tx.doctorSlot.update({
      where: { id: slot.id },
      data: { status: "BOOKED" },
    });
  });

  revalidatePath("/patient/doctors");
  revalidatePath("/patient/appointments");
}

export default async function PatientDoctorsPage() {
  const session = await getSession();
  const sessionRole = (session?.user as { role?: string } | undefined)?.role;
  if (!session || sessionRole !== "PATIENT") {
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
              Please check back soon. We&apos;re adding more physiotherapists to our platform.
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
