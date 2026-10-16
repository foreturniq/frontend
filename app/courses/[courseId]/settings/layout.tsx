import { auth } from "@clerk/nextjs/server";
import OperatorProvider from "@/app/components/OperatorProvider";
import { ROLE_MANAGER } from "@/lib/roles";

// Manager-only. Internal staff are org:admin in the Foreturn IQ org, so they
// pass too; the API decides which course they may touch.
export default async function Layout({ children }: { children: React.ReactNode }) {
  await auth.protect({ role: ROLE_MANAGER });
  return <OperatorProvider>{children}</OperatorProvider>;
}
