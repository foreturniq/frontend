import OperatorProvider from "@/app/components/OperatorProvider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <OperatorProvider>{children}</OperatorProvider>;
}
