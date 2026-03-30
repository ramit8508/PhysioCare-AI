import crypto from "crypto";
import fs from "fs";
import path from "path";

const OTP_TTL_MS = 10 * 60 * 1000;
const VERIFIED_TTL_MS = 15 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

type PendingOtp = {
  email: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
};

type VerifiedEmail = {
  email: string;
  tokenHash: string;
  expiresAt: number;
};

type OtpStore = {
  pendingByEmail: Map<string, PendingOtp>;
  verifiedByEmail: Map<string, VerifiedEmail>;
};

declare global {
  var __physiocareOtpStore: OtpStore | undefined;
}

const store: OtpStore =
  globalThis.__physiocareOtpStore || {
    pendingByEmail: new Map<string, PendingOtp>(),
    verifiedByEmail: new Map<string, VerifiedEmail>(),
  };

globalThis.__physiocareOtpStore = store;

function normalizeEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email: string) {
  const value = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cleanupExpiredEntries() {
  const now = Date.now();

  for (const [key, item] of store.pendingByEmail.entries()) {
    if (item.expiresAt <= now) {
      store.pendingByEmail.delete(key);
    }
  }

  for (const [key, item] of store.verifiedByEmail.entries()) {
    if (item.expiresAt <= now) {
      store.verifiedByEmail.delete(key);
    }
  }
}

function generateOtp() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

function readEnvValueFromFile(filePath: string, key: string) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const lines = raw.split(/\r?\n/);
    const prefix = `${key}=`;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) {
        continue;
      }
      if (!trimmed.startsWith(prefix)) {
        continue;
      }

      const value = trimmed.slice(prefix.length).trim();
      return value.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
    }
  } catch {
    return "";
  }

  return "";
}

function getEnvSearchDirs() {
  const cwd = process.cwd();
  const candidates = new Set<string>([
    cwd,
    path.join(cwd, "physiocare-ai"),
    path.resolve(cwd, ".."),
    path.resolve(cwd, "../physiocare-ai"),
    path.resolve(cwd, "../.."),
  ]);

  return Array.from(candidates);
}

function getServerEnv(key: string) {
  const direct = String(process.env[key] || "").trim();
  if (direct) {
    return direct;
  }

  if (typeof window !== "undefined") {
    return "";
  }

  for (const dir of getEnvSearchDirs()) {
    const fromLocal = readEnvValueFromFile(path.join(dir, ".env.local"), key);
    if (fromLocal) {
      return fromLocal;
    }

    const fromDefault = readEnvValueFromFile(path.join(dir, ".env"), key);
    if (fromDefault) {
      return fromDefault;
    }
  }

  return "";
}

export async function sendOtpEmail(emailInput: string) {
  cleanupExpiredEntries();

  const email = normalizeEmail(emailInput);
  const otp = generateOtp();

  const host = getServerEnv("EMAIL_HOST");
  const user = getServerEnv("EMAIL_USER");
  const pass = getServerEnv("EMAIL_PASS");
  const port = Number(getServerEnv("EMAIL_PORT") || "0");
  const fromName = getServerEnv("EMAIL_FROM_NAME") || "PhysioCare AI";
  const fromAddress = getServerEnv("EMAIL_FROM_ADDRESS") || user;

  if (!host || !user || !pass || !port) {
    const missing = [
      !host ? "EMAIL_HOST" : "",
      !user ? "EMAIL_USER" : "",
      !pass ? "EMAIL_PASS" : "",
      !port ? "EMAIL_PORT" : "",
    ].filter(Boolean);
    throw new Error(`Email server is not configured. Missing: ${missing.join(", ")}`);
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: email,
    subject: "Verify your email • PhysioCare AI",
    text: `PhysioCare AI OTP: ${otp}\n\nThis OTP is valid for 10 minutes. Do not share this code with anyone.`,
    html: `
      <div style="background:#f5f8ff;padding:28px 12px;font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.5;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#0ea5e9,#2563eb);padding:20px 24px;">
            <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:.3px;">PhysioCare AI</div>
            <div style="font-size:12px;color:#dbeafe;margin-top:4px;">Secure Signup Verification</div>
          </div>

          <div style="padding:24px;">
            <h2 style="margin:0 0 10px;font-size:22px;color:#0f172a;">Verify your email address</h2>
            <p style="margin:0 0 16px;color:#475569;">Use the OTP below to complete your signup.</p>

            <div style="margin:12px 0 16px;padding:14px 16px;border:1px dashed #93c5fd;background:#eff6ff;border-radius:12px;text-align:center;">
              <div style="font-size:32px;letter-spacing:6px;font-weight:800;color:#1d4ed8;">${otp}</div>
              <div style="font-size:12px;color:#64748b;margin-top:6px;">Valid for 10 minutes</div>
            </div>

            <p style="margin:0;color:#64748b;font-size:13px;">For your security, never share this code with anyone.</p>
          </div>

          <div style="padding:14px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:12px;color:#64748b;">
            This is an automated email from PhysioCare AI.
          </div>
        </div>
      </div>
    `,
  });

  store.pendingByEmail.set(email, {
    email,
    otpHash: hashValue(otp),
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: Date.now(),
  });

  store.verifiedByEmail.delete(email);
}

export function verifyOtp(emailInput: string, otpInput: string) {
  cleanupExpiredEntries();

  const email = normalizeEmail(emailInput);
  const otp = String(otpInput || "").trim();

  const pending = store.pendingByEmail.get(email);
  if (!pending) {
    return { ok: false as const, error: "OTP not found. Please request a new OTP." };
  }

  if (pending.expiresAt <= Date.now()) {
    store.pendingByEmail.delete(email);
    return { ok: false as const, error: "OTP expired. Please request a new OTP." };
  }

  if (pending.attempts >= MAX_VERIFY_ATTEMPTS) {
    store.pendingByEmail.delete(email);
    return { ok: false as const, error: "Too many invalid attempts. Request a new OTP." };
  }

  pending.attempts += 1;
  store.pendingByEmail.set(email, pending);

  if (hashValue(otp) !== pending.otpHash) {
    return { ok: false as const, error: "Invalid OTP" };
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  store.verifiedByEmail.set(email, {
    email,
    tokenHash: hashValue(verificationToken),
    expiresAt: Date.now() + VERIFIED_TTL_MS,
  });

  store.pendingByEmail.delete(email);

  return {
    ok: true as const,
    verificationToken,
    expiresInSec: Math.round(VERIFIED_TTL_MS / 1000),
  };
}

export function consumeVerifiedEmailToken(emailInput: string, tokenInput: string) {
  cleanupExpiredEntries();

  const email = normalizeEmail(emailInput);
  const token = String(tokenInput || "").trim();

  const verified = store.verifiedByEmail.get(email);
  if (!verified) {
    return false;
  }

  if (verified.expiresAt <= Date.now()) {
    store.verifiedByEmail.delete(email);
    return false;
  }

  const matches = hashValue(token) === verified.tokenHash;
  if (!matches) {
    return false;
  }

  store.verifiedByEmail.delete(email);
  return true;
}
