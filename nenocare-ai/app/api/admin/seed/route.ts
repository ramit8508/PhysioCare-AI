import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "123456";

async function handleSeed() {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (existing) {
      if (existing.role !== "ADMIN") {
        await prisma.user.update({
          where: { email: ADMIN_EMAIL },
          data: { role: "ADMIN" },
        });
      }

      return NextResponse.json({ ok: true, message: "Admin already exists" });
    }

    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash: hashPassword(ADMIN_PASSWORD),
        role: "ADMIN",
      },
    });

    return NextResponse.json({ ok: true, message: "Admin created" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to seed admin";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function POST() {
  return handleSeed();
}

export async function GET() {
  return handleSeed();
}
