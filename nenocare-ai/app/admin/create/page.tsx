"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { UserPlus } from "lucide-react";

export default function AdminCreateDoctorPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [degrees, setDegrees] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/create-doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        degrees,
        specialization,
        experienceYears: experienceYears ? Number(experienceYears) : null,
        bio,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(payload?.error || "Failed to create doctor account.");
      return;
    }

    setMessage("Doctor account created successfully.");
    setName("");
    setEmail("");
    setPassword("");
    setDegrees("");
    setSpecialization("");
    setExperienceYears("");
    setBio("");
  };

  return (
    <DashboardLayout role="admin">
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Doctor Account</h1>
          <p className="text-sm text-muted-foreground mt-1">Only admins can create doctor accounts.</p>
        </div>

        <GlassCard className="p-6">
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid md:grid-cols-2 gap-4">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="input-modern" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className="input-modern" required />
            </div>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Temporary password" className="input-modern" required />
            <div className="grid md:grid-cols-2 gap-4">
              <input value={degrees} onChange={(e) => setDegrees(e.target.value)} placeholder="Degrees (e.g., MBBS, DPT)" className="input-modern" required />
              <input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="Specialization" className="input-modern" required />
            </div>
            <input value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} type="number" min={0} placeholder="Experience years" className="input-modern" />
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short doctor bio" className="input-modern min-h-24 resize-y" />

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-success">{message}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              <UserPlus size={16} /> {loading ? "Creating..." : "Create Doctor"}
            </button>
          </form>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
