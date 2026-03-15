"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const requireDoctor = async () => {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR") {
    throw new Error("Unauthorized");
  }
  return session;
};

export async function approveAppointment(formData: FormData) {
  const session = await requireDoctor();
  const appointmentId = String(formData.get("appointmentId") || "");

  if (!appointmentId) {
    throw new Error("Missing appointmentId");
  }

  const prismaAny = prisma as any;
  const appointment = await prismaAny.appointment.findFirst({
    where: { id: appointmentId, doctorId: session.userId, status: "PENDING" },
    include: { slot: true },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  const roomId = randomBytes(10).toString("hex");
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const meetingUrl = `${baseUrl}/meet/${roomId}`;

  await prismaAny.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "APPROVED",
      roomId,
      meetingUrl,
    },
  });

  revalidatePath("/doctor/appointments");
  revalidatePath("/patient/appointments");
}

export async function declineAppointment(formData: FormData) {
  const session = await requireDoctor();
  const appointmentId = String(formData.get("appointmentId") || "");

  if (!appointmentId) {
    throw new Error("Missing appointmentId");
  }

  const prismaAny = prisma as any;
  const appointment = await prismaAny.appointment.findFirst({
    where: { id: appointmentId, doctorId: session.userId, status: "PENDING" },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  await prismaAny.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "CANCELED",
      roomId: null,
      meetingUrl: null,
    },
  });

  await prismaAny.doctorSlot.update({
    where: { id: appointment.slotId },
    data: { status: "AVAILABLE" },
  });

  revalidatePath("/doctor/appointments");
  revalidatePath("/patient/appointments");
  revalidatePath("/patient/doctors");
}
