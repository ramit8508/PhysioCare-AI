"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/shared/DashboardLayout";
import { GlassCard } from "@/components/shared/GlassCard";
import { Search, Plus, X, UserPlus, Mail, Lock, Shield, Users, Activity, TrendingUp, AlertCircle, ChevronRight, Filter, Download, Eye, Trash2, ToggleRight } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminPanel() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingDoctorCreate, setLoadingDoctorCreate] = useState(false);
  const [doctorName, setDoctorName] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [doctorPassword, setDoctorPassword] = useState("");
  const [doctorDegrees, setDoctorDegrees] = useState("");
  const [doctorSpecialization, setDoctorSpecialization] = useState("");
  const [doctorExperienceYears, setDoctorExperienceYears] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        return { items: [] };
      }
      return response.json();
    },
  });

  const { data: reportsData } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const response = await fetch("/api/admin/reports");
      if (!response.ok) {
        return { items: [] };
      }
      return response.json();
    },
  });

  const users = useMemo(() => (Array.isArray(usersData?.items) ? usersData.items : []), [usersData]);
  const reports = useMemo(() => (Array.isArray(reportsData?.items) ? reportsData.items : []), [reportsData]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filtered = users;
    
    if (q) {
      filtered = filtered.filter((user: any) => {
        const displayName = String(user.displayName || "").toLowerCase();
        const email = String(user.email || "").toLowerCase();
        return displayName.includes(q) || email.includes(q);
      });
    }

    if (filterRole !== "all") {
      filtered = filtered.filter((user: any) => user.role === filterRole);
    }

    return filtered;
  }, [users, search, filterRole]);

  const stats = [
    { label: "Total Users", value: users.length, icon: Users, color: "from-blue-500 to-cyan-500" },
    { label: "Doctors", value: users.filter((u: any) => u.role === "DOCTOR").length, icon: Activity, color: "from-green-500 to-emerald-500" },
    { label: "Patients", value: users.filter((u: any) => u.role === "PATIENT").length, icon: TrendingUp, color: "from-purple-500 to-pink-500" },
    { label: "Blocked Users", value: users.filter((u: any) => u.isBlacklisted).length, icon: AlertCircle, color: "from-orange-500 to-red-500" }
  ];

  const toggleBlacklist = async (userId: string, nextValue: boolean) => {
    const response = await fetch(`/api/admin/users/${userId}/blacklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlacklisted: nextValue }),
    });

    if (response.ok) {
      await refetchUsers();
    }
  };

  const createDoctor = async () => {
    if (!doctorEmail || !doctorPassword) {
      return;
    }

    setLoadingDoctorCreate(true);
    const response = await fetch("/api/admin/create-doctor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: doctorName,
        email: doctorEmail,
        password: doctorPassword,
        degrees: doctorDegrees,
        specialization: doctorSpecialization,
        experienceYears: doctorExperienceYears ? Number(doctorExperienceYears) : null,
      }),
    });
    setLoadingDoctorCreate(false);

    if (response.ok) {
      setDoctorName("");
      setDoctorEmail("");
      setDoctorPassword("");
      setDoctorDegrees("");
      setDoctorSpecialization("");
      setDoctorExperienceYears("");
      setModalOpen(false);
      await refetchUsers();
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <div>
              <h1 className="text-4xl font-bold text-foreground" style={{ letterSpacing: "-0.04em" }}>
                Admin Control Center
              </h1>
              <p className="text-muted-foreground mt-2">Manage users, access, and platform analytics</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary px-6 h-fit shrink-0"
            >
              <UserPlus size={18} />
              Create Doctor
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat, i) => {
            const IconComponent = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="stat-card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                      <p className="text-3xl font-bold font-mono text-foreground">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl bg-linear-to-br ${stat.color} bg-opacity-10`}>
                      <IconComponent size={18} className="text-white/70" />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* User Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="glass-card overflow-hidden">
            {/* Header */}
            <div className="border-b border-white/6 px-6 py-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">User Management</h2>
                  <p className="text-sm text-muted-foreground mt-1">View, manage, and control user access</p>
                </div>
                <button className="btn-secondary px-4 text-sm">
                  <Download size={16} />
                  Export CSV
                </button>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-modern pl-11 w-full"
                  />
                </div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="input-modern px-4 font-medium"
                >
                  <option value="all">All Roles</option>
                  <option value="PATIENT">Patients</option>
                  <option value="DOCTOR">Doctors</option>
                  <option value="ADMIN">Admins</option>
                </select>
              </div>
            </div>

            {/* User List */}
            <div className="divide-y divide-white/4">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center">
                  <Users size={40} className="mx-auto text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No users found matching your criteria</p>
                </div>
              ) : (
                filteredUsers.map((user: any, idx: number) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="px-6 py-4 hover:bg-white/2 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`h-11 w-11 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                          user.role === "ADMIN" ? "bg-purple-500/20 text-purple-400" :
                          user.role === "DOCTOR" ? "bg-blue-500/20 text-blue-400" :
                          "bg-green-500/20 text-green-400"
                        }`}>
                          {(user.displayName?.charAt(0) || user.email.charAt(0)).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {user.displayName || user.email}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-4">
                        {/* Role Badge */}
                        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0 ${
                          user.role === "ADMIN" ? "bg-purple-500/15 text-purple-400" :
                          user.role === "DOCTOR" ? "bg-blue-500/15 text-blue-400" :
                          "bg-green-500/15 text-green-400"
                        }`}>
                          {user.role}
                        </span>

                        {/* Status Badge */}
                        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0 ${
                          user.isBlacklisted
                            ? "bg-red-500/15 text-red-400"
                            : "bg-green-500/15 text-green-400"
                        }`}>
                          {user.isBlacklisted ? "Blocked" : "Active"}
                        </span>

                        {/* Joined Date */}
                        <span className="hidden sm:inline text-xs text-muted-foreground shrink-0">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>

                        {/* Actions */}
                        {user.role !== "ADMIN" && (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => toggleBlacklist(user.id, !user.isBlacklisted)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.isBlacklisted
                                  ? "bg-green-500/15 text-green-400 hover:bg-green-500/20"
                                  : "bg-red-500/15 text-red-400 hover:bg-red-500/20"
                              }`}
                              title={user.isBlacklisted ? "Unblock user" : "Block user"}
                            >
                              <ToggleRight size={16} />
                            </button>
                            <button className="p-2 rounded-lg bg-slate-700/30 text-muted-foreground hover:bg-slate-700/50 transition-colors">
                              <Eye size={16} />
                            </button>
                          </div>
                        )}
                        
                        {user.role === "ADMIN" && (
                          <span className="text-xs text-muted-foreground">Protected</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Reports Section */}
        {reports.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-foreground mb-6">Recent AI Reports & Sessions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {reports.slice(0, 8).map((report: any) => (
                  <div key={report.id} className="glass-subtle p-4 rounded-xl hover:border-white/20 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{report.patientName || report.patientEmail}</p>
                        <p className="text-xs text-muted-foreground truncate">{report.exerciseName}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Accuracy</p>
                        <p className="text-sm font-bold text-cyan-400">{Number(report.accuracy || 0).toFixed(0)}%</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Reps</p>
                        <p className="text-sm font-bold text-cyan-400">{report.repCount || 0}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-2 text-center">
                        <p className="text-xs text-muted-foreground">Doctor</p>
                        <p className="text-xs font-bold text-cyan-400 truncate">{report.doctorEmail.split("@")[0]}</p>
                      </div>
                    </div>

                    {report.videoUrl && (
                      <a
                        href={report.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                      >
                        View Video <ChevronRight size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Create Doctor Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
            onClick={(event) => event.stopPropagation()}
          >
            <GlassCard className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Create Doctor Account</h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <UserPlus size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(event) => setDoctorName(event.target.value)}
                    placeholder="Full name"
                    className="input-modern pl-12"
                  />
                </div>

                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    value={doctorEmail}
                    onChange={(event) => setDoctorEmail(event.target.value)}
                    placeholder="Email address"
                    className="input-modern pl-12"
                  />
                </div>

                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="password"
                    value={doctorPassword}
                    onChange={(event) => setDoctorPassword(event.target.value)}
                    placeholder="Temporary password"
                    className="input-modern pl-12"
                  />
                </div>

                <div className="relative">
                  <Shield size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={doctorDegrees}
                    onChange={(event) => setDoctorDegrees(event.target.value)}
                    placeholder="Degrees (e.g., MD, PT)"
                    className="input-modern pl-12"
                  />
                </div>

                <input
                  type="text"
                  value={doctorSpecialization}
                  onChange={(event) => setDoctorSpecialization(event.target.value)}
                  placeholder="Specialization"
                  className="input-modern"
                />

                <input
                  type="number"
                  min={0}
                  value={doctorExperienceYears}
                  onChange={(event) => setDoctorExperienceYears(event.target.value)}
                  placeholder="Years of experience"
                  className="input-modern"
                />

                <button
                  onClick={createDoctor}
                  disabled={loadingDoctorCreate}
                  className="btn-primary w-full justify-center py-3 mt-6"
                >
                  {loadingDoctorCreate ? "Creating..." : "Create Doctor Account"}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}
