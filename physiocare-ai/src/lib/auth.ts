import { getServerSession, type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email?.toString().toLowerCase() || "";
        const password = credentials?.password?.toString() || "";
        const role = credentials?.role?.toString().toUpperCase() || "";
        const demoEmail = String(process.env.DEMO_PATIENT_EMAIL || "demo@physiocare.ai").trim().toLowerCase();
        const demoPassword = String(process.env.DEMO_PATIENT_PASSWORD || "demo123");

        if (!email || !password) {
          return null;
        }

        if (role === "ADMIN") {
          const validAdmin = email === "admin@gmail.com" && password === "123456";
          if (!validAdmin) {
            return null;
          }

          return {
            id: "static-admin",
            email: "admin@gmail.com",
            role: "ADMIN",
            isBlacklisted: false,
          } as any;
        }

        if (email === demoEmail && password === demoPassword) {
          if (role && role !== "PATIENT") {
            return null;
          }

          return {
            id: String(process.env.DEMO_PATIENT_ID || "64b8f7b2c9d4e1a2b3c4d5e6"),
            email: demoEmail,
            role: "PATIENT",
            isBlacklisted: false,
          } as any;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) {
          return null;
        }

        if (role && user.role !== role) {
          return null;
        }

        if (!verifyPassword(password, user.passwordHash)) {
          return null;
        }

        if (user.isBlacklisted) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          isBlacklisted: user.isBlacklisted,
        } as any;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.isBlacklisted = (user as any).isBlacklisted;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
        (session.user as any).isBlacklisted = token.isBlacklisted;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export async function getSession() {
  return getServerSession(authOptions);
}
