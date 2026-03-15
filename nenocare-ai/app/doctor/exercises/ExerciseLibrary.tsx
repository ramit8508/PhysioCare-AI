"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Users } from "lucide-react";

type PatientOption = {
  id: string;
  label: string;
};

type ExerciseItem = {
  id: string;
  name: string;
  bodyPart?: string;
  target?: string;
  gifUrl?: string;
};

type Props = {
  patients: PatientOption[];
  createPrescription: (formData: FormData) => Promise<void>;
};

export default function ExerciseLibrary({ patients, createPrescription }: Props) {
  const [items, setItems] = useState<ExerciseItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<ExerciseItem | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const canPrescribe = useMemo(
    () => Boolean(selectedPatient && selectedExercise),
    [selectedPatient, selectedExercise]
  );

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) {
        params.set("search", search);
      }
      const response = await fetch(`/api/exercises?${params.toString()}`);
      const data = await response.json();
      setItems(data.items || []);
      setLoading(false);
    };

    run();
  }, [search]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canPrescribe || !selectedExercise) {
      return;
    }

    const formData = new FormData();
    formData.set("patientId", selectedPatient);
    formData.set("exerciseId", selectedExercise.id);
    formData.set("name", selectedExercise.name);
    formData.set("gifUrl", selectedExercise.gifUrl || "");
    formData.set("bodyPart", selectedExercise.bodyPart || "");
    formData.set("target", selectedExercise.target || "");

    await createPrescription(formData);
    setSelectedExercise(null);
  };

  return (
    <section className="doctor-exercise-section">
      <div className="doctor-exercise-card">
        <div className="doctor-exercise-header">
          <h2 className="doctor-exercise-title">Prescribe Exercises</h2>
        </div>
        <form onSubmit={handleSubmit} className="doctor-exercise-form">
          <div className="doctor-exercise-inputs">
            <div className="doctor-exercise-input-group">
              <label className="doctor-exercise-label">Search Exercise</label>
              <div className="doctor-exercise-input-wrapper">
                <Search className="doctor-exercise-input-icon" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, body part, or target..."
                  className="doctor-exercise-input"
                />
              </div>
            </div>

            <div className="doctor-exercise-input-group">
              <label className="doctor-exercise-label">Select Patient</label>
              <div className="doctor-exercise-input-wrapper">
                <Users className="doctor-exercise-input-icon" />
                <select
                  value={selectedPatient}
                  onChange={(event) => setSelectedPatient(event.target.value)}
                  className="doctor-exercise-select"
                >
                  <option value="">Choose a patient...</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!canPrescribe}
            className={`doctor-exercise-btn-submit ${!canPrescribe ? "disabled" : ""}`}
          >
            {canPrescribe ? "Prescribe Selected" : "Select Exercise & Patient"}
          </button>
        </form>
      </div>

      <div className="doctor-exercise-list">
        {loading ? (
          <p className="doctor-exercise-loading">Loading exercises...</p>
        ) : items.length === 0 ? (
          <p className="doctor-exercise-empty">No exercises found. Try a different search.</p>
        ) : (
          <motion.div
            className="doctor-exercise-grid"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.08 },
              },
            }}
            initial="hidden"
            animate="show"
          >
            {items.map((exercise) => (
              <motion.button
                key={exercise.id}
                type="button"
                onClick={() => setSelectedExercise(exercise)}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0 },
                }}
                className={`doctor-exercise-item ${
                  selectedExercise?.id === exercise.id ? "selected" : ""
                }`}
              >
                <div className="doctor-exercise-item-header">
                  <p className="doctor-exercise-item-name">{exercise.name}</p>
                  <span className="doctor-exercise-item-meta">
                    {exercise.bodyPart} · {exercise.target}
                  </span>
                </div>
                {exercise.gifUrl && (
                  <img
                    src={exercise.gifUrl}
                    alt={exercise.name}
                    className="doctor-exercise-item-image"
                  />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

