import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ExerciseSession from "./ExerciseSession";
import { createSessionReport } from "./actions";
import { BookOpen, TrendingUp, CheckCircle } from "lucide-react";

type PrescriptionWithDoctor = Prisma.ExercisePrescriptionGetPayload<{
  include: { doctor: true };
}>;

export default async function PatientExercisesPage() {
  const session = await getSession();
  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  const prescriptions = (await prisma.exercisePrescription.findMany({
    where: { patientId: session.userId },
    include: { doctor: true },
    orderBy: { createdAt: "desc" },
  })) as PrescriptionWithDoctor[];

  return (
    <main className="patient-shell">
      <div className="patient-main">
        {/* Header */}
        <div className="patient-header">
          <h1 className="patient-header-title">Your Prescribed Exercises</h1>
          <p className="patient-header-subtitle">
            Follow your personalized recovery program and track your performance with AI-powered form detection.
          </p>
        </div>

        {prescriptions.length === 0 ? (
          <div className="patient-empty-state">
            <div className="patient-empty-icon">🧘</div>
            <div className="patient-empty-title">No Exercises Prescribed Yet</div>
            <p className="patient-empty-subtitle">
              Once your physiotherapist creates a personalized program for you, it will appear here.
            </p>
            <Link href="/patient/doctors" className="patient-btn patient-btn-primary">
              <BookOpen size={16} />
              Book Your First Appointment
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "24px" }}>
            {prescriptions.map((item) => {
              const doctorName = item.doctor.email?.split("@")[0] || "Doctor";
              return (
              <div
                key={item.id}
                className="patient-exercise-card"
                style={{
                  borderTop: "4px solid linear-gradient(135deg, #6366f1, #8b5cf6)",
                }}
              >
                {/* Header with info */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <BookOpen size={20} style={{ color: "#6366f1" }} />
                      <div className="patient-exercise-name">{item.name || "Exercise"}</div>
                    </div>
                    <p className="patient-exercise-doctor">
                      Prescribed by: <strong>{doctorName}</strong>
                    </p>
                  </div>
                  <div className="patient-status-badge patient-status-active">
                    <CheckCircle size={12} style={{ display: "inline", marginRight: "4px" }} />
                    Active
                  </div>
                </div>

                {/* Exercise Session Component */}
                <div style={{ background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05))", padding: "20px", borderRadius: "12px" }}>
                  <ExerciseSession
                    prescriptionId={item.id}
                    exerciseName={item.name || "Exercise"}
                    exerciseGif={item.gifUrl || undefined}
                    onUploadComplete={(url) => {
                      console.log("Uploaded session video:", url);
                    }}
                    onGenerateReport={createSessionReport}
                  />
                </div>

                {/* Instructions */}
                <div style={{ marginTop: "16px", padding: "16px", background: "#f8f9ff", borderRadius: "12px", borderLeft: "4px solid #6366f1" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#6366f1", textTransform: "uppercase", marginBottom: "8px" }}>
                    💡 Tips
                  </div>
                  <ul style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.8", paddingLeft: "20px" }}>
                    <li>Perform the exercise in a well-lit area</li>
                    <li>Follow the guide video carefully</li>
                    <li>Our AI will analyze your form and provide feedback</li>
                    <li>Complete all repetitions as prescribed</li>
                  </ul>
                </div>

                {/* Progress Link */}
                <div style={{ marginTop: "16px" }}>
                  <Link href="/patient/progress" className="patient-btn patient-btn-secondary" style={{ fontSize: "13px" }}>
                    <TrendingUp size={14} />
                    View Your Progress
                  </Link>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

