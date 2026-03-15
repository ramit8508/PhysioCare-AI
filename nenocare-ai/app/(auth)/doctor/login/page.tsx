import RoleLoginForm from "@/components/RoleLoginForm";
import Link from "next/link";

export default function DoctorLoginPage() {
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
          <h1 className="auth-card-header-title">Doctor Login</h1>
          <p className="auth-card-header-desc">Access appointments and exercise plans.</p>
        </div>
        <div className="auth-card-content">
          <RoleLoginForm role="DOCTOR" callbackUrl="/doctor/exercises" />
        </div>
        <div className="auth-footer">
          Patient? <Link href="/login">Patient login</Link> ·{" "}
          <Link href="/admin/login">Admin login</Link>
        </div>
      </div>
    </main>
  );
}
