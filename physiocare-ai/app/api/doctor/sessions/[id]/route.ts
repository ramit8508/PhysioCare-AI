import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { resolveActorFromRequest } from "@/lib/actor-context";

export async function GET(
  request: Request,
  context: { params: { id: string } },
) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "DOCTOR");

  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prismaAny = prisma as any;

  const rawId = context.params.id;
  const isExercisePrefixed = rawId.startsWith("exercise-");
  const isCallPrefixed = rawId.startsWith("call-");
  const id = isExercisePrefixed
    ? rawId.replace("exercise-", "")
    : isCallPrefixed
      ? rawId.replace("call-", "")
      : rawId;

  if (!isCallPrefixed) {
    const exerciseRecord = await prisma.exerciseSessionRecord.findFirst({
      where: {
        id,
        doctorId: actor.id,
      },
      include: {
        patient: { select: { email: true } },
        prescription: {
          include: {
            exercises: true,
          },
        },
      },
    });

    if (exerciseRecord) {
      const romHistoryRows = await prisma.exerciseSessionRecord.findMany({
        where: {
          doctorId: actor.id,
          patientId: exerciseRecord.patientId,
          prescriptionId: exerciseRecord.prescriptionId,
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          createdAt: true,
          maxAngle: true,
          accuracy: true,
          repCount: true,
        },
        take: 30,
      });

      return NextResponse.json({
        item: {
          ...exerciseRecord,
          sessionType: "exercise",
          romHistory: romHistoryRows.map((row) => ({
            id: row.id,
            createdAt: row.createdAt,
            maxAngle: Number(row.maxAngle || 0),
            accuracy: Number(row.accuracy || 0),
            repCount: Number(row.repCount || 0),
          })),
          doctorVerification: {
            doctorId: actor.id,
            doctorEmail: String((session?.user as any)?.email || "doctor@physiocare.local"),
            generatedAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  const callRecord = await prismaAny.telehealthCallRecord.findFirst({
    where: {
      id,
      doctorId: actor.id,
    },
    include: {
      patient: { select: { email: true } },
      appointment: { select: { roomId: true, status: true } },
    },
  });

  if (!callRecord) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    item: {
      ...callRecord,
      sessionType: "telehealth",
    },
  });
}
