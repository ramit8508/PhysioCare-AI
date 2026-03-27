import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActorFromRequest } from "@/lib/actor-context";

export async function GET(request: Request) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "DOCTOR");

  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prismaAny = prisma as any;

  const exerciseRecords = await prisma.exerciseSessionRecord.findMany({
    where: { doctorId: actor.id },
    include: {
      patient: {
        select: {
          email: true,
          patientProfile: { select: { displayName: true } },
        },
      },
      prescription: {
        select: {
          id: true,
          exercises: { select: { name: true }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const telehealthRecords = await prismaAny.telehealthCallRecord.findMany({
    where: { doctorId: actor.id },
    include: {
      patient: {
        select: {
          email: true,
          patientProfile: { select: { displayName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const exerciseItems = exerciseRecords.map((record) => ({
    id: `exercise-${record.id}`,
    type: "exercise",
    patientName: record.patient.patientProfile?.displayName || record.patient.email,
    createdAt: record.createdAt,
    accuracy: record.accuracy,
    repCount: record.repCount,
    exerciseName: record.prescription.exercises[0]?.name || "Exercise",
  }));

  const telehealthItems = telehealthRecords.map((record: any) => ({
    id: `call-${record.id}`,
    type: "telehealth",
    patientName: record.patient.patientProfile?.displayName || record.patient.email,
    createdAt: record.createdAt,
    accuracy: null,
    repCount: null,
    exerciseName: "Telehealth Call Recording",
    durationSec: record.durationSec ?? null,
  }));

  const items = [...exerciseItems, ...telehealthItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return NextResponse.json({ items });
}
