import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  const user = session?.user as any;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const doctors = await prisma.user.findMany({
    where: { role: "DOCTOR", isBlacklisted: false },
    select: {
      id: true,
      email: true,
      doctorProfile: {
        select: {
          fullName: true,
          specialization: true,
          degrees: true,
          experienceYears: true,
          bio: true,
        },
      },
      slotsAsDoctor: {
        where: {
          status: "AVAILABLE",
          startAt: { gte: new Date() },
        },
        orderBy: { startAt: "asc" },
        take: 5,
        select: { id: true, startAt: true, endAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const items = doctors.map((doctor) => ({
    id: doctor.id,
    email: doctor.email,
    fullName: doctor.doctorProfile?.fullName || doctor.email.split("@")[0],
    specialization: doctor.doctorProfile?.specialization || "General Rehabilitation",
    degrees: doctor.doctorProfile?.degrees || "Not specified",
    experienceYears: doctor.doctorProfile?.experienceYears ?? null,
    bio: doctor.doctorProfile?.bio || "",
    availableSlotsCount: doctor.slotsAsDoctor.length,
    nextAvailableAt: doctor.slotsAsDoctor[0]?.startAt ?? null,
    slotsPreview: doctor.slotsAsDoctor.map((slot) => ({
      id: slot.id,
      startAt: slot.startAt,
      endAt: slot.endAt,
    })),
  }));

  return NextResponse.json({ items });
}
