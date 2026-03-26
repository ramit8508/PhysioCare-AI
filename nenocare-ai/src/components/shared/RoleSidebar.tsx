"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BrainCircuit, LayoutDashboard, Dumbbell, CalendarDays,
  Users, FileText, Shield, UserPlus, Activity, ChevronLeft, LogOut, Settings, TrendingUp
} from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

type Role = "patient" | "doctor" | "admin";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

const roleNavItems: Record<Role, NavItem[]> = {
  patient: [
    { title: "Dashboard", url: "/patient", icon: LayoutDashboard },
    { title: "Appointments", url: "/patient/appointments", icon: CalendarDays },
    { title: "Exercises", url: "/patient/exercises", icon: Dumbbell },
    { title: "Trends", url: "/dashboard/performance", icon: TrendingUp },
  ],
  doctor: [
    { title: "Patients", url: "/doctor", icon: Users },
    { title: "Appointments", url: "/doctor/appointments", icon: CalendarDays },
    { title: "Reports", url: "/doctor/reports", icon: FileText },
    { title: "Settings", url: "/doctor/settings", icon: Settings },
  ],
  admin: [
    { title: "Users", url: "/admin", icon: Shield },
    { title: "System Health", url: "/admin/health", icon: Activity },
    { title: "Create Account", url: "/admin/create", icon: UserPlus },
    { title: "Settings", url: "/admin/settings", icon: Settings },
  ],
};

export function RoleSidebar({ role }: { role: Role }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const items = roleNavItems[role];

  return (
    <aside className={cn(
      "h-screen flex flex-col border-r border-white/6 bg-slate-950/80 backdrop-blur-xl transition-all duration-300",
      collapsed ? "w-18" : "w-65"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/6">
        <BrainCircuit className="text-primary w-7 h-7 shrink-0" />
        {!collapsed && (
          <span className="font-bold text-lg tracking-tighter text-foreground">NEROCARE AI</span>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-5 py-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {role}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.url;
          return (
            <Link
              key={item.url}
              href={item.url}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary shadow-[0_0_0_1px_rgba(14,165,233,0.15)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/4"
              )}
            >
              <item.icon size={20} className="shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/6 space-y-1">
        {!collapsed && <ThemeToggle />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/4 transition-all w-full"
        >
          <ChevronLeft size={20} className={cn("shrink-0 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
