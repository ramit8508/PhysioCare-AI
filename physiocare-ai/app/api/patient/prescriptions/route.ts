import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { resolveActorFromRequest } from "@/lib/actor-context";

function cleanExtractedUrl(url: string) {
  return String(url || "").replace(/[),.;]+$/, "").trim() || null;
}

function extractDemoUrl(text: string) {
  const demoMatch = text.match(/demo\s*:\s*(https?:\/\/\S+)/i)?.[1] || "";
  const cleanedDemoUrl = cleanExtractedUrl(demoMatch);
  if (cleanedDemoUrl) {
    return cleanedDemoUrl;
  }

  const firstUrl = text.match(/https?:\/\/\S+/i)?.[0] || "";
  return cleanExtractedUrl(firstUrl);
}

function buildDemoSearchUrl(exerciseName: string) {
  const normalizedName = String(exerciseName || "").trim();
  if (!normalizedName) {
    return null;
  }
  const query = `${normalizedName} exercise demo`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export async function GET(request: Request) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "PATIENT");

  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prescriptions = await prisma.exercisePrescription.findMany({
    where: { patientId: actor.id },
    include: {
      doctor: { select: { email: true } },
      exercises: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const prescriptionIds = prescriptions.map((prescription) => prescription.id);
  const sessions = prescriptionIds.length
    ? await prisma.exerciseSessionRecord.findMany({
        where: {
          patientId: actor.id,
          prescriptionId: { in: prescriptionIds },
        },
        select: {
          prescriptionId: true,
          createdAt: true,
        },
      })
    : [];

  const sessionsByPrescription = new Map<string, Date[]>();
  for (const sessionRow of sessions) {
    const key = String(sessionRow.prescriptionId);
    const list = sessionsByPrescription.get(key) || [];
    list.push(sessionRow.createdAt);
    sessionsByPrescription.set(key, list);
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  const now = new Date();

  const items = prescriptions.map((prescription) => ({
    ...prescription,
    ...(() => {
      const timelineDays = Math.min(365, Math.max(1, Number((prescription as any).timelineDays || 7)));
      const activeUntil = (prescription as any).activeUntil
        ? new Date((prescription as any).activeUntil)
        : new Date(prescription.createdAt.getTime() + timelineDays * oneDayMs);
      const isActive = now.getTime() <= activeUntil.getTime();

      const elapsed = Math.floor((now.getTime() - prescription.createdAt.getTime()) / oneDayMs) + 1;
      const timelineDayNumber = Math.max(1, Math.min(timelineDays, elapsed));
      const daysRemaining = Math.max(0, Math.ceil((activeUntil.getTime() - now.getTime()) / oneDayMs));
      const timelineProgressPercent = Math.max(
        0,
        Math.min(100, Math.round((timelineDayNumber / Math.max(1, timelineDays)) * 100)),
      );

      const sessionDates = sessionsByPrescription.get(String(prescription.id)) || [];
      const timelineStart = prescription.createdAt.getTime();
      const timelineEnd = activeUntil.getTime();
      const timelineSessions = sessionDates.filter(
        (dateValue) => dateValue.getTime() >= timelineStart && dateValue.getTime() <= timelineEnd,
      );

      const uniqueDays = new Set(
        timelineSessions.map((dateValue) => {
          const copy = new Date(dateValue);
          copy.setHours(0, 0, 0, 0);
          return copy.getTime();
        }),
      );

      const totalExercises = Array.isArray(prescription.exercises) ? prescription.exercises.length : 0;
      const completedExercisesCount = Math.min(totalExercises, timelineSessions.length);
      const followUpEligible = totalExercises > 0 && completedExercisesCount >= totalExercises;

      return {
        timelineDays,
        activeUntil,
        isActive,
        daysRemaining,
        timelineDayNumber,
        timelineProgressPercent,
        timelineSessionCount: timelineSessions.length,
        timelineCompletedDays: uniqueDays.size,
        totalExercises,
        completedExercisesCount,
        followUpEligible,
        followUpDoctorId: prescription.doctorId,
      };
    })(),
    exercises: (prescription.exercises || []).map((exercise) => {
      const fromNotes = extractDemoUrl(String(exercise.notes || ""));
      const fallbackSearchUrl = buildDemoSearchUrl(String(exercise.name || ""));
      return {
        ...exercise,
        demoUrl: fromNotes || prescription.gifUrl || fallbackSearchUrl || null,
      };
    }),
  }));

  return NextResponse.json({ items });
}
