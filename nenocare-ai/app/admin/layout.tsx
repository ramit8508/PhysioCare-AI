import SidebarNav, { type IconName } from "@/components/SidebarNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const items: Array<{ label: string; href: string; icon: IconName }> = [
    { label: "Dashboard", href: "/admin", icon: "dashboard" },
  ];

  return (
    <div className="app-shell">
      <SidebarNav title="Admin Console" subtitle="NeroCare" items={items} />
      <div className="app-main">{children}</div>
    </div>
  );
}
