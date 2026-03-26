import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    degree?: string;
    specialization?: string;
    experienceYears?: number | null;
  };

  const email = body.email?.toLowerCase().trim() || "";
  const password = body.password || "";
  const role = body.role?.toUpperCase() || "PATIENT";

  if (role === "ADMIN") {
    return NextResponse.json({ error: "Admin registration is disabled" }, { status: 403 });
  }

  if (role === "DOCTOR") {
    return NextResponse.json(
      { error: "Doctor registration is restricted. Please contact an admin." },
      { status: 403 },
    );
  }

  if (!email || !password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }

  const passwordHash = hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: role as any,
      patientProfile: role === "PATIENT" ? {
        create: { displayName: body.name || "" },
      } : undefined,
      doctorProfile: undefined,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email, role: user.role });
}
