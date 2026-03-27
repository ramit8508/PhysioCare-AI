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
      patient: { select: { id: true, email: true } },
      slot: { select: { startAt: true, endAt: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const appointmentIds = appointments.map((appointment) => appointment.id);
  const prescriptions = appointmentIds.length
    ? await prisma.exercisePrescription.findMany({
        where: {
          appointmentId: { in: appointmentIds },
          doctorId: actor.id,
        },
        include: {
          exercises: {
            orderBy: { createdAt: "asc" },
            select: { id: true, name: true, reps: true, sets: true, notes: true },
          },
        },
      })
    : [];

  const prescriptionMap = new Map<string, any>(
    prescriptions
      .filter((prescription) => !!prescription.appointmentId)
      .map((prescription) => [String(prescription.appointmentId), prescription]),
  );

  return NextResponse.json({
    items: appointments.map((appointment) => ({
      id: appointment.id,
      patientId: appointment.patient.id,
      patientEmail: appointment.patient.email,
      startAt: appointment.slot.startAt,
      endAt: appointment.slot.endAt,
      status: appointment.status,
      roomId: appointment.roomId,
      meetingUrl: appointment.meetingUrl,
      prescriptionExercises: prescriptionMap.get(appointment.id)?.exercises || [],
    })),
  });
}
