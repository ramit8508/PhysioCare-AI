import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveActorFromRequest } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "DOCTOR");

  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prismaAny = prisma as any;

  const rows = await prismaAny.appointmentRequest.findMany({
    where: { doctorId: actor.id },
    include: {
      patient: {
        select: {
          email: true,
          patientProfile: { select: { displayName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    items: rows.map((row: any) => ({
      id: row.id,
      patientId: row.patientId,
      patientName: row.patient.patientProfile?.displayName || row.patient.email,
      patientEmail: row.patient.email,
      summary: row.summary,
      preferredAt: row.preferredAt,
      status: row.status,
      meetingUrl: row.meetingUrl,
      roomId: row.roomId,
      createdAt: row.createdAt,
    })),
  });
}
