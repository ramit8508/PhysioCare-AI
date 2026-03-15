"use client";

import { useState } from "react";
import RoleLoginForm from "@/components/RoleLoginForm";

export default function PatientAuthTabs() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSignupError(null);
    setSignupSuccess(false);
    setSignupLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/patient/signup", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setSignupError(payload.message || "Unable to create account.");
        setSignupLoading(false);
        return;
      }

      setSignupSuccess(true);
      setActiveTab("login");
    } catch (error) {
      setSignupError("Unable to create account.");
    } finally {
      setSignupLoading(false);
    }
  };

  return (
    <div>
      <div className="auth-tabs" role="tablist" aria-label="Patient access">
        <button
          type="button"
          className={`auth-tab ${activeTab === "login" ? "auth-tab--active" : ""}`}
          onClick={() => setActiveTab("login")}
          role="tab"
          aria-selected={activeTab === "login"}
        >
          Login
        </button>
        <button
          type="button"
          className={`auth-tab ${activeTab === "signup" ? "auth-tab--active" : ""}`}
          onClick={() => setActiveTab("signup")}
          role="tab"
          aria-selected={activeTab === "signup"}
        >
          Sign Up
        </button>
      </div>

      {activeTab === "login" ? (
        <RoleLoginForm role="PATIENT" callbackUrl="/patient/doctors" />
      ) : (
        <form onSubmit={handleSignup} className="auth-form">
          <input name="displayName" placeholder="Full name" className="field-input" />
          <input name="email" type="email" placeholder="Email" required className="field-input" />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            className="field-input"
          />
          {signupError ? <p className="text-sm text-red-600">{signupError}</p> : null}
          {signupSuccess ? (
            <p className="text-sm text-emerald-600">Account created. Please log in.</p>
          ) : null}
          <button type="submit" disabled={signupLoading}>
            {signupLoading ? "Creating..." : "Create Account"}
          </button>
        </form>
      )}
    </div>
  );
}
