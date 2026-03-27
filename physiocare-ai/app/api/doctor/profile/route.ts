import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveActorFromRequest } from "@/lib/actor-context";

export async function GET(request: Request) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "DOCTOR");

  if (!actor?.id || actor.role !== "DOCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: actor.id },
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
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  return NextResponse.json({
    item: {
      id: user.id,
      email: user.email,
      fullName: user.doctorProfile?.fullName || "",
      specialization: user.doctorProfile?.specialization || "",
      degrees: user.doctorProfile?.degrees || "",
      experienceYears: user.doctorProfile?.experienceYears ?? null,
      bio: user.doctorProfile?.bio || "",
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "DOCTOR");

  if (!actor?.id || actor.role !== "DOCTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    fullName?: string;
    specialization?: string;
    degrees?: string;
    experienceYears?: number | null;
    bio?: string;
  };

  const payload = {
    fullName: String(body.fullName || "").trim(),
    specialization: String(body.specialization || "").trim(),
    degrees: String(body.degrees || "").trim(),
    experienceYears:
      body.experienceYears === null || body.experienceYears === undefined
        ? null
        : Number(body.experienceYears),
    bio: String(body.bio || "").trim(),
  };

  if (!payload.degrees || !payload.specialization) {
    return NextResponse.json(
      { error: "Degrees and specialization are required" },
      { status: 400 },
    );
  }

  if (
    payload.experienceYears !== null &&
    (!Number.isFinite(payload.experienceYears) || payload.experienceYears < 0)
  ) {
    return NextResponse.json({ error: "Invalid experience years" }, { status: 400 });
  }

  const updated = await prisma.doctorProfile.upsert({
    where: { userId: actor.id },
    update: payload,
    create: {
      userId: actor.id,
      ...payload,
    },
  });

  return NextResponse.json({ item: updated });
}
