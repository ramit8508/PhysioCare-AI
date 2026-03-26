"use client";

import { motion } from "framer-motion";
import { BrainCircuit, ShieldCheck, Activity, Zap, BarChart3, Video, ArrowRight, CheckCircle2, Users, TrendingUp, Rocket, Lock, Clock, Eye } from "lucide-react";
import { GlassCard } from "@/components/shared/GlassCard";
import Link from "next/link";
import { useState } from "react";

const features = [
  { icon: Activity, title: "Real-Time Tracking", desc: "AI-powered pose estimation monitors every movement with clinical precision.", color: "from-blue-500 to-cyan-500" },
  { icon: Video, title: "Tele-Supervision", desc: "Doctors review sessions remotely with AI-generated clinical reports.", color: "from-purple-500 to-pink-500" },
  { icon: BarChart3, title: "Recovery Analytics", desc: "Track progress with detailed mobility trends and performance metrics.", color: "from-green-500 to-emerald-500" },
  { icon: Zap, title: "Instant Feedback", desc: "Corrective guidance during exercises to prevent injury and optimize recovery.", color: "from-orange-500 to-red-500" },
];

const useCases = [
  {
    role: "Patient",
    title: "Your Digital Coach",
    benefits: ["Real-time form corrections", "AI-powered feedback", "Progress tracking", "Doctor oversight"],
    icon: Users,
  },
  {
    role: "Doctor",
    title: "Remote Supervision",
    benefits: ["Patient activity monitoring", "AI-generated reports", "Treatment optimization", "Data-driven decisions"],
    icon: Eye,
  },
  {
    role: "Clinic",
    title: "Scale & Automate",
    benefits: ["Reduce operational costs", "Increase patient capacity", "Improve compliance", "Better outcomes"],
    icon: TrendingUp,
  },
];

const roles = ["Patient", "Doctor", "Admin"] as const;

export default function LandingPage() {
  const [activeRole, setActiveRole] = useState<string>("Patient");

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Nav */}
      <nav className="sticky top-0 z-40 backdrop-blur-md border-b border-white/5 bg-background/80">
        <div className="flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5 font-bold text-xl tracking-tighter">
            <BrainCircuit className="text-cyan-400 w-8 h-8" />
            <span className="text-gradient">NEROCARE AI</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Role Switcher */}
            <div className="hidden md:flex items-center bg-secondary/50 rounded-full p-1 relative">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className="relative px-4 py-1.5 text-sm font-medium z-10 transition-colors duration-200"
                  style={{ color: activeRole === role ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))" }}
                >
                  {activeRole === role && (
                    <motion.div
                      layoutId="rolePill"
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      style={{ zIndex: -1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  {role}
                </button>
              ))}
            </div>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
            <Link
              href="/signup"
              className="btn-primary px-6 py-2 text-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 md:pt-32 pb-32 px-6 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl rounded-full" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
          className="relative max-w-5xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-8">
            <ShieldCheck size={14} /> HIPAA COMPLIANT • CLINICAL-GRADE
          </div>

          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8" style={{ letterSpacing: "-0.04em" }}>
            Recovery Through<br />
            <span className="text-gradient">Intelligent Motion</span>
          </h1>

          <p className="max-w-3xl mx-auto text-muted-foreground text-lg md:text-xl mb-12 leading-relaxed">
            NeroCare AI combines computer vision, artificial intelligence, and clinical expertise to revolutionize neurological rehabilitation. Real-time form correction, personalized feedback, and remote doctor supervision in one unified platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/signup"
              className="btn-primary px-8 py-4 text-base justify-center"
            >
              <Rocket size={18} />
              Start Free Trial
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/patient"
              className="btn-secondary px-8 py-4 text-base justify-center"
            >
              Watch Demo
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
            {[
              { value: "60-80%", label: "Exercise Compliance Problem" },
              { value: "92%", label: "Form Accuracy Detection" },
              { value: "10x", label: "Faster Recovery Tracking" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <div className="text-center">
                  <p className="text-3xl font-bold text-cyan-400 mb-1">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ letterSpacing: "-0.03em" }}>
            Powerful Features for Every Stakeholder
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Enterprise-grade rehabilitation with cutting-edge AI and clinical supervision
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => {
            const IconComponent = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className={`glass-card p-7 bg-gradient-to-br ${f.color} bg-opacity-5 hover:border-white/12 transition-all h-full`}>
                  <div className={`p-4 rounded-xl bg-gradient-to-br ${f.color} bg-opacity-20 w-fit mb-5`}>
                    <IconComponent size={24} className="text-white/70" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-3">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ letterSpacing: "-0.03em" }}>
            Built for Every Role
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tailored experiences for patients, doctors, and clinic administrators
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {useCases.map((useCase, i) => {
            const IconComponent = useCase.icon;
            return (
              <motion.div
                key={useCase.role}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="glass-card p-8 rounded-2xl">
                  <div className="p-4 rounded-xl bg-primary/15 w-fit mb-6">
                    <IconComponent size={28} className="text-cyan-400" />
                  </div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">{useCase.role}</p>
                  <h3 className="text-2xl font-bold text-foreground mb-6">{useCase.title}</h3>
                  <ul className="space-y-3 mb-8">
                    {useCase.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-3">
                        <CheckCircle2 size={18} className="text-cyan-400 mt-1 shrink-0" />
                        <span className="text-sm text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={useCase.role === "Patient" ? "/signup?role=patient" : useCase.role === "Doctor" ? "/signup?role=doctor" : "/signup?role=admin"}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Learn more <ArrowRight size={16} />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Security & Trust */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ letterSpacing: "-0.03em" }}>
            Enterprise Security & Compliance
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Your patient data is protected by industry-leading security standards
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: Lock, title: "256-bit Encryption", desc: "End-to-end encryption for all patient data" },
            { icon: ShieldCheck, title: "HIPAA Compliant", desc: "Full healthcare compliance standards" },
            { icon: Clock, title: "99.9% Uptime", desc: "Enterprise-grade reliability" },
          ].map((item, i) => {
            const IconComponent = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="glass-card p-6">
                  <div className="p-3 rounded-lg bg-cyan-500/10 w-fit mb-4">
                    <IconComponent size={22} className="text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="glass-card p-12 md:p-16 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Transform Rehabilitation?</h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto">
              Join clinics and patients worldwide in revolutionizing exercise compliance and recovery outcomes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="btn-primary px-10 py-4 text-base justify-center">
                Start Free Trial
              </Link>
              <a href="mailto:contact@nerocare.ai" className="btn-secondary px-10 py-4 text-base justify-center">
                Contact Sales
              </a>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/6 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="flex items-center gap-2 col-span-1 md:col-span-2">
              <BrainCircuit className="text-cyan-400 w-6 h-6" />
              <span className="font-bold">© 2026 NeroCare AI</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
          <div className="border-t border-white/6 pt-8 text-center text-sm text-muted-foreground">
            <p>NeroCare AI is a clinically-validated rehabilitation platform for neurological recovery.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
