import { NextResponse } from "next/server";
import { isValidEmail, verifyOtp } from "@/lib/email-otp";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; otp?: string };
  const email = String(body.email || "").trim().toLowerCase();
  const otp = String(body.otp || "").trim();

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json({ error: "Enter a valid 6-digit OTP." }, { status: 400 });
  }

  const result = verifyOtp(email, otp);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    verificationToken: result.verificationToken,
    expiresInSec: result.expiresInSec,
  });
}
