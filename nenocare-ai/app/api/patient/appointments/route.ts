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

  const appointments = await prisma.appointment.findMany({
    where: { patientId: actor.id },
    include: {
      doctor: {
        select: {
          email: true,
          doctorProfile: { select: { fullName: true } },
        },
      },
      slot: { select: { startAt: true, endAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = appointments.map((appointment) => ({
    id: appointment.id,
    doctorId: appointment.doctorId,
    doctorEmail: appointment.doctor.email,
    doctorName: appointment.doctor.doctorProfile?.fullName || appointment.doctor.email.split("@")[0],
    startAt: appointment.slot.startAt,
    endAt: appointment.slot.endAt,
    status: appointment.status,
    roomId: appointment.roomId,
    meetingUrl: appointment.meetingUrl,
  }));

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "PATIENT");

  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { slotId?: string };
  const slotId = body.slotId || "";

  if (!slotId) {
    return NextResponse.json({ error: "slotId is required" }, { status: 400 });
  }

  const slot = await prisma.doctorSlot.findUnique({ where: { id: slotId } });

  if (!slot) {
    return NextResponse.json({ error: "Slot not found" }, { status: 404 });
  }

  if (slot.status !== "AVAILABLE") {
    return NextResponse.json({ error: "Slot already booked" }, { status: 409 });
  }

  if (slot.startAt < new Date()) {
    return NextResponse.json({ error: "Cannot book past slot" }, { status: 400 });
  }

  const created = await prisma.appointment.create({
    data: {
      doctorId: slot.doctorId,
      patientId: actor.id,
      slotId: slot.id,
      status: "PENDING",
    },
  });

  await prisma.doctorSlot.update({
    where: { id: slot.id },
    data: { status: "BOOKED" },
  });

  return NextResponse.json({ id: created.id, status: created.status }, { status: 201 });
}
