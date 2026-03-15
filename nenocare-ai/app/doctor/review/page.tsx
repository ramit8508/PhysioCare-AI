import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DoctorReviewClient from "./DoctorReviewClient";

export default async function DoctorReviewPage() {
  const session = await getSession();
  if (!session || session.role !== "DOCTOR") {
    redirect("/doctor/login");
  }

  const prismaAny = prisma as any;
  const records = (await prismaAny.exerciseSessionRecord.findMany({
    where: { doctorId: session.userId, reportText: { not: null } },
    include: { patient: true, prescription: true },
    orderBy: { createdAt: "desc" },
  })) as Array<any>;

  const patients = (await prismaAny.user.findMany({
    where: { role: "PATIENT" },
    orderBy: { createdAt: "desc" },
  })) as Array<any>;

  const patientOptions = patients.map((patient) => ({
    id: patient.id,
    label: patient.email,
  }));

  const reviewRecords = records.map((record) => ({
    id: record.id,
    patientId: record.patientId,
    patientEmail: record.patient.email,
    exerciseName: record.prescription?.name || "Exercise",
    repCount: record.repCount ?? null,
    accuracy: record.accuracy ?? null,
    maxAngle: record.maxAngle ?? null,
    videoUrl: record.videoUrl,
    reportText: record.reportText ?? null,
  }));

  return (
    <main className="page-shell">
      <div>
        <h1 className="page-title">Patient Reviews</h1>
        <p className="page-subtitle">
          Review recordings alongside Groq clinical analysis.
        </p>
      </div>
      {reviewRecords.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No reports yet.</p>
      ) : (
        <DoctorReviewClient patients={patientOptions} records={reviewRecords} />
      )}
    </main>
  );
}
