import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getConsecutiveDaysFromSessions(sessions: Array<{ createdAt: Date }>) {
  if (!sessions.length) {
    return 0;
  }

  const daySet = new Set(sessions.map((session) => getDateKey(session.createdAt)));
  const cursor = new Date();
  let streak = 0;

  while (true) {
    const key = getDateKey(cursor);
    if (!daySet.has(key)) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function resolveDemoPatient(email: string) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const configured = String(process.env.DEMO_PATIENT_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (configured.includes(normalizedEmail)) {
    return true;
  }

  return normalizedEmail.includes("demo");
}

function buildDoctorCardPayload(doctors: Array<{
  id: string;
  email: string;
  doctorProfile: {
    fullName: string | null;
    specialization: string | null;
    degrees: string | null;
    experienceYears: number | null;
    bio: string | null;
  } | null;
  slotsAsDoctor: Array<{ id: string; startAt: Date }>;
}>) {
  return doctors.map((doctor) => ({
    id: doctor.id,
    email: doctor.email,
    fullName: doctor.doctorProfile?.fullName || doctor.email.split("@")[0],
    specialization: doctor.doctorProfile?.specialization || "General Rehabilitation",
    degrees: doctor.doctorProfile?.degrees || "Not specified",
    experienceYears: doctor.doctorProfile?.experienceYears ?? null,
    bio: doctor.doctorProfile?.bio || "",
    nextAvailableAt: doctor.slotsAsDoctor[0]?.startAt ?? null,
    hasAvailability: doctor.slotsAsDoctor.length > 0,
  }));
}

function buildDemoDoctorFallback() {
  return [
    {
      id: "demo-doc-1",
      email: "ananya.sharma@physiocare.ai",
      fullName: "Dr. Ananya Sharma",
      specialization: "Neuro Rehabilitation",
      degrees: "MPT (Neuro), BPT",
      experienceYears: 9,
      bio: "Specializes in post-stroke motor recovery and gait retraining.",
      nextAvailableAt: null,
      hasAvailability: true,
    },
    {
      id: "demo-doc-2",
      email: "rahul.mehta@physiocare.ai",
      fullName: "Dr. Rahul Mehta",
      specialization: "Orthopedic Physiotherapy",
      degrees: "MPT (Ortho), BPT",
      experienceYears: 7,
      bio: "Focuses on shoulder, elbow and wrist mobility restoration.",
      nextAvailableAt: null,
      hasAvailability: true,
    },
    {
      id: "demo-doc-3",
      email: "priya.nair@physiocare.ai",
      fullName: "Dr. Priya Nair",
      specialization: "Sports & Functional Rehab",
      degrees: "MPT (Sports), BPT",
      experienceYears: 6,
      bio: "Expert in strength progression and movement quality optimization.",
      nextAvailableAt: null,
      hasAvailability: false,
    },
  ];
}

export async function GET() {
  const session = await getSession();
  const user = session?.user as any;

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isDemoPatient = user.role === "PATIENT" && resolveDemoPatient(user.email || "");

  const doctors = await prisma.user.findMany({
    where: { role: "DOCTOR", isBlacklisted: false },
    select: {
      id: true,
      email: true,
      doctorProfile: {
        select: {
          fullName: true,
          specialization: true,
          degrees: true,
          experienceYears: true,
          bio: true,
        },
      },
      slotsAsDoctor: {
        where: { status: "AVAILABLE", startAt: { gte: new Date() } },
        orderBy: { startAt: "asc" },
        take: 1,
        select: { id: true, startAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  let stats = {
    prescriptions: 0,
    sessions: 0,
    avgAccuracy: 0,
    pendingAppointments: 0,
    approvedAppointments: 0,
  };

  if (user.role === "PATIENT") {
    const [appointments, prescriptions, sessions] = await Promise.all([
      prisma.appointment.findMany({
        where: { patientId: user.id },
        include: {
          slot: {
            select: {
              startAt: true,
              endAt: true,
            },
          },
        },
      }),
      prisma.exercisePrescription.findMany({ where: { patientId: user.id }, include: { exercises: true } }),
      prisma.exerciseSessionRecord.findMany({ where: { patientId: user.id }, orderBy: { createdAt: "desc" } }),
    ]);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - 6);

    const avgAccuracy = sessions.length
      ? Number((sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / sessions.length).toFixed(1))
      : 0;

    const sessionsToday = sessions.filter((s) => s.createdAt >= todayStart).length;
    const sessionsThisWeek = sessions.filter((s) => s.createdAt >= weekStart).length;
    const consecutiveDays = getConsecutiveDaysFromSessions(sessions);

    const totalExercises = prescriptions.reduce((sum, prescription) => sum + (prescription.exercises?.length || 0), 0);
    const completedExercisesEstimate = Math.min(totalExercises, sessions.length);
    const recoveryProgress = totalExercises
      ? Math.min(100, Math.round((completedExercisesEstimate / totalExercises) * 100))
      : 0;

    const latestPrescription = prescriptions[0] || null;
    const latestExercises = Array.isArray(latestPrescription?.exercises) ? latestPrescription.exercises : [];
    const todayCompletedCount = Math.min(sessionsToday, latestExercises.length);

    const todayExercises = latestExercises.map((exercise, index) => ({
      id: exercise.id,
      name: exercise.name,
      reps: `${exercise.sets}×${exercise.reps}`,
      intensity: "Medium",
      status: index < todayCompletedCount ? "completed" : "pending",
    }));

    const nextAppointment = appointments
      .filter((appointment) => appointment.slot?.startAt && appointment.slot.startAt >= now)
      .sort((a, b) => {
        const aTime = a.slot?.startAt ? a.slot.startAt.getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.slot?.startAt ? b.slot.startAt.getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })[0];

    const nextSession = nextAppointment
      ? {
          title: latestExercises[0]?.name || "Physiotherapy Session",
          scheduledAt: nextAppointment.slot?.startAt || null,
          exerciseCount: latestExercises.length,
          approxMinutes: Math.max(10, latestExercises.length * 3),
        }
      : {
          title: latestExercises[0]?.name || "No session scheduled",
          scheduledAt: null,
          exerciseCount: latestExercises.length,
          approxMinutes: latestExercises.length ? Math.max(10, latestExercises.length * 3) : 0,
        };

    const pendingAppointments = appointments.filter((a) => a.status === "PENDING").length;
    const approvedAppointments = appointments.filter((a) => a.status === "APPROVED").length;

    stats = {
      prescriptions: prescriptions.length,
      sessions: sessions.length,
      avgAccuracy,
      pendingAppointments,
      approvedAppointments,
    };

    if (isDemoPatient) {
      const mappedDoctors = buildDoctorCardPayload(doctors);
      return NextResponse.json({
        isDemoPatient: true,
        stats,
        dashboard: {
          sessionsThisWeek: 5,
          sessionsWeeklyTarget: 7,
          recoveryProgress: 73,
          formAccuracy: 92,
          consecutiveDays: 12,
          todayExercises: [
            { id: "demo-1", name: "Shoulder Flexion", reps: "3×12", status: "pending", intensity: "Medium" },
            { id: "demo-2", name: "Elbow Extension", reps: "3×10", status: "completed", intensity: "Hard" },
            { id: "demo-3", name: "Wrist Rotation", reps: "2×15", status: "pending", intensity: "Light" },
            { id: "demo-4", name: "Grip Strength", reps: "3×8", status: "completed", intensity: "Hard" },
          ],
          nextSession: {
            title: "Shoulder Mobility",
            scheduledAt: null,
            exerciseCount: 5,
            approxMinutes: 15,
            demoTimeLabel: "Today, 2:00 PM",
          },
        },
        availableDoctors: mappedDoctors.length > 0 ? mappedDoctors : buildDemoDoctorFallback(),
      });
    }

    return NextResponse.json({
      isDemoPatient: false,
      stats,
      dashboard: {
        sessionsThisWeek,
        sessionsWeeklyTarget: 7,
        recoveryProgress,
        formAccuracy: Math.round(avgAccuracy),
        consecutiveDays,
        todayExercises,
        nextSession,
      },
      availableDoctors: buildDoctorCardPayload(doctors),
    });
  }

  return NextResponse.json({
    isDemoPatient: false,
    stats,
    availableDoctors: buildDoctorCardPayload(doctors),
  });
}
