import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveActorFromRequest } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "DOCTOR");

  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { requestId?: string };
  const requestId = String(body.requestId || "").trim();
  if (!requestId) {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }

  const prismaAny = prisma as any;

  const row = await prismaAny.appointmentRequest.findFirst({
    where: {
      id: requestId,
      doctorId: actor.id,
      status: "PENDING",
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const roomId = row.roomId || randomBytes(10).toString("hex");
  const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const meetingUrl = `${baseUrl.replace(/\/$/, "")}/meet/${roomId}`;

  const updated = await prismaAny.appointmentRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      roomId,
      meetingUrl,
    },
  });

  return NextResponse.json({ item: updated });
}
