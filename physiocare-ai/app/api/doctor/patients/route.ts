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

  const appointments = await prisma.appointment.findMany({
    where: { doctorId: actor.id },
    include: {
      patient: {
        select: {
          id: true,
          email: true,
          patientProfile: { select: { displayName: true } },
        },
      },
      slot: { select: { startAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const unique = new Map<string, any>();

  for (const appointment of appointments) {
    if (!unique.has(appointment.patient.id)) {
      unique.set(appointment.patient.id, {
        id: appointment.patient.id,
        email: appointment.patient.email,
        displayName: appointment.patient.patientProfile?.displayName || null,
        lastAppointmentAt: appointment.slot.startAt,
        lastStatus: appointment.status,
      });
    }
  }

  return NextResponse.json({ items: Array.from(unique.values()) });
}
