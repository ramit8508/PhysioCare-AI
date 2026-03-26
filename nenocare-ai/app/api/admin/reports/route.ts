import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function ensureAdmin(session: any) {
  const user = session?.user as any;
  return !!user && user.role === "ADMIN";
}

export async function GET() {
  const session = await getSession();
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const records = await prisma.exerciseSessionRecord.findMany({
    include: {
      patient: {
        select: {
          email: true,
          patientProfile: { select: { displayName: true } },
        },
      },
      doctor: {
        select: {
          email: true,
          doctorProfile: { select: { degrees: true } },
        },
      },
      prescription: {
        include: {
          exercises: { select: { name: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    items: records.map((record) => ({
      id: record.id,
      createdAt: record.createdAt,
      videoUrl: record.videoUrl,
      reportText: record.reportText,
      repCount: record.repCount,
      accuracy: record.accuracy,
      maxAngle: record.maxAngle,
      patientEmail: record.patient.email,
      patientName: record.patient.patientProfile?.displayName || null,
      doctorEmail: record.doctor.email,
      doctorDegrees: record.doctor.doctorProfile?.degrees || null,
      exerciseName: record.prescription.exercises[0]?.name || "Exercise",
    })),
  });
}
