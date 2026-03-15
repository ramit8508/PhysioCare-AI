import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Calendar, Activity, TrendingUp, UserCheck, Clock } from "lucide-react";

export default async function PatientDashboard() {
  const session = await getSession();
  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  // Get stats
  const prismaAny = prisma as any;

  const appointmentCount = await (prismaAny.appointment.count as any)({
    where: { patientId: session.userId },
  });

  const upcomingAppointments = await (prismaAny.appointment.count as any)({
    where: {
      patientId: session.userId,
      slot: {
        startAt: { gte: new Date() },
      },
    },
  });

  const prescriptionCount = await prisma.exercisePrescription.count({
    where: { patientId: session.userId },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const sessionCount = await (prismaAny.exerciseSessionRecord.count as any)({
    where: {
      patientId: session.userId,
      createdAt: { gte: sevenDaysAgo },
    },
  });

  const recentPrescriptions = await prisma.exercisePrescription.findMany({
    where: { patientId: session.userId },
    include: { doctor: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  // Get available doctors with slots
  const doctorsWithSlots = await prisma.user.findMany({
    where: { role: "DOCTOR", isBlacklisted: false },
    include: { 
      doctorProfile: true,
      slotsAsDoctor: {
        where: { 
          status: "AVAILABLE",
          startAt: { gte: new Date() }
        },
        orderBy: { startAt: "asc" },
        take: 3,
      }
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const formatDateTime = (value: Date) =>
    value.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <main className="patient-shell">
      <div className="patient-main">
        {/* Header */}
        <div className="patient-header">
          <h1 className="patient-header-title">Welcome back, Patient! 👋</h1>
          <p className="patient-header-subtitle">
            Track your recovery journey and manage your appointments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="patient-stats">
          <div className="patient-stat-card">
            <div className="patient-stat-value">{appointmentCount}</div>
            <div className="patient-stat-label">Total Appointments</div>
          </div>
          <div className="patient-stat-card">
            <div className="patient-stat-value">{upcomingAppointments}</div>
            <div className="patient-stat-label">Upcoming Sessions</div>
          </div>
          <div className="patient-stat-card">
            <div className="patient-stat-value">{prescriptionCount}</div>
            <div className="patient-stat-label">Active Programs</div>
          </div>
          <div className="patient-stat-card">
            <div className="patient-stat-value">{sessionCount}</div>
            <div className="patient-stat-label">Sessions This Week</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="patient-section">
          <h2 className="patient-section-title">Quick Actions</h2>
          <div className="patient-grid">
            <Link href="/patient/doctors" className="patient-card">
              <div className="patient-card-header">
                <div className="patient-card-title flex items-center gap-2">
                  <UserCheck size={18} />
                  Book a Doctor
                </div>
                <p className="patient-card-subtitle">Find and book with physiotherapists</p>
              </div>
              <div className="patient-card-content">
                <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.6" }}>
                  Browse available doctors and schedule your consultation slot.
                </p>
              </div>
            </Link>

            <Link href="/patient/appointments" className="patient-card">
              <div className="patient-card-header">
                <div className="patient-card-title flex items-center gap-2">
                  <Calendar size={18} />
                  My Appointments
                </div>
                <p className="patient-card-subtitle">Manage your sessions</p>
              </div>
              <div className="patient-card-content">
                <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.6" }}>
                  View and join your upcoming appointments and telehealth sessions.
                </p>
              </div>
            </Link>

            <Link href="/patient/exercises" className="patient-card">
              <div className="patient-card-header">
                <div className="patient-card-title flex items-center gap-2">
                  <BookOpen size={18} />
                  My Exercises
                </div>
                <p className="patient-card-subtitle">Follow your program</p>
              </div>
              <div className="patient-card-content">
                <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.6" }}>
                  Access prescribed exercises and track your performance with AI analysis.
                </p>
              </div>
            </Link>

            <Link href="/patient/progress" className="patient-card">
              <div className="patient-card-header">
                <div className="patient-card-title flex items-center gap-2">
                  <TrendingUp size={18} />
                  Progress Tracking
                </div>
                <p className="patient-card-subtitle">Monitor your improvement</p>
              </div>
              <div className="patient-card-content">
                <p style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.6" }}>
                  View detailed analytics of your recovery and exercise performance.
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Prescriptions */}
        {recentPrescriptions.length > 0 && (
          <div className="patient-section">
            <h2 className="patient-section-title">Recent Prescriptions</h2>
            <div style={{ display: "grid", gap: "16px" }}>
              {recentPrescriptions.map((prescription) => {
                const doctorName = prescription.doctor.email?.split("@")[0] || "Doctor";
                return (
                <div key={prescription.id} className="patient-doctor-card">
                  <div className="patient-exercise-header">
                    <div style={{ color: "#6366f1", fontSize: "12px", fontWeight: 600 }}>
                      Program Name
                    </div>
                    <div className="patient-exercise-name">{prescription.name}</div>
                    <div className="patient-exercise-doctor">
                      Prescribed by: {doctorName}
                    </div>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <Link href="/patient/exercises" className="patient-btn patient-btn-primary">
                      <BookOpen size={14} />
                      Start Exercise
                    </Link>
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}

        {/* Available Doctors with Slots */}
        {doctorsWithSlots.some((doc: any) => doc.slotsAsDoctor.length > 0) && (
          <div className="patient-section">
            <h2 className="patient-section-title">Doctors with Available Slots</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
              {doctorsWithSlots.map((doctor: any) => {
                if (doctor.slotsAsDoctor.length === 0) return null;
                const doctorName = doctor.email?.split("@")[0] || "Doctor";
                return (
                  <div key={doctor.id} style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", padding: "20px", transition: "all 0.3s ease" }}>
                    {/* Doctor Header */}
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                        {doctorName}
                      </div>
                      <div style={{ fontSize: "12px", color: "#6366f1", fontWeight: 600, marginBottom: "8px" }}>
                        {doctor.doctorProfile?.degrees || "Physiotherapist"}
                      </div>
                      <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                        {doctor.doctorProfile?.experienceYears ?? 0} years experience
                      </p>
                    </div>

                    {/* Next Available Slots */}
                    <div style={{ background: "#f8f9ff", borderRadius: "10px", padding: "12px", marginBottom: "16px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: "#6366f1", textTransform: "uppercase", marginBottom: "8px" }}>
                        Next Slots
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {doctor.slotsAsDoctor.map((slot: any) => (
                          <div key={slot.id} style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                            <Calendar size={12} style={{ color: "#6366f1" }} />
                            {formatDateTime(slot.startAt)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Book Button */}
                    <Link href={`/patient/doctors/${doctor.id}`} style={{ display: "block", textAlign: "center", padding: "10px 16px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", borderRadius: "10px", fontSize: "12px", fontWeight: 600, textDecoration: "none", transition: "all 0.3s ease" }}>
                      View & Book
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Getting Started Tips */}
        <div className="patient-section">
          <h2 className="patient-section-title">Getting Started</h2>
          <div style={{ display: "grid", gap: "16px" }}>
            <div style={{ background: "white", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ fontSize: "24px" }}>1️⃣</div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                    Book Your First Appointment
                  </div>
                  <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
                    Browse through our physiotherapists and book a consultation slot that works for you.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ background: "white", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ fontSize: "24px" }}>2️⃣</div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                    Receive Exercise Prescriptions
                  </div>
                  <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
                    After your consultation, your doctor will prescribe personalized exercises.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ background: "white", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ fontSize: "24px" }}>3️⃣</div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                    Track with AI-Powered Analysis
                  </div>
                  <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
                    Perform exercises using our AI-powered form detection system and get instant feedback.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ background: "white", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ fontSize: "24px" }}>4️⃣</div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                    Monitor Your Progress
                  </div>
                  <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
                    View detailed analytics and track your recovery improvement over time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
            borderRadius: "16px",
            padding: "32px",
            marginTop: "32px",
            marginBottom: "32px",
            color: "white",
            textAlign: "center",
          }}
        >
          <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
            Ready to Start Your Recovery?
          </h3>
          <p style={{ fontSize: "14px", lineHeight: "1.6", marginBottom: "20px", opacity: 0.95 }}>
            Book your first appointment with one of our experienced physiotherapists today.
          </p>
          <Link href="/patient/doctors" className="patient-btn" style={{ background: "white", color: "#6366f1", margin: "0 auto", width: "fit-content" }}>
            <Calendar size={16} />
            Browse Doctors Now
          </Link>
        </div>
      </div>
    </main>
  );
}
