import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RecordingPayload = {
  roomId?: string;
  videoBase64?: string;
  durationSec?: number;
};

async function saveCallVideo(videoBase64: string) {
  const cleaned = videoBase64.replace(/^data:video\/[a-zA-Z0-9.+-]+;base64,/, "");
  const buffer = Buffer.from(cleaned, "base64");

  const uploadDir = path.join(process.cwd(), "public", "uploads", "calls");
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}.webm`;
  const filePath = path.join(uploadDir, fileName);
  await fs.writeFile(filePath, buffer);

  return `/uploads/calls/${fileName}`;
}

async function generateCallReport(durationSec: number, roomId: string) {
  const fallback = [
    "Telehealth call summary:",
    `- Room ID: ${roomId}`,
    `- Duration: ${Math.max(0, Math.round(durationSec))} seconds`,
    "- Recommendation: Review patient mobility progression and compare with exercise-session metrics before next call.",
  ].join("\n");

  const groqKey = process.env.GROQ_API_KEY;
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
              "You are a telehealth documentation assistant. Generate concise clinically useful notes.",
          },
          {
            role: "user",
            content: `Create a short telehealth session report with actionable next steps. roomId=${roomId}, durationSec=${durationSec}`,
          },
        ],
        temperature: 0.2,
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

    const report = data?.choices?.[0]?.message?.content;
    if (typeof report !== "string" || !report.trim()) {
      return fallback;
    }

    return report.trim();
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  const user = session?.user as any;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RecordingPayload;
  try {
    body = (await request.json()) as RecordingPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const roomId = body.roomId || "";
  const videoBase64 = body.videoBase64 || "";
  const durationSec = Number(body.durationSec || 0);

  if (!roomId || !videoBase64) {
    return NextResponse.json({ error: "roomId and videoBase64 are required" }, { status: 400 });
  }

  const appointment = await prisma.appointment.findFirst({
    where: {
      roomId,
      OR: [{ doctorId: user.id }, { patientId: user.id }],
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Meeting appointment not found" }, { status: 404 });
  }

  const videoUrl = await saveCallVideo(videoBase64);
  const reportText = await generateCallReport(durationSec, roomId);

  const prismaAny = prisma as any;

  const record = await prismaAny.telehealthCallRecord.upsert({
    where: { appointmentId: appointment.id },
    update: {
      roomId,
      videoUrl,
      durationSec,
      reportText,
    },
    create: {
      appointmentId: appointment.id,
      roomId,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      videoUrl,
      durationSec,
      reportText,
    },
  });

  return NextResponse.json({ item: record }, { status: 201 });
}
