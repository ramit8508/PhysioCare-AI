import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createDoctor, setBlacklist } from "./actions";
import { UserPlus, Users, Shield } from "lucide-react";

type DoctorWithProfile = Prisma.UserGetPayload<{
  include: { doctorProfile: true };
}>;

type PatientWithProfile = Prisma.UserGetPayload<{
  include: { patientProfile: true };
}>;

const requireAdminPage = async () => {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect("/admin/login");
  }
  return session;
};

export default async function AdminPage() {
  await requireAdminPage();

  const [doctors, patients] = (await Promise.all([
    prisma.user.findMany({
      where: { role: "DOCTOR" },
      include: { doctorProfile: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "PATIENT" },
      include: { patientProfile: true },
      orderBy: { createdAt: "desc" },
    }),
  ])) as [DoctorWithProfile[], PatientWithProfile[]];

  return (
    <main className="admin-shell">
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Admin Dashboard</h1>
          <p className="admin-subtitle">
            Manage doctors and patients from one control center.
          </p>
        </div>
        <div className="admin-stats">
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: "#dbeafe" }}>
              <Shield style={{ width: "20px", height: "20px", color: "#0284c7" }} />
            </div>
            <div>
              <p className="admin-stat-label">Total Doctors</p>
              <p className="admin-stat-value">{doctors.length}</p>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: "#dcfce7" }}>
              <Users style={{ width: "20px", height: "20px", color: "#16a34a" }} />
            </div>
            <div>
              <p className="admin-stat-label">Total Patients</p>
              <p className="admin-stat-value">{patients.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-content">
        <section className="admin-card">
          <div className="admin-section-header">
            <div className="admin-section-title">
              <UserPlus style={{ width: "20px", height: "20px" }} />
              <h2>Create Doctor Account</h2>
            </div>
          </div>
          <form action={createDoctor} className="admin-form">
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-label">Email Address</label>
                <input
                  name="email"
                  type="email"
                  placeholder="doctor@clinic.com"
                  required
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Temporary Password</label>
                <input
                  name="password"
                  type="password"
                  placeholder="•••••••••"
                  required
                  className="admin-input"
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-label">Degrees (BPT/MPT)</label>
                <input
                  name="degrees"
                  type="text"
                  placeholder="e.g., BPT, MPT"
                  required
                  className="admin-input"
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Experience (Years)</label>
                <input
                  name="experienceYears"
                  type="number"
                  placeholder="e.g., 5"
                  className="admin-input"
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-label">Short Bio</label>
              <textarea
                name="bio"
                placeholder="Brief professional biography..."
                rows={3}
                className="admin-input"
              />
            </div>

            <button type="submit" className="admin-button-primary">
              <UserPlus style={{ width: "18px", height: "18px" }} />
              Create Doctor Account
            </button>
          </form>
        </section>

        <section className="admin-cards-grid">
          <div className="admin-card">
            <div className="admin-section-header">
              <h2 className="admin-section-heading">
                <Shield style={{ width: "20px", height: "20px" }} />
                Doctors ({doctors.length})
              </h2>
            </div>
            <div className="admin-list">
              {doctors.length > 0 ? (
                doctors.map((doctor) => (
                  <div key={doctor.id} className="admin-list-item">
                    <div className="admin-list-content">
                      <p className="admin-list-name">{doctor.email}</p>
                      <p className="admin-list-meta">
                        {doctor.doctorProfile?.degrees || "—"} · {doctor.doctorProfile?.experienceYears ?? "—"} yrs
                      </p>
                    </div>
                    <div className="admin-list-actions">
                      <span className={`admin-badge ${doctor.isBlacklisted ? "blocked" : "active"}`}>
                        {doctor.isBlacklisted ? "Blocked" : "Active"}
                      </span>
                      <form action={setBlacklist} style={{ display: "inline" }}>
                        <input type="hidden" name="userId" value={doctor.id} />
                        <input
                          type="hidden"
                          name="action"
                          value={doctor.isBlacklisted ? "unblock" : "block"}
                        />
                        <button type="submit" className="admin-button-small">
                          {doctor.isBlacklisted ? "Unblock" : "Block"}
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <p className="admin-empty">No doctors created yet</p>
              )}
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-section-header">
              <h2 className="admin-section-heading">
                <Users style={{ width: "20px", height: "20px" }} />
                Patients ({patients.length})
              </h2>
            </div>
            <div className="admin-list">
              {patients.length > 0 ? (
                patients.map((patient) => (
                  <div key={patient.id} className="admin-list-item">
                    <div className="admin-list-content">
                      <p className="admin-list-name">{patient.email}</p>
                      <p className="admin-list-meta">
                        {patient.patientProfile?.displayName || "No name set"}
                      </p>
                    </div>
                    <div className="admin-list-actions">
                      <span className={`admin-badge ${patient.isBlacklisted ? "blocked" : "active"}`}>
                        {patient.isBlacklisted ? "Blocked" : "Active"}
                      </span>
                      <form action={setBlacklist} style={{ display: "inline" }}>
                        <input type="hidden" name="userId" value={patient.id} />
                        <input
                          type="hidden"
                          name="action"
                          value={patient.isBlacklisted ? "unblock" : "block"}
                        />
                        <button type="submit" className="admin-button-small">
                          {patient.isBlacklisted ? "Unblock" : "Block"}
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <p className="admin-empty">No patients registered yet</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
