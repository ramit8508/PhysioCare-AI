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

  const items = prescriptions.map((prescription) => ({
    ...prescription,
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
