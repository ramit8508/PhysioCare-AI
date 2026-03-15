"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Activity,
  CalendarClock,
  ClipboardCheck,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

const iconMap = {
  activity: Activity,
  calendar: CalendarClock,
  clipboard: ClipboardCheck,
  heart: HeartPulse,
  dashboard: LayoutDashboard,
  shield: ShieldCheck,
  stethoscope: Stethoscope,
};

export type IconName = keyof typeof iconMap;

type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

type Props = {
  title: string;
  subtitle: string;
  items: NavItem[];
};

export default function SidebarNav({ title, subtitle, items }: Props) {
  const pathname = usePathname();

  return (
    <aside className="sidebar-nav-container">
      <div className="sidebar-nav-header">
        <div className="sidebar-nav-branding">
          <p className="sidebar-nav-subtitle">{subtitle}</p>
          <h2 className="sidebar-nav-title">{title}</h2>
        </div>
      </div>

      <nav className="sidebar-nav-menu">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = iconMap[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item ${active ? "active" : ""}`}
            >
              <Icon className="sidebar-nav-item-icon" />
              <span className="sidebar-nav-item-label">{item.label}</span>
              {active && <div className="sidebar-nav-item-indicator" />}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-nav-footer">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="sidebar-nav-logout"
        >
          <LogOut className="sidebar-nav-logout-icon" />
          <span>Logout</span>
        </button>
        <div className="sidebar-nav-copyright">
          NeroCare AI · Modern Clinical
        </div>
      </div>
    </aside>
  );
}
