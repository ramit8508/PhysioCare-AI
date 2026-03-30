import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveActorFromRequest } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";
import { normalizeAiReportMarkdown } from "@/lib/report-format";

type SessionSummary = {
	id: string;
	createdAt: Date;
	repCount: number;
	accuracy: number;
	maxAngle: number;
	reportText: string;
};

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

async function buildCombinedGroqReport(sessions: SessionSummary[]) {
	const fallback = [
		"## Overall Progress",
		`- Total Sessions Analyzed: ${sessions.length}`,
		`- Average Accuracy: ${(
			sessions.reduce((sum, session) => sum + session.accuracy, 0) / Math.max(1, sessions.length)
		).toFixed(1)}%`,
		`- Average Repetitions: ${(
			sessions.reduce((sum, session) => sum + session.repCount, 0) / Math.max(1, sessions.length)
		).toFixed(1)}`,
		`- Best Max Angle: ${Math.max(...sessions.map((session) => session.maxAngle), 0).toFixed(1)}°`,
		"",
		"## Strengths",
		"- Session consistency is improving across the tracked period.",
		"- Accuracy trend indicates stable movement control.",
		"",
		"## Focus Areas",
		"- Prioritize range quality over speed on each repetition.",
		"- Keep posture aligned through full movement arcs.",
		"",
		"## Next Week Plan",
		"- Complete at least 4 focused sessions with controlled tempo.",
		"- Target smooth reps with full extension and stable breathing.",
	].join("\n");

	const groqKey = process.env.GROQ_API_KEY || process.env.GROQ_API;
	if (!groqKey) {
		return fallback;
	}

	try {
		const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${groqKey}`,
			},
			body: JSON.stringify({
				model: "llama-3.3-70b-versatile",
				messages: [
					{
						role: "system",
						content:
							"You are a physiotherapy assistant. Generate a professional, patient-friendly report using exactly these section headers: '## Overall Progress', '## Strengths', '## Focus Areas', '## Next Week Plan'. Under each header provide concise bullet points only. Do not use bold markers (**), numbering, or markdown other than these headers and '-' bullets.",
					},
					{
						role: "user",
						content: `Create one consolidated patient report from all sessions.\n${JSON.stringify(
							sessions.map((session) => ({
								date: session.createdAt.toISOString(),
								repCount: session.repCount,
								accuracy: session.accuracy,
								maxAngle: session.maxAngle,
								sessionReport: session.reportText,
							})),
						)}`,
					},
				],
				temperature: 0.25,
			}),
		});

		if (!response.ok) {
			return fallback;
		}

		let data: any;
		try {
			data = (await response.json()) as any;
		} catch {
			return fallback;
		}

		const text = data?.choices?.[0]?.message?.content;
		return typeof text === "string" && text.trim().length > 0
			? normalizeAiReportMarkdown(text.trim(), fallback)
			: fallback;
	} catch {
		return fallback;
	}
}

export async function GET(request: Request) {
	const session = await getSession();
	const user = session?.user as any;
	const actor = resolveActorFromRequest(request, { id: user?.id, role: user?.role }, "PATIENT");
	const isDemoPatient = actor?.role === "PATIENT" && resolveDemoPatient(String(user?.email || ""));

	if (!actor?.id || actor.role !== "PATIENT") {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	if (isDemoPatient) {
		return NextResponse.json({
			summary: {
				totalSessions: 18,
				avgAccuracy: 91.6,
				avgReps: 13.4,
				bestAngle: 124.2,
				totalMinutesEstimate: 63,
			},
			chart: [
				{ day: "Mon", score: 82 },
				{ day: "Tue", score: 85 },
				{ day: "Wed", score: 88 },
				{ day: "Thu", score: 90 },
				{ day: "Fri", score: 92 },
				{ day: "Sat", score: 94 },
				{ day: "Sun", score: 93 },
			],
			combinedReport: [
				"## Overall Progress",
				"- Session consistency is strong with 18 sessions completed.",
				"- Average form accuracy remains above 90% across the week.",
				"- Mobility range shows stable gains in shoulder and elbow movement.",
				"",
				"## Strengths",
				"- Good control at end range with fewer compensation patterns.",
				"- Repetition quality is steady at moderate intensity.",
				"- Recovery pacing between sets is appropriate.",
				"",
				"## Focus Areas",
				"- Maintain scapular stability during overhead motion.",
				"- Improve wrist alignment in final reps to reduce fatigue drift.",
				"- Keep breathing rhythm consistent during hard sets.",
				"",
				"## Next Week Plan",
				"- Complete 4 guided sessions with tempo-focused repetitions.",
				"- Add one mobility-focused day for shoulder and wrist range.",
				"- Target average session accuracy above 92%.",
			].join("\n"),
		});
	}

	const rows = await prisma.exerciseSessionRecord.findMany({
		where: { patientId: actor.id },
		orderBy: { createdAt: "asc" },
		take: 120,
	});

	const sessions: SessionSummary[] = rows.map((row) => ({
		id: row.id,
		createdAt: row.createdAt,
		repCount: Number(row.repCount || 0),
		accuracy: Number(row.accuracy || 0),
		maxAngle: Number(row.maxAngle || 0),
		reportText: String(row.reportText || ""),
	}));

	if (sessions.length === 0) {
		return NextResponse.json({
			summary: {
				totalSessions: 0,
				avgAccuracy: 0,
				avgReps: 0,
				bestAngle: 0,
				totalMinutesEstimate: 0,
			},
			chart: [],
			combinedReport: "No session data yet. Complete an exercise to generate your AI performance report.",
		});
	}

	const avgAccuracy = sessions.reduce((sum, item) => sum + item.accuracy, 0) / sessions.length;
	const avgReps = sessions.reduce((sum, item) => sum + item.repCount, 0) / sessions.length;
	const bestAngle = Math.max(...sessions.map((item) => item.maxAngle), 0);
	const totalMinutesEstimate = Math.round((sessions.length * 3.5 * 10) / 10);

	const combinedReport = await buildCombinedGroqReport(sessions);

	const chart = sessions.slice(-7).map((item) => ({
		day: new Date(item.createdAt).toLocaleDateString("en-US", { weekday: "short" }),
		score: Math.max(0, Math.min(100, Math.round(item.accuracy))),
	}));

	return NextResponse.json({
		summary: {
			totalSessions: sessions.length,
			avgAccuracy: Number(avgAccuracy.toFixed(1)),
			avgReps: Number(avgReps.toFixed(1)),
			bestAngle: Number(bestAngle.toFixed(1)),
			totalMinutesEstimate,
		},
		chart,
		combinedReport,
	});
}
