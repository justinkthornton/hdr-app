import {
  ADMIN_SESSION_COOKIE,
  getRequiredEnv,
  verifyAdminSessionToken
} from "@structure-locked-hdr/core";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function requireAdminPage(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!verifyAdminSessionToken(token, getRequiredEnv("ADMIN_SESSION_SECRET"))) {
    redirect("/login");
  }
}
