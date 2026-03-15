import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { bookSlot } from "../actions";
import { Calendar, Clock, Award, CheckCircle, MapPin, Phone } from "lucide-react";

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });

const formatTime = (value: Date) =>
  value.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function DoctorProfilePage({
  params,
}: {
  params: { doctorId: string };
}) {
  const session = await getSession();
  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  const doctor = await prisma.user.findFirst({
    where: { id: params.doctorId, role: "DOCTOR", isBlacklisted: false },
    include: { doctorProfile: true },
  });

  if (!doctor) {
    redirect("/patient/doctors");
  }

  const docName = doctor.email?.split("@")[0] || "Doctor";

  const prismaAny = prisma as any;
  const slots = (await prismaAny.doctorSlot.findMany({
    where: {
      doctorId: doctor.id,
      status: "AVAILABLE",
      startAt: { gte: new Date() },
    },
    orderBy: { startAt: "asc" },
  })) as Array<any>;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });

  return (
    <main className="patient-shell">
      <div className="patient-main">
        {/* Back Button */}
        <div style={{ marginBottom: "24px" }}>
          <Link href="/patient/doctors" style={{ color: "#6366f1", fontSize: "13px", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}>
            ←  Back to Doctors
          </Link>
        </div>

        {/* Doctor Header */}
        <div style={{ background: "linear-gradient(135deg, #f8f9ff 0%, #f3e8ff 50%)", borderRadius: "16px", padding: "32px", marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "24px" }}>
            {/* Doctor Info */}
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                Physiotherapist Profile
              </div>
              <h1 style={{ fontSize: "36px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
                {docName}
              </h1>
              <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#64748b" }}>
                  <Award size={16} style={{ color: "#6366f1" }} />
                  <strong>{doctor.doctorProfile?.degrees || "Physiotherapist"}</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#64748b" }}>
                  <CheckCircle size={16} style={{ color: "#16a34a" }} />
                  <strong>{doctor.doctorProfile?.experienceYears ?? 0} years experience</strong>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)", color: "white", padding: "12px 20px", borderRadius: "10px", fontWeight: 600, fontSize: "13px", textAlign: "center", whiteSpace: "nowrap" }}>
              ✓ Available
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div style={{ background: "white", borderRadius: "16px", padding: "24px", border: "1px solid #e2e8f0", marginBottom: "32px" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>About</div>
          <p style={{ fontSize: "14px", color: "#64748b", lineHeight: "1.8" }}>
            {doctor.doctorProfile?.bio || "Experienced physiotherapist dedicated to helping patients achieve their recovery goals through personalized rehabilitation programs and compassionate care."}
          </p>
        </div>

        {/* Quick Info Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <div style={{ background: "white", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0", borderTop: "4px solid #6366f1" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
              Specialization
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
              {doctor.doctorProfile?.degrees || "Physiotherapy"}
            </div>
          </div>
          <div style={{ background: "white", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0", borderTop: "4px solid #8b5cf6" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
              Experience
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
              {doctor.doctorProfile?.experienceYears ?? 0} Years
            </div>
          </div>
          <div style={{ background: "white", borderRadius: "16px", padding: "20px", border: "1px solid #e2e8f0", borderTop: "4px solid #06b6d4" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", marginBottom: "8px" }}>
              Available Slots
            </div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
              {slots.length} slots
            </div>
          </div>
        </div>

        {/* Available Timeslots Section */}
        <div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", marginBottom: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
            <Calendar size={24} style={{ color: "#6366f1" }} />
            Available Timeslots
          </div>
          <p style={{ fontSize: "13px", color: "#94a3b8", marginBottom: "24px" }}>
            Select a date and time that works best for you.
          </p>

          {slots.length === 0 ? (
            <div style={{ background: "white", borderRadius: "16px", padding: "40px", textAlign: "center", border: "2px dashed #e2e8f0" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📅</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>No Available Slots</div>
              <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                This doctor doesn't have any open slots right now. Check back soon or try another doctor.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
              {days.map((day) => {
                const dayLabel = formatDate(day);
                const daySlots = slots.filter((slot) => {
                  const slotDate = new Date(slot.startAt);
                  return (
                    slotDate.getFullYear() === day.getFullYear() &&
                    slotDate.getMonth() === day.getMonth() &&
                    slotDate.getDate() === day.getDate()
                  );
                });

                return (
                  <div key={day.toISOString()} style={{ background: "white", borderRadius: "16px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    {/* Day Header */}
                    <div style={{ background: "linear-gradient(135deg, #f8f9ff 0%, #f3e8ff 50%)", padding: "16px", borderBottom: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                        {dayLabel}
                      </div>
                    </div>

                    {/* Time Slots */}
                    <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      {daySlots.length === 0 ? (
                        <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
                          No slots available
                        </div>
                      ) : (
                        daySlots.map((slot) => (
                          <form
                            key={slot.id}
                            action={bookSlot}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px",
                              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))",
                              border: "1px solid #c7d2fe",
                              borderRadius: "10px",
                              transition: "all 0.3s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <Clock size={16} style={{ color: "#6366f1" }} />
                              <div style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                                {formatTime(slot.startAt)} - {formatTime(slot.endAt)}
                              </div>
                            </div>
                            <input type="hidden" name="slotId" value={slot.id} />
                            <button
                              type="submit"
                              style={{
                                padding: "8px 16px",
                                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                              }}
                            >
                              Book
                            </button>
                          </form>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div style={{ marginTop: "32px", padding: "24px", background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)", borderRadius: "16px", color: "white", textAlign: "center" }}>
          <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>
            Need help choosing a time?
          </div>
          <p style={{ fontSize: "13px", lineHeight: "1.6", marginBottom: "16px", opacity: 0.95 }}>
            Feel free to book a time that works best for you. If none of these slots work, contact support for assistance.
          </p>
          <Link href="/patient" style={{ color: "white", fontSize: "13px", fontWeight: 600, textDecoration: "none", borderBottom: "2px solid white", paddingBottom: "2px", display: "inline-block" }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

