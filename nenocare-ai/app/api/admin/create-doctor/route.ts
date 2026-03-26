import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

function ensureAdmin(session: any) {
  const user = session?.user as any;
  return !!user && user.role === "ADMIN";
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
    degrees?: string;
    specialization?: string;
    experienceYears?: number;
    bio?: string;
  };

  const email = body.email?.toLowerCase().trim() || "";
  const password = body.password || "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  if (!String(body.degrees || "").trim() || !String(body.specialization || "").trim()) {
    return NextResponse.json({ error: "Degrees and specialization are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "User already exists" }, { status: 409 });
  }

  const created = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      role: "DOCTOR",
      doctorProfile: {
        create: {
          fullName: body.name?.trim() || "",
          specialization: body.specialization || "",
          degrees: body.degrees || "",
          experienceYears: body.experienceYears ?? null,
          bio: body.bio || body.name || "",
        },
      },
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
