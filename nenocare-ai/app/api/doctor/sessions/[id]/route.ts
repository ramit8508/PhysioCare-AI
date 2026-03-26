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
      return NextResponse.json({
        item: {
          ...exerciseRecord,
          sessionType: "exercise",
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
