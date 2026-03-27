import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function ensureAdmin(session: any) {
  const user = session?.user as any;
  return !!user && user.role === "ADMIN";
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } },
) {
  const session = await getSession();
  if (!ensureAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { isBlacklisted?: boolean };
  if (typeof body.isBlacklisted !== "boolean") {
    return NextResponse.json({ error: "isBlacklisted must be boolean" }, { status: 400 });
  }

  const id = context.params.id;
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "Admin users cannot be blacklisted" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isBlacklisted: body.isBlacklisted },
    select: {
      id: true,
      email: true,
      role: true,
      isBlacklisted: true,
    },
  });

  return NextResponse.json({ item: updated });
}
