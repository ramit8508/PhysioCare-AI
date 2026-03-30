"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BrainCircuit, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import Link from "next/link";

export default function SignupPage() {
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpVerificationToken, setOtpVerificationToken] = useState("");
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

  const resetOtpState = () => {
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
    setOtpVerificationToken("");
    setOtpMessage(null);
  };

  const handleSendOtp = async () => {
    setError(null);

    if (!emailLooksValid) {
      setOtpMessage("Enter a valid email first.");
      return;
    }

    setSendingOtp(true);
    setOtpMessage(null);

    const response = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload = await response.json().catch(() => ({}));

    setSendingOtp(false);

    if (!response.ok) {
      setOtpMessage(payload?.error || "Failed to send OTP.");
      return;
    }

    setOtpSent(true);
    setOtpVerified(false);
    setOtpVerificationToken("");
    setOtpMessage("OTP sent to your email.");
  };

  const handleVerifyOtp = async () => {
    setError(null);

    if (!otpSent) {
      setOtpMessage("Request OTP first.");
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpMessage("Enter valid 6-digit OTP.");
      return;
    }

    setVerifyingOtp(true);
    setOtpMessage(null);

    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const payload = await response.json().catch(() => ({}));

    setVerifyingOtp(false);

    if (!response.ok) {
      setOtpVerified(false);
      setOtpVerificationToken("");
      setOtpMessage(payload?.error || "Invalid OTP.");
      return;
    }

    setOtpVerified(true);
    setOtpVerificationToken(String(payload.verificationToken || ""));
    setOtpMessage("Email verified successfully.");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!otpVerified || !otpVerificationToken) {
      setError("Please verify your email with OTP before signup.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role: "PATIENT",
        otpVerificationToken,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload?.error || "Failed to create account.");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      role: "PATIENT",
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Account created, but login failed. Please sign in.");
      return;
    }

    router.push("/patient");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-150 h-100 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <BrainCircuit className="text-primary w-8 h-8" />
          <span className="font-bold text-xl tracking-tighter text-foreground">PHYSIOCARE AI</span>
        </div>

        <GlassCard className="p-8">
          <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">Create Patient Account</h1>
          <p className="text-sm text-muted-foreground mb-8">Doctors are created by admins only.</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary/50 border border-white/6 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>

            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => {
                  const nextEmail = event.target.value;
                  setEmail(nextEmail);
                  if (otpSent || otpVerified || otpVerificationToken) {
                    resetOtpState();
                  }
                }}
                className="w-full pl-11 pr-30 py-3 rounded-xl bg-secondary/50 border border-white/6 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || !emailLooksValid}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-semibold disabled:opacity-50"
              >
                {sendingOtp ? "Sending..." : otpSent ? "Resend OTP" : "Get OTP"}
              </button>
            </div>

            <div className="relative flex gap-2">
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full pl-4 pr-4 py-3 rounded-xl bg-secondary/50 border border-white/6 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                disabled={!otpSent || otpVerified}
              />
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={!otpSent || otpVerified || verifyingOtp || otp.length !== 6}
                className="px-3 py-2 rounded-xl bg-primary/15 text-primary text-xs font-semibold disabled:opacity-50"
              >
                {otpVerified ? "Verified" : verifyingOtp ? "Verifying..." : "Verify OTP"}
              </button>
            </div>

            {otpMessage && (
              <div className={`rounded-xl px-4 py-2 text-xs ${otpVerified ? "border border-success/30 bg-success/10 text-success" : "border border-white/10 bg-secondary/30 text-muted-foreground"}`}>
                {otpMessage}
              </div>
            )}

            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full pl-11 pr-11 py-3 rounded-xl bg-secondary/50 border border-white/6 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !otpVerified}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create Account"} <ArrowRight size={16} />
            </button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">Sign in</Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
