import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProgressChart from "./ProgressChart";
import { TrendingUp, Activity, Target, Zap, Award } from "lucide-react";

const formatDate = (value: Date) =>
  value.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function PatientProgressPage() {
  const session = await getSession();
  if (!session || session.role !== "PATIENT") {
    redirect("/login");
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const prismaAny = prisma as any;
  const records = (await prismaAny.exerciseSessionRecord.findMany({
    where: {
      patientId: session.userId,
      createdAt: { gte: sevenDaysAgo },
      accuracy: { not: null },
      maxAngle: { not: null },
    },
    orderBy: { createdAt: "asc" },
  })) as Array<any>;

  const buckets = new Map<string, { accuracySum: number; maxAngleSum: number; count: number }>();

  records.forEach((record) => {
    const date = formatDate(new Date(record.createdAt));
    const bucket = buckets.get(date) || { accuracySum: 0, maxAngleSum: 0, count: 0 };
    bucket.accuracySum += record.accuracy ?? 0;
    bucket.maxAngleSum += record.maxAngle ?? 0;
    bucket.count += 1;
    buckets.set(date, bucket);
  });

  const data = Array.from(buckets.entries()).map(([date, bucket]) => ({
    date,
    accuracy: Math.round(bucket.accuracySum / bucket.count),
    maxAngle: Math.round(bucket.maxAngleSum / bucket.count),
  }));

  // Calculate stats
  const avgAccuracy = data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.accuracy, 0) / data.length) : 0;
  const avgAngle = data.length > 0 ? Math.round(data.reduce((sum, d) => sum + d.maxAngle, 0) / data.length) : 0;
  const maxAccuracy = data.length > 0 ? Math.max(...data.map((d) => d.accuracy)) : 0;
  const maxAngle = data.length > 0 ? Math.max(...data.map((d) => d.maxAngle)) : 0;

  const improvement =
    data.length > 1
      ? Math.round(((data[data.length - 1].accuracy - data[0].accuracy) / (data[0].accuracy || 1)) * 100)
      : 0;

  return (
    <main className="patient-shell">
      <div className="patient-main">
        {/* Header */}
        <div className="patient-header">
          <h1 className="patient-header-title">Your Progress</h1>
          <p className="patient-header-subtitle">
            Track your recovery journey with real-time analytics and performance metrics.
          </p>
        </div>

        {/* Stats Grid */}
        {data.length > 0 && (
          <div className="patient-stats">
            <div className="patient-stat-card">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Activity size={18} style={{ color: "#6366f1" }} />
                <div className="patient-stat-label">Accuracy</div>
              </div>
              <div className="patient-stat-value" style={{ color: "#6366f1" }}>
                {avgAccuracy}%
              </div>
            </div>

            <div className="patient-stat-card">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Target size={18} style={{ color: "#8b5cf6" }} />
                <div className="patient-stat-label">Max Range</div>
              </div>
              <div className="patient-stat-value" style={{ color: "#8b5cf6" }}>
                {avgAngle}°
              </div>
            </div>

            <div className="patient-stat-card">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <TrendingUp size={18} style={{ color: "#06b6d4" }} />
                <div className="patient-stat-label">Improvement</div>
              </div>
              <div
                className="patient-stat-value"
                style={{ color: improvement >= 0 ? "#06b6d4" : "#ef4444" }}
              >
                {improvement > 0 ? "+" : ""}
                {improvement}%
              </div>
            </div>

            <div className="patient-stat-card">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <Award size={18} style={{ color: "#16a34a" }} />
                <div className="patient-stat-label">Best Accuracy</div>
              </div>
              <div className="patient-stat-value" style={{ color: "#16a34a" }}>
                {maxAccuracy}%
              </div>
            </div>
          </div>
        )}

        {/* Chart Section */}
        {data.length === 0 ? (
          <div className="patient-empty-state">
            <div className="patient-empty-icon">📊</div>
            <div className="patient-empty-title">No Progress Data Yet</div>
            <p className="patient-empty-subtitle">
              Complete your exercises to see performance analytics and progress tracking.
            </p>
            <Link href="/patient/exercises" className="patient-btn patient-btn-primary">
              <Zap size={16} />
              Start Your Exercises
            </Link>
          </div>
        ) : (
          <div className="patient-section">
            <h2 className="patient-section-title">7-Day Performance Trend</h2>
            <div className="patient-progress-container">
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8", marginBottom: "4px", textTransform: "uppercase" }}>
                  📈 Form Accuracy vs Range of Motion
                </div>
                <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Track how accurately you're performing exercises and your improving range of motion over the past 7 days.
                </p>
              </div>
              <div className="patient-progress-chart">
                <ProgressChart data={data} />
              </div>
            </div>
          </div>
        )}

        {/* Performance Tips */}
        {data.length > 0 && (
          <div className="patient-section">
            <h2 className="patient-section-title">Performance Tips</h2>
            <div style={{ display: "grid", gap: "16px" }}>
              <div
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "20px",
                  borderLeft: "4px solid #06b6d4",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginBottom: "8px" }}>
                  ✨ Consistency is Key
                </div>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
                  You've completed {records.length} exercise sessions in the past week. Keep up the great work!
                </p>
              </div>

              <div
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "20px",
                  borderLeft: "4px solid #8b5cf6",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginBottom: "8px" }}>
                  🎯 Form Accuracy
                </div>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
                  {avgAccuracy > 85
                    ? "Excellent form! Your exercises are very accurate. Keep maintaining this quality."
                    : avgAccuracy > 70
                      ? "Good form! Focus on improving accuracy by 5-10% for better results."
                      : "Focus on form accuracy. Review the exercise guide and slow down your movements."}
                </p>
              </div>

              <div
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "20px",
                  borderLeft: "4px solid #06b6d4",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", marginBottom: "8px" }}>
                  📈 Range of Motion
                </div>
                <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>
                  Your average range of motion is {avgAngle}°.{" "}
                  {improvement > 0
                    ? "Great improvement! You're increasing your flexibility."
                    : "Focus on gradually increasing your range as you build confidence."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px", marginTop: "32px", marginBottom: "20px" }}>
          <Link href="/patient/exercises" className="patient-btn patient-btn-primary">
            <Zap size={16} />
            Continue Exercises
          </Link>
          <Link href="/patient/doctors" className="patient-btn patient-btn-secondary">
            <Activity size={16} />
            Book Appointment
          </Link>
        </div>
      </div>
    </main>
  );
}

