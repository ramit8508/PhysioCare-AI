"use server";

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

const parseDateTimeLocal = (value: string, tzOffsetMinutes: number) => {
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) {
    return new Date(NaN);
  }
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute) + tzOffsetMinutes * 60 * 1000;
  return new Date(utcMillis);
};

export async function createSlot(formData: FormData) {
  const session = await requireDoctor();

  const startAtRaw = String(formData.get("startAt") || "");
  const endAtRaw = String(formData.get("endAt") || "");
  const tzOffsetRaw = String(formData.get("tzOffset") || "0");
  const tzOffsetMinutes = Number(tzOffsetRaw);

  if (!startAtRaw || !endAtRaw) {
    throw new Error("Missing time range");
  }

  const startAt = parseDateTimeLocal(startAtRaw, tzOffsetMinutes);
  const endAt = parseDateTimeLocal(endAtRaw, tzOffsetMinutes);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    throw new Error("Invalid time range");
  }

  if (endAt <= startAt) {
    throw new Error("End time must be after start time");
  }

  const now = new Date();
  if (startAt <= now) {
    throw new Error("Start time must be in the future");
  }

  const prismaAny = prisma as any;
  await prismaAny.doctorSlot.create({
    data: {
      doctorId: session.userId,
      startAt,
      endAt,
    },
  });

  revalidatePath("/doctor/slots");
  revalidatePath("/patient");
  revalidatePath("/patient/doctors");
  revalidatePath("/patient/doctors/[doctorId]");
}
