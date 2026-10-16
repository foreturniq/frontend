import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import OperatorProvider from "@/app/components/OperatorProvider";
import { isInternal } from "@/lib/roles";

// Foreturn IQ staff only. Course operators get a 404, not a hint it exists.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const { orgId, orgRole } = await auth.protect();
  if (!isInternal(orgId, orgRole)) notFound();
  return <OperatorProvider>{children}</OperatorProvider>;
}
