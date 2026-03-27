"use client";

import { ReactNode } from "react";
import { RoleSidebar } from "./RoleSidebar";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { setActorContext } from "@/lib/actor-context";

type Role = "patient" | "doctor" | "admin";

export function DashboardLayout({ role, children }: { role: Role; children: ReactNode }) {
  const { data } = useSession();

  useEffect(() => {
    const user = data?.user as any;
    if (!user?.id || !user?.role) {
      return;
    }

    const expected = role.toUpperCase();
    if (user.role === expected) {
      setActorContext({
        id: String(user.id),
        role: user.role,
        name: user.name || user.email || user.role,
      });
    }
  }, [data, role]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <RoleSidebar role={role} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
