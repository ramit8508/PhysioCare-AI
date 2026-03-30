"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BrainCircuit, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import Link from "next/link";

const roles = ["Patient", "Doctor", "Admin"] as const;

export default function LoginPage() {
  const [role, setRole] = useState<string>("Patient");
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      role,
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid credentials. Please try again.");
      return;
    }

    const target = role.toLowerCase() === "doctor"
      ? "/doctor"
      : role.toLowerCase() === "admin"
        ? "/admin"
        : "/patient";
    router.push(target);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-150 h-100 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <BrainCircuit className="text-primary w-8 h-8" />
          <span className="font-bold text-xl tracking-tighter text-foreground">PHYSIOCARE AI</span>
        </div>

        <GlassCard className="p-8">
          <h1 className="text-2xl font-bold text-foreground mb-1 tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-8">Sign in to continue your recovery journey</p>

          {/* Role Toggle */}
          <div className="flex items-center bg-secondary/50 rounded-full p-1 mb-8 relative">
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className="relative flex-1 px-4 py-2 text-sm font-medium z-10 transition-colors duration-200"
                style={{ color: role === r ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))" }}
              >
                {role === r && (
                  <motion.div
                    layoutId="loginRole"
                    className="absolute inset-0 bg-primary rounded-full"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                {r}
              </button>
            ))}
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-secondary/50 border border-white/6 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
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
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                <input type="checkbox" className="rounded border-white/10 bg-secondary/50" />
                Remember me
              </label>
              <a href="#" className="text-primary hover:text-primary/80 font-medium transition-colors">Forgot?</a>
            </div>
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"} <ArrowRight size={16} />
            </button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">Sign up</Link>
          </p>
        </GlassCard>
      </motion.div>
    </div>
  );
}
