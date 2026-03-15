"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

type PatientOption = {
  id: string;
  label: string;
};

type ReviewRecord = {
  id: string;
  patientId: string;
  patientEmail: string;
  exerciseName: string;
  repCount?: number | null;
  accuracy?: number | null;
  maxAngle?: number | null;
  videoUrl: string;
  reportText?: string | null;
};

type Props = {
  patients: PatientOption[];
  records: ReviewRecord[];
};

export default function DoctorReviewClient({ patients, records }: Props) {
  const [selectedPatient, setSelectedPatient] = useState("all");

  const filtered = useMemo(() => {
    if (selectedPatient === "all") {
      return records;
    }
    return records.filter((record) => record.patientId === selectedPatient);
  }, [records, selectedPatient]);

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="patientSelect" className="text-sm text-slate-500">
          Patient
        </label>
        <select
          id="patientSelect"
          value={selectedPatient}
          onChange={(event) => setSelectedPatient(event.target.value)}
          className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm"
        >
          <option value="all">All patients</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No reports for this patient.</p>
      ) : (
        filtered.map((record) => (
          <Card
            key={record.id}
            className="glass card-lift mt-6 grid gap-6 p-6 lg:grid-cols-[1.2fr_1fr]"
          >
            <div>
              <h2 className="text-xl font-semibold">{record.exerciseName}</h2>
              <p className="mt-2 text-sm text-slate-500">
                Patient: {record.patientEmail}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Reps</p>
                  <p className="text-lg font-semibold">{record.repCount ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Accuracy</p>
                  <p className="text-lg font-semibold">
                    {record.accuracy ? `${record.accuracy}%` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Max Angle</p>
                  <p className="text-lg font-semibold">
                    {record.maxAngle ? `${record.maxAngle}°` : "-"}
                  </p>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="mt-4"
              >
                <video
                  controls
                  src={record.videoUrl}
                  className="w-full rounded-xl border border-slate-200"
                />
              </motion.div>
            </div>
            <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-100 p-4">
              <h3 className="text-lg font-semibold">Groq Clinical Report</h3>
              <div className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-relaxed">
                {record.reportText || "Report not available."}
              </div>
              <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
                Digitally signed by NeroCare AI
                <div className="signature mt-1 text-base text-emerald-300">
                  Dr. A. Patel, PT
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </section>
  );
}
