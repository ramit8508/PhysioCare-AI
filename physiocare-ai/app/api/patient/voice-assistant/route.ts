import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveActorFromRequest } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";
import { normalizeAiReportMarkdown } from "@/lib/report-format";

type VoiceAssistantPayload = {
  message?: string;
  prescriptionId?: string;
  exerciseName?: string;
  repCount?: number;
  accuracy?: number;
  maxAngle?: number;
  sessionActive?: boolean;
};

type VoiceAssistantResult = {
  advice: string;
  shouldFlagDoctor: boolean;
  urgency: "low" | "medium" | "high";
  doctorSummary: string;
};

function extractJsonObject(text: string) {
  const raw = String(text || "").trim();
  if (!raw) {
    return null;
  }

  const directStart = raw.indexOf("{");
  const directEnd = raw.lastIndexOf("}");
  if (directStart >= 0 && directEnd > directStart) {
    const candidate = raw.slice(directStart, directEnd + 1);
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  return null;
}

function buildFallback(message: string): VoiceAssistantResult {
  const normalized = message.toLowerCase();
  const highRiskWords = ["severe", "sharp", "cannot", "can't", "numb", "tingling", "dizzy", "faint", "shooting"];
  const mediumRiskWords = ["pain", "hurt", "sore", "tight", "back", "knee", "neck", "worse"];

  const hasHighRisk = highRiskWords.some((word) => normalized.includes(word));
  const hasMediumRisk = mediumRiskWords.some((word) => normalized.includes(word));

  const urgency: VoiceAssistantResult["urgency"] = hasHighRisk ? "high" : hasMediumRisk ? "medium" : "low";
  const shouldFlagDoctor = urgency !== "low";

  if (urgency === "high") {
    return {
      advice:
        "Stop the current set now. Shift to pain-free range only, rest for 2-3 minutes, and avoid loaded flexion/extension until your doctor reviews this.",
      shouldFlagDoctor,
      urgency,
      doctorSummary:
        "Patient reported high-risk pain symptoms during exercise. Immediate pause recommended and urgent clinical review advised.",
    };
  }

  if (urgency === "medium") {
    return {
      advice:
        "Reduce range of motion by 30-40%, slow your tempo, and keep neutral posture. If pain rises in the next set, stop and wait for doctor guidance.",
      shouldFlagDoctor,
      urgency,
      doctorSummary:
        "Patient reported discomfort during exercise. Suggested reduced range and tempo; doctor follow-up requested if symptoms persist.",
    };
  }

  return {
    advice: "Continue with controlled reps, neutral posture, and slow breathing. Stop if discomfort increases.",
    shouldFlagDoctor,
    urgency,
    doctorSummary: "Low-risk voice check-in recorded.",
  };
}

async function askGroq(input: {
  message: string;
  exerciseName: string;
  repCount: number;
  accuracy: number;
  maxAngle: number;
  sessionActive: boolean;
}) {
  const fallback = buildFallback(input.message);
  const groqKey = process.env.GROQ_API_KEY || process.env.GROQ_API;

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
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a physiotherapy voice assistant. Output strict JSON only with keys: advice (string), shouldFlagDoctor (boolean), urgency (low|medium|high), doctorSummary (string). Keep advice practical, short, and safety-focused. Never diagnose. If pain symptoms suggest concern, set shouldFlagDoctor=true.",
          },
          {
            role: "user",
            content: `Patient live voice input: ${input.message}\nExercise: ${input.exerciseName}\nSession active: ${input.sessionActive}\nCurrent reps: ${input.repCount}\nAccuracy: ${input.accuracy}\nMax angle: ${input.maxAngle}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return fallback;
    }

    const data = (await response.json()) as any;
    const content = String(data?.choices?.[0]?.message?.content || "");
    const parsed = extractJsonObject(content);

    if (!parsed) {
      return fallback;
    }

    const urgencyRaw = String(parsed.urgency || "").toLowerCase();
    const urgency: VoiceAssistantResult["urgency"] =
      urgencyRaw === "high" || urgencyRaw === "medium" || urgencyRaw === "low" ? urgencyRaw : fallback.urgency;

    const advice = String(parsed.advice || "").trim() || fallback.advice;
    const doctorSummary = String(parsed.doctorSummary || "").trim() || fallback.doctorSummary;
    const shouldFlagDoctor =
      typeof parsed.shouldFlagDoctor === "boolean"
        ? parsed.shouldFlagDoctor
        : urgency === "medium" || urgency === "high";

    return {
      advice,
      shouldFlagDoctor,
      urgency,
      doctorSummary,
    };
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

  let body: VoiceAssistantPayload;
  try {
    body = (await request.json()) as VoiceAssistantPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = String(body.message || "").trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  if (message.length > 1000) {
    return NextResponse.json({ error: "message is too long" }, { status: 400 });
  }

  const prescriptionId = String(body.prescriptionId || "").trim();
  const repCount = Number(body.repCount || 0);
  const accuracy = Number(body.accuracy || 0);
  const maxAngle = Number(body.maxAngle || 0);
  const sessionActive = Boolean(body.sessionActive);
  const exerciseName = String(body.exerciseName || "Exercise").trim() || "Exercise";

  let prescription: any = null;
  if (prescriptionId) {
    prescription = await prisma.exercisePrescription.findFirst({
      where: { id: prescriptionId, patientId: actor.id },
      include: { exercises: { take: 1, select: { name: true } } },
    });
  }

  const resolvedExerciseName =
    exerciseName || prescription?.exercises?.[0]?.name || prescription?.name || "Exercise";

  const result = await askGroq({
    message,
    exerciseName: resolvedExerciseName,
    repCount,
    accuracy,
    maxAngle,
    sessionActive,
  });

  let flaggedRecordId: string | null = null;

  if (result.shouldFlagDoctor && prescription) {
    const fallbackReport = [
      "## Voice Alert Summary",
      `- Patient Voice Note: ${message}`,
      `- Urgency: ${result.urgency.toUpperCase()}`,
      `- Exercise: ${resolvedExerciseName}`,
      "",
      "## Immediate Guidance",
      `- ${result.advice}`,
      "",
      "## Suggested Doctor Follow-up",
      `- ${result.doctorSummary}`,
    ].join("\n");

    const reportText = normalizeAiReportMarkdown(fallbackReport, fallbackReport);

    const created = await prisma.exerciseSessionRecord.create({
      data: {
        prescriptionId: prescription.id,
        doctorId: prescription.doctorId,
        patientId: actor.id,
        videoUrl: "/uploads/sessions/no-video.webm",
        repCount: Number.isFinite(repCount) ? Math.max(0, Math.round(repCount)) : 0,
        accuracy: Number.isFinite(accuracy) ? Math.max(0, Math.min(100, accuracy)) : 0,
        maxAngle: Number.isFinite(maxAngle) ? Math.max(0, maxAngle) : 0,
        reportText,
      },
    });

    flaggedRecordId = created.id;
  }

  return NextResponse.json({
    advice: result.advice,
    urgency: result.urgency,
    shouldFlagDoctor: result.shouldFlagDoctor,
    flaggedRecordId,
    doctorNotified: Boolean(flaggedRecordId),
  });
}
