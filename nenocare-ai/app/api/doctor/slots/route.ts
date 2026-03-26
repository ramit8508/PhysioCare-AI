import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { resolveActorFromRequest } from "@/lib/actor-context";

export async function GET(request: Request) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "DOCTOR");

  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slots = await prisma.doctorSlot.findMany({
    where: { doctorId: actor.id },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({ items: slots });
}

export async function POST(request: Request) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "DOCTOR");

  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { startAt?: string; endAt?: string };
  const startAt = body.startAt ? new Date(body.startAt) : null;
  const endAt = body.endAt ? new Date(body.endAt) : null;

  if (!startAt || !endAt || Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "startAt and endAt are required" }, { status: 400 });
  }

  if (endAt <= startAt) {
    return NextResponse.json({ error: "endAt must be greater than startAt" }, { status: 400 });
  }

  if (startAt <= new Date()) {
    return NextResponse.json({ error: "Slot must be in the future" }, { status: 400 });
  }

  const overlapping = await prisma.doctorSlot.findFirst({
    where: {
      doctorId: actor.id,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });

  if (overlapping) {
    return NextResponse.json({ error: "Overlapping slot already exists" }, { status: 409 });
  }

  const slot = await prisma.doctorSlot.create({
    data: {
      doctorId: actor.id,
      startAt,
      endAt,
      status: "AVAILABLE",
    },
  });

  return NextResponse.json({ item: slot }, { status: 201 });
}
