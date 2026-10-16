import { auth } from "@clerk/nextjs/server";
import OperatorProvider from "@/app/components/OperatorProvider";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await auth.protect();
  return <OperatorProvider>{children}</OperatorProvider>;
}
