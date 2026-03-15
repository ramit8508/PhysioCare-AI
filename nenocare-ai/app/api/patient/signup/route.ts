import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") || "").trim();
    const displayName = String(formData.get("displayName") || "").trim();

    if (!email || !password) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: "Email already registered" }, { status: 400 });
    }

    await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        role: "PATIENT",
        patientProfile: {
          create: {
            displayName: displayName || undefined,
          },
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create account";
    return NextResponse.json({ message }, { status: 500 });
  }
}
