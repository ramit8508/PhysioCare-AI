import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { resolveActorFromRequest } from "@/lib/actor-context";

export async function GET(request: Request) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "PATIENT");

  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prismaAny = prisma as any;

  const items = await prismaAny.appointmentRequest.findMany({
    where: { patientId: actor.id },
    include: {
      doctor: {
        select: {
          id: true,
          email: true,
          doctorProfile: { select: { fullName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    items: items.map((item: any) => ({
      id: item.id,
      doctorId: item.doctorId,
      doctorEmail: item.doctor.email,
      doctorName: item.doctor.doctorProfile?.fullName || item.doctor.email,
      summary: item.summary,
      preferredAt: item.preferredAt,
      status: item.status,
      meetingUrl: item.meetingUrl,
      roomId: item.roomId,
      createdAt: item.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "PATIENT");

  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { doctorId?: string; summary?: string; preferredAt?: string };

  const doctorId = String(body.doctorId || "").trim();
  const summary = String(body.summary || "").trim();
  const preferredAtRaw = String(body.preferredAt || "").trim();

  if (!doctorId || !summary) {
    return NextResponse.json({ error: "doctorId and summary are required" }, { status: 400 });
  }

  if (summary.length < 10) {
    return NextResponse.json({ error: "Please provide a more detailed summary" }, { status: 400 });
  }

  const doctor = await prisma.user.findFirst({ where: { id: doctorId, role: "DOCTOR", isBlacklisted: false } });
  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  const preferredAt = preferredAtRaw ? new Date(preferredAtRaw) : null;
  if (preferredAtRaw && Number.isNaN(preferredAt?.getTime())) {
    return NextResponse.json({ error: "Invalid preferred date" }, { status: 400 });
  }

  const prismaAny = prisma as any;

  const created = await prismaAny.appointmentRequest.create({
    data: {
      doctorId,
      patientId: actor.id,
      summary,
      preferredAt,
      status: "PENDING",
    },
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
