import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveActorFromRequest } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";
import { normalizeAiReportMarkdown } from "@/lib/report-format";

type SessionPayload = {
  prescriptionId?: string;
  repCount?: number;
  accuracy?: number;
  maxAngle?: number;
  feedback?: string[];
  durationSec?: number;
  rawPoseSamples?: Array<{
    t?: number;
    angle?: number;
    stage?: "up" | "down";
    quality?: "good" | "needs_correction";
  }>;
  videoBase64?: string;
};

async function saveVideo(videoBase64: string) {
  const cleaned = videoBase64.replace(/^data:video\/[a-zA-Z0-9.+-]+;base64,/, "");
  const buffer = Buffer.from(cleaned, "base64");

  const uploadDir = path.join(process.cwd(), "public", "uploads", "sessions");
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}.webm`;
  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, buffer);

  return `/uploads/sessions/${fileName}`;
}

async function buildGroqReport(input: {
  repCount: number;
  accuracy: number;
  maxAngle: number;
  feedback: string[];
  durationSec: number;
  rawPoseSamples: Array<{ angle: number; stage: "up" | "down"; quality: "good" | "needs_correction" }>;
}) {
  const groqKey = process.env.GROQ_API_KEY || process.env.GROQ_API;

  const angleValues = input.rawPoseSamples.map((sample) => sample.angle);
  const avgAngle = angleValues.length
    ? angleValues.reduce((sum, value) => sum + value, 0) / angleValues.length
    : input.maxAngle;
  const minAngle = angleValues.length ? Math.min(...angleValues) : input.maxAngle;
  const goodSamples = input.rawPoseSamples.filter((sample) => sample.quality === "good").length;
  const sampleQuality = input.rawPoseSamples.length
    ? (goodSamples / input.rawPoseSamples.length) * 100
    : input.accuracy;

  const fallback = [
    `## Session Snapshot`,
    `- Repetitions Completed: ${input.repCount}`,
    `- Session Duration: ${input.durationSec}s`,
    `- Accuracy Score: ${input.accuracy.toFixed(1)}%`,
    `- Max Joint Angle: ${input.maxAngle.toFixed(1)}°`,
    `- Pose Angle Range: ${minAngle.toFixed(1)}° to ${input.maxAngle.toFixed(1)}° (avg ${avgAngle.toFixed(1)}°)`,
    `- Pose Quality Score: ${sampleQuality.toFixed(1)}%`,
    ``,
    `## Form Feedback`,
    input.feedback.length > 0
      ? `- Frequent Corrections: ${input.feedback.slice(0, 5).join("; ")}`
      : `- Frequent Corrections: none detected`,
    ``,
    `## Next Session Plan`,
    `- Keep a steady tempo and prioritize full range of motion on each rep.`,
    `- Pause briefly at end range for better control and consistency.`,
  ].join("\n");

  if (!groqKey) {
    return fallback;
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are a rehab physiotherapy assistant. Return a clean, patient-friendly report using exactly these section headers: '## Session Snapshot', '## Form Feedback', '## Next Session Plan'. Under each header provide 2-6 bullet points in plain language. Do not use bold markers (**), numbering, or extra markdown except these headers and '-' bullets.",
          },
          {
            role: "user",
            content: `Generate a final exercise report from raw MediaPipe exercise data.
reps=${input.repCount}
durationSec=${input.durationSec}
accuracy=${input.accuracy}
maxAngle=${input.maxAngle}
avgAngle=${avgAngle.toFixed(2)}
minAngle=${minAngle.toFixed(2)}
rawPoseQuality=${sampleQuality.toFixed(2)}
rawPoseSamples=${JSON.stringify(input.rawPoseSamples.slice(0, 120))}
feedback=${input.feedback.join(" | ")}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    let data: any;
    try {
      data = (await response.json()) as any;
    } catch {
      return fallback;
    }

    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim().length > 0
      ? normalizeAiReportMarkdown(text.trim(), fallback)
      : fallback;
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  const user = session?.user as any;
  const actor = resolveActorFromRequest(request, { id: user?.id, role: user?.role }, "PATIENT");

  if (!actor?.id || actor.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SessionPayload;
  try {
    body = (await request.json()) as SessionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.prescriptionId) {
    return NextResponse.json({ error: "prescriptionId is required" }, { status: 400 });
  }

  const prescription = await prisma.exercisePrescription.findFirst({
    where: { id: body.prescriptionId, patientId: actor.id },
  });

  if (!prescription) {
    return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
  }

  const timelineDays = Math.min(365, Math.max(1, Number((prescription as any).timelineDays || 7)));
  const activeUntil = (prescription as any).activeUntil
    ? new Date((prescription as any).activeUntil)
    : new Date(prescription.createdAt.getTime() + timelineDays * 24 * 60 * 60 * 1000);

  if (Date.now() > activeUntil.getTime()) {
    return NextResponse.json({ error: "Prescription timeline has ended" }, { status: 409 });
  }

  const repCount = Number(body.repCount || 0);
  const accuracy = Number(body.accuracy || 0);
  const maxAngle = Number(body.maxAngle || 0);
  const durationSec = Math.max(1, Number(body.durationSec || 0));
  const feedback = Array.isArray(body.feedback) ? body.feedback.filter((x) => typeof x === "string") : [];
  const rawPoseSamples = Array.isArray(body.rawPoseSamples)
    ? body.rawPoseSamples
        .filter((sample) => typeof sample?.angle === "number")
        .slice(0, 200)
        .map((sample) => ({
          angle: Number(sample.angle || 0),
          stage: sample.stage === "up" ? ("up" as const) : ("down" as const),
          quality: sample.quality === "good" ? ("good" as const) : ("needs_correction" as const),
        }))
    : [];

  const reportText = await buildGroqReport({
    repCount,
    accuracy,
    maxAngle,
    feedback,
    durationSec,
    rawPoseSamples,
  });

  const videoUrl = body.videoBase64 ? await saveVideo(body.videoBase64) : "/uploads/sessions/no-video.webm";

  const created = await prisma.exerciseSessionRecord.create({
    data: {
      prescriptionId: prescription.id,
      doctorId: prescription.doctorId,
      patientId: actor.id,
      videoUrl,
      repCount,
      accuracy,
      maxAngle,
      reportText,
    },
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
