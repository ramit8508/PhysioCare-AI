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

type RecoveryPrediction = {
	targetMobilityPercent: number;
	estimatedDaysToTarget: number;
	onTrack: boolean;
	confidence: "low" | "medium" | "high";
	reasoning: string;
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

function linearRegressionTrend(values: number[]) {
	if (values.length <= 1) {
		return 0;
	}

	const n = values.length;
	const meanX = (n - 1) / 2;
	const meanY = values.reduce((sum, value) => sum + value, 0) / n;

	let numerator = 0;
	let denominator = 0;
	for (let i = 0; i < n; i += 1) {
		const x = i - meanX;
		const y = values[i] - meanY;
		numerator += x * y;
		denominator += x * x;
	}

	return denominator === 0 ? 0 : numerator / denominator;
}

function buildFallbackPrediction(sessions: SessionSummary[]): RecoveryPrediction {
	const recent = sessions.slice(-14);
	const avgAccuracy = recent.reduce((sum, item) => sum + item.accuracy, 0) / Math.max(1, recent.length);
	const trendPerSession = linearRegressionTrend(recent.map((item) => item.accuracy));

	const sessionDays = new Set(
		recent.map((item) => {
			const day = new Date(item.createdAt);
			day.setHours(0, 0, 0, 0);
			return day.getTime();
		}),
	);

	const firstTime = recent[0]?.createdAt?.getTime() || Date.now();
	const lastTime = recent[recent.length - 1]?.createdAt?.getTime() || Date.now();
	const periodDays = Math.max(1, Math.ceil((lastTime - firstTime) / (24 * 60 * 60 * 1000)) + 1);
	const sessionsPerDay = recent.length / periodDays;
	const projectedGainPerDay = Math.max(0.02, trendPerSession * Math.max(0.2, sessionsPerDay));

	const targetMobilityPercent = 90;
	const gap = Math.max(0, targetMobilityPercent - avgAccuracy);
	const estimatedDaysToTarget = Math.max(1, Math.min(120, Math.round(gap / projectedGainPerDay)));

	const confidence: RecoveryPrediction["confidence"] =
		recent.length >= 18 ? "high" : recent.length >= 8 ? "medium" : "low";

	return {
		targetMobilityPercent,
		estimatedDaysToTarget,
		onTrack: avgAccuracy >= targetMobilityPercent || estimatedDaysToTarget <= 21,
		confidence,
		reasoning: `Prediction based on ${recent.length} sessions, current average accuracy ${avgAccuracy.toFixed(
			1,
		)}%, and recent consistency over ${sessionDays.size} active day(s).`,
	};
}

function extractPredictionFromText(text: string) {
	const raw = String(text || "");
	if (!raw.trim()) {
		return null;
	}

	const start = raw.indexOf("{");
	const end = raw.lastIndexOf("}");
	if (start < 0 || end <= start) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw.slice(start, end + 1)) as any;
		const target = Number(parsed?.targetMobilityPercent);
		const days = Number(parsed?.estimatedDaysToTarget);
		const onTrack = Boolean(parsed?.onTrack);
		const confidence = String(parsed?.confidence || "").toLowerCase();
		const reasoning = String(parsed?.reasoning || "").trim();

		if (!Number.isFinite(target) || !Number.isFinite(days) || !reasoning) {
			return null;
		}

		return {
			targetMobilityPercent: Math.max(70, Math.min(100, Math.round(target))),
			estimatedDaysToTarget: Math.max(1, Math.min(180, Math.round(days))),
			onTrack,
			confidence:
				confidence === "high" || confidence === "medium" || confidence === "low"
					? (confidence as "low" | "medium" | "high")
					: "medium",
			reasoning,
		} as RecoveryPrediction;
	} catch {
		return null;
	}
}

async function buildGroqRecoveryPrediction(sessions: SessionSummary[]) {
	const fallback = buildFallbackPrediction(sessions);
	const groqKey = process.env.GROQ_API_KEY || process.env.GROQ_API;

	if (!groqKey) {
		return fallback;
	}

	try {
		const recent = sessions.slice(-30).map((session) => ({
			date: session.createdAt.toISOString(),
			repCount: session.repCount,
			accuracy: session.accuracy,
			maxAngle: session.maxAngle,
		}));

		const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${groqKey}`,
			},
			body: JSON.stringify({
				model: "llama-3.3-70b-versatile",
				temperature: 0.2,
				messages: [
					{
						role: "system",
						content:
							"You are a rehab progress forecasting assistant. Output strict JSON only with keys: targetMobilityPercent (number), estimatedDaysToTarget (number), onTrack (boolean), confidence (low|medium|high), reasoning (string). Use the provided exercise history and be conservative. Never diagnose.",
					},
					{
						role: "user",
						content: `Predict recovery timeline from this history. Focus on likely days to reach around 90% mobility quality based on consistency and accuracy trend.\n${JSON.stringify(
							recent,
						)}`,
					},
				],
			}),
		});

		if (!response.ok) {
			return fallback;
		}

		const data = (await response.json()) as any;
		const content = String(data?.choices?.[0]?.message?.content || "");
		const parsed = extractPredictionFromText(content);
		return parsed || fallback;
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
			prediction: {
				targetMobilityPercent: 90,
				estimatedDaysToTarget: 14,
				onTrack: true,
				confidence: "high",
				reasoning: "Current consistency and upward accuracy trend indicate likely progress to 90% mobility quality in about two weeks.",
			},
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
			prediction: {
				targetMobilityPercent: 90,
				estimatedDaysToTarget: 0,
				onTrack: false,
				confidence: "low",
				reasoning: "Not enough session data yet. Complete a few sessions to enable prediction.",
			},
		});
	}

	const avgAccuracy = sessions.reduce((sum, item) => sum + item.accuracy, 0) / sessions.length;
	const avgReps = sessions.reduce((sum, item) => sum + item.repCount, 0) / sessions.length;
	const bestAngle = Math.max(...sessions.map((item) => item.maxAngle), 0);
	const totalMinutesEstimate = Math.round((sessions.length * 3.5 * 10) / 10);

	const combinedReport = await buildCombinedGroqReport(sessions);
	const prediction = await buildGroqRecoveryPrediction(sessions);

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
		prediction,
	});
}
