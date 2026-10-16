import { auth } from "@clerk/nextjs/server";
import { ROLE_MANAGER } from "@/lib/roles";

// Menu and settings are manager-only; staff only need the course list and queue.
export default async function Layout({ children }: { children: React.ReactNode }) {
  await auth.protect({ role: ROLE_MANAGER });
  return children;
}
