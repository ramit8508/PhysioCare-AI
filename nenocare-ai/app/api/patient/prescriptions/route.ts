import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { resolveActorFromRequest } from "@/lib/actor-context";

function extractFirstUrl(text: string) {
  const match = text.match(/https?:\/\/\S+/i)?.[0] || "";
  return match.replace(/[),.;]+$/, "").trim() || null;
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

  const items = prescriptions.map((prescription) => ({
    ...prescription,
    exercises: (prescription.exercises || []).map((exercise) => {
      const fromNotes = extractFirstUrl(String(exercise.notes || ""));
      return {
        ...exercise,
        demoUrl: fromNotes || prescription.gifUrl || null,
      };
    }),
  }));

  return NextResponse.json({ items });
}
