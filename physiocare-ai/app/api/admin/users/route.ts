import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function ensureAdmin(session: any) {
  const user = session?.user as any;
  return !!user && user.role === "ADMIN";
}

export async function GET() {
  const session = await getSession();
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      isBlacklisted: true,
      createdAt: true,
      patientProfile: { select: { displayName: true } },
      doctorProfile: { select: { degrees: true, experienceYears: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    items: users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isBlacklisted: user.isBlacklisted,
      createdAt: user.createdAt,
      displayName: user.patientProfile?.displayName || null,
      doctorDegrees: user.doctorProfile?.degrees || null,
      doctorExperienceYears: user.doctorProfile?.experienceYears ?? null,
    })),
  });
}
