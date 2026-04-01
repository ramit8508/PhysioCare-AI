import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { resolveActorFromRequest } from "@/lib/actor-context";

async function fetchExerciseDbDemo(exerciseName: string) {
  const apiKey = process.env.EXERCISEDB_API;
  if (!apiKey || !exerciseName.trim()) {
    return { exerciseId: null as string | null, gifUrl: null as string | null };
  }

  try {
    const response = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(exerciseName.trim())}?limit=1&offset=0`,
      {
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "exercisedb.p.rapidapi.com",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return { exerciseId: null as string | null, gifUrl: null as string | null };
    }

    const data = (await response.json()) as Array<any>;
    const first = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return {
      exerciseId: first?.id ? String(first.id) : null,
      gifUrl: first?.gifUrl ? String(first.gifUrl) : null,
    };
  } catch {
    return { exerciseId: null as string | null, gifUrl: null as string | null };
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "DOCTOR");

  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    appointmentId?: string;
    patientId?: string;
    timelineDays?: number;
    exerciseId?: string;
    name?: string;
    gifUrl?: string;
    bodyPart?: string;
    target?: string;
    exercises?: Array<{
      name?: string;
      reps?: number;
      sets?: number;
      notes?: string;
    }>;
  };

  const appointmentId = body.appointmentId || "";
  const patientId = body.patientId || "";
  const exercises = Array.isArray(body.exercises) ? body.exercises : [];
  const timelineDays = Math.min(365, Math.max(1, Number(body.timelineDays || 7)));
  const activeUntil = new Date(Date.now() + timelineDays * 24 * 60 * 60 * 1000);

  if (!appointmentId || !patientId || exercises.length === 0) {
    return NextResponse.json({ error: "appointmentId, patientId and exercises are required" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId: actor.id, patientId },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const enrichedExercises = await Promise.all(
    exercises.map(async (exercise) => {
      const dbMatch = await fetchExerciseDbDemo(exercise.name || "");
      return {
        name: exercise.name || "Exercise",
        reps: Number(exercise.reps || 0),
        sets: Number(exercise.sets || 3),
        notes: (exercise.notes || "").trim() || null,
        demoUrl: dbMatch.gifUrl,
        exerciseId: dbMatch.exerciseId,
      };
    }),
  );

  const firstMatch = enrichedExercises.find((item) => item.exerciseId || item.demoUrl);

  const prescriptionData: any = {
    doctorId: actor.id,
    patientId,
    appointmentId,
    timelineDays,
    activeUntil,
    exerciseId: firstMatch?.exerciseId || body.exerciseId || null,
    name: body.name || null,
    gifUrl: firstMatch?.demoUrl || body.gifUrl || null,
    bodyPart: body.bodyPart || null,
    target: body.target || null,
    exercises: {
      create: enrichedExercises.map((exercise) => {
        const demoText = exercise.demoUrl ? `\nDemo: ${exercise.demoUrl}` : "";
        return {
          name: exercise.name,
          reps: exercise.reps,
          sets: exercise.sets,
          notes: `${exercise.notes || ""}${demoText}`.trim() || null,
        };
      }),
    },
  };

  const prescription = await prisma.exercisePrescription.create({
    data: prescriptionData,
    include: { exercises: true },
  });

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "COMPLETED" },
  });

  return NextResponse.json({ item: prescription }, { status: 201 });
}
