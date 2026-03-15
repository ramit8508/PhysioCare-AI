import SidebarNav, { type IconName } from "@/components/SidebarNav";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const items: Array<{ label: string; href: string; icon: IconName }> = [
    { label: "Appointments", href: "/doctor/appointments", icon: "calendar" },
    { label: "Timeslots", href: "/doctor/slots", icon: "dashboard" },
    { label: "Exercises", href: "/doctor/exercises", icon: "stethoscope" },
    { label: "Reviews", href: "/doctor/review", icon: "clipboard" },
  ];

  return (
    <div className="app-shell">
      <SidebarNav title="Doctor Desk" subtitle="NeroCare" items={items} />
      <div className="app-main">{children}</div>
    </div>
  );
}
