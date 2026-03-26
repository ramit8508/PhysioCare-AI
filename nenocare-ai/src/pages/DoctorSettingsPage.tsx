"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";

export default function DoctorSettingsPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [degrees, setDegrees] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const response = await fetch("/api/doctor/profile");
      const payload = await response.json().catch(() => ({}));
      setLoading(false);

      if (!response.ok) {
        setError(payload?.error || "Failed to load profile");
        return;
      }

      const item = payload?.item || {};
      setFullName(item.fullName || "");
      setEmail(item.email || "");
      setSpecialization(item.specialization || "");
      setDegrees(item.degrees || "");
      setExperienceYears(item.experienceYears ?? "");
      setBio(item.bio || "");
    };

    load();
  }, []);

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/doctor/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        specialization,
        degrees,
        experienceYears: experienceYears === "" ? null : Number(experienceYears),
        bio,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setError(payload?.error || "Failed to update profile.");
      return;
    }

    setMessage("Profile updated successfully.");
  };

  const onChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setChangingPassword(true);
    setPasswordError(null);
    setPasswordMessage(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangingPassword(false);
      setPasswordError("All password fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangingPassword(false);
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    const response = await fetch("/api/doctor/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const payload = await response.json().catch(() => ({}));
    setChangingPassword(false);

    if (!response.ok) {
      setPasswordError(payload?.error || "Failed to change password.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Password changed successfully.");
  };

  return (
    <DashboardLayout role="doctor">
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Doctor Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Update your profile details shown to patients.</p>
        </div>

        <GlassCard className="p-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading profile...</p>
          ) : (
            <form className="space-y-4" onSubmit={onSave}>
              <div className="grid md:grid-cols-2 gap-4">
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="input-modern" />
                <input value={email} disabled className="input-modern opacity-70" />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <input value={specialization} onChange={(e) => setSpecialization(e.target.value)} placeholder="Specialization" className="input-modern" required />
                <input value={degrees} onChange={(e) => setDegrees(e.target.value)} placeholder="Degrees" className="input-modern" required />
              </div>

              <input
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="Years of experience"
                className="input-modern"
              />

              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio" className="input-modern min-h-28 resize-y" />

              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-success">{message}</p>}

              <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Change Password</h2>
          <form className="space-y-4" onSubmit={onChangePassword}>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="input-modern"
              required
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="input-modern"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="input-modern"
              required
            />

            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            {passwordMessage && <p className="text-sm text-success">{passwordMessage}</p>}

            <button type="submit" disabled={changingPassword} className="btn-primary w-full justify-center">
              {changingPassword ? "Changing..." : "Change Password"}
            </button>
          </form>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
