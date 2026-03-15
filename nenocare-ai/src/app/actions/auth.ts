"use server";

import { signOut } from "next-auth/react";

export async function handleLogout() {
  await signOut({ redirect: true, callbackUrl: "/" });
}
