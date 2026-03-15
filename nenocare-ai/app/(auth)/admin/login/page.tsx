import RoleLoginForm from "@/components/RoleLoginForm";
import Link from "next/link";

export default function AdminLoginPage() {
  return (
    <main className="auth-shell">
      <nav className="auth-nav">
        <div className="auth-logo">NeuroCareAI</div>
        <Link href="/" className="auth-nav-link">
          Back Home
        </Link>
      </nav>

      <div className="auth-card">
        <div className="auth-card-header">
          <p className="auth-card-header-logo">NEROCARE</p>
          <h1 className="auth-card-header-title">Admin Login</h1>
          <p className="auth-card-header-desc">Manage access and platform operations.</p>
        </div>
        <div className="auth-card-content">
          <RoleLoginForm role="ADMIN" callbackUrl="/admin" />
        </div>
        <div className="auth-footer">
          Patient? <Link href="/login">Patient login</Link> ·{" "}
          <Link href="/doctor/login">Doctor login</Link>
        </div>
      </div>
    </main>
  );
}
