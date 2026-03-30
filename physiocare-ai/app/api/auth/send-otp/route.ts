import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidEmail, sendOtpEmail } from "@/lib/email-otp";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = String(body.email || "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
  }

  try {
    await sendOtpEmail(email);
    return NextResponse.json({ success: true, message: "OTP sent to your email." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send OTP.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
