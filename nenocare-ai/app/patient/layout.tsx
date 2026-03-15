import SidebarNav, { type IconName } from "@/components/SidebarNav";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const items: Array<{ label: string; href: string; icon: IconName }> = [
    { label: "Doctors", href: "/patient/doctors", icon: "heart" },
    { label: "Appointments", href: "/patient/appointments", icon: "calendar" },
    { label: "Exercises", href: "/patient/exercises", icon: "dashboard" },
    { label: "Progress", href: "/patient/progress", icon: "activity" },
  ];

  return (
    <div className="app-shell">
      <SidebarNav title="Patient Hub" subtitle="NeroCare" items={items} />
      <div className="app-main">{children}</div>
    </div>
  );
}
