import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { resolveActorFromRequest } from "@/lib/actor-context";

export async function GET(request: Request) {
  const session = await getSession();
  const actor = resolveActorFromRequest(request, session?.user as any, "PATIENT");

  if (!actor?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId") || "";

  if (!doctorId) {
    return NextResponse.json({ error: "doctorId is required" }, { status: 400 });
  }

  const slots = await prisma.doctorSlot.findMany({
    where: {
      doctorId,
      status: "AVAILABLE",
      startAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      doctor: {
        select: { email: true },
      },
    },
  });

  return NextResponse.json({ items: slots });
}
