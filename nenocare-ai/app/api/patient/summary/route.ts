import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  const user = session?.user as any;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doctors = await prisma.user.findMany({
    where: { role: "DOCTOR", isBlacklisted: false },
    select: {
      id: true,
      email: true,
      doctorProfile: {
        select: {
          fullName: true,
          specialization: true,
          degrees: true,
          experienceYears: true,
          bio: true,
        },
      },
      slotsAsDoctor: {
        where: { status: "AVAILABLE", startAt: { gte: new Date() } },
        orderBy: { startAt: "asc" },
        take: 1,
        select: { id: true, startAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  let stats = {
    prescriptions: 0,
    sessions: 0,
    avgAccuracy: 0,
    pendingAppointments: 0,
    approvedAppointments: 0,
  };

  if (user.role === "PATIENT") {
    const [appointments, prescriptions, sessions] = await Promise.all([
      prisma.appointment.findMany({ where: { patientId: user.id } }),
      prisma.exercisePrescription.findMany({ where: { patientId: user.id }, include: { exercises: true } }),
      prisma.exerciseSessionRecord.findMany({ where: { patientId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

    const avgAccuracy = sessions.length
      ? Number((sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / sessions.length).toFixed(1))
      : 0;

    const pendingAppointments = appointments.filter((a) => a.status === "PENDING").length;
    const approvedAppointments = appointments.filter((a) => a.status === "APPROVED").length;

    stats = {
      prescriptions: prescriptions.length,
      sessions: sessions.length,
      avgAccuracy,
      pendingAppointments,
      approvedAppointments,
    };
  }

  return NextResponse.json({
    stats,
    availableDoctors: doctors.map((doctor) => ({
      id: doctor.id,
      email: doctor.email,
      fullName: doctor.doctorProfile?.fullName || doctor.email.split("@")[0],
      specialization: doctor.doctorProfile?.specialization || "General Rehabilitation",
      degrees: doctor.doctorProfile?.degrees || "Not specified",
      experienceYears: doctor.doctorProfile?.experienceYears ?? null,
      bio: doctor.doctorProfile?.bio || "",
      nextAvailableAt: doctor.slotsAsDoctor[0]?.startAt ?? null,
      hasAvailability: doctor.slotsAsDoctor.length > 0,
    })),
  });
}
