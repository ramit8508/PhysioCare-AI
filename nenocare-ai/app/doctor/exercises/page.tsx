import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ExerciseLibrary from "./ExerciseLibrary";
import { createPrescription } from "./actions";
import { BookOpen } from "lucide-react";

type PatientUser = Prisma.UserGetPayload<{}>;

export default async function DoctorExercisesPage() {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR") {
    redirect("/doctor/login");
  }

  const patients = (await prisma.user.findMany({
    where: { role: "PATIENT" },
    orderBy: { createdAt: "desc" },
  })) as PatientUser[];

  const patientOptions = patients.map((patient) => ({
    id: patient.id,
    label: patient.email,
  }));

  const prescriptions = (await prisma.exercisePrescription.findMany({
    where: { doctorId: session.userId },
  })) as any[];

  return (
    <main className="doctor-shell">
      <div className="doctor-header">
        <div>
          <h1 className="doctor-title">Exercise Library</h1>
          <p className="doctor-subtitle">
            Search exercises and prescribe to your patients.
          </p>
        </div>
        <div className="doctor-stats">
          <div className="doctor-stat-card">
            <div className="doctor-stat-icon" style={{ background: "#fce7f3" }}>
              <BookOpen style={{ width: "20px", height: "20px", color: "#ec4899" }} />
            </div>
            <div>
              <p className="doctor-stat-label">Prescriptions Given</p>
              <p className="doctor-stat-value">{prescriptions.length}</p>
            </div>
          </div>
          <div className="doctor-stat-card">
            <div className="doctor-stat-icon" style={{ background: "#e0e7ff" }}>
              <span style={{ width: "20px", height: "20px", color: "#6366f1", fontSize: "14px", fontWeight: "bold" }}>
                👥
              </span>
            </div>
            <div>
              <p className="doctor-stat-label">Total Patients</p>
              <p className="doctor-stat-value">{patientOptions.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="doctor-content">
        <ExerciseLibrary
          patients={patientOptions}
          createPrescription={createPrescription}
        />
      </div>
    </main>
  );
}
