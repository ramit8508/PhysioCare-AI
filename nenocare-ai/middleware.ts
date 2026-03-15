import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const isAdminRoute = (pathname: string) => pathname.startsWith("/admin");
const isDoctorRoute = (pathname: string) => pathname.startsWith("/doctor");
const isPatientRoute = (pathname: string) => pathname.startsWith("/patient");

const isLoginRoute = (pathname: string) =>
  pathname === "/admin/login" || 
  pathname === "/doctor/login" || 
  pathname === "/login" ||
  pathname.startsWith("/(auth)");

const getSessionFromRequest = async (request: NextRequest) => {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token?.sub || typeof token.role !== "string") {
    return null;
  }

  return {
    userId: token.sub,
    role: token.role,
    isBlacklisted: token.isBlacklisted === true,
  };
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API and static routes
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow blocked page
  if (pathname === "/blocked") {
    return NextResponse.next();
  }

  // Skip middleware for login/auth routes
  if (isLoginRoute(pathname)) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(request);

  // Check if user is blacklisted
  if (session?.isBlacklisted) {
    const url = request.nextUrl.clone();
    url.pathname = "/blocked";
    return NextResponse.redirect(url);
  }

  // Protect admin routes
  if (isAdminRoute(pathname)) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    if (session.role !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  // Protect doctor routes
  if (isDoctorRoute(pathname)) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/doctor/login";
      return NextResponse.redirect(url);
    }
    if (session.role !== "DOCTOR") {
      const url = request.nextUrl.clone();
      url.pathname = "/doctor/login";
      return NextResponse.redirect(url);
    }
  }

  // Protect patient routes
  if (isPatientRoute(pathname)) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (session.role !== "PATIENT") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/doctor/:path*", "/patient/:path*", "/blocked"],
};
