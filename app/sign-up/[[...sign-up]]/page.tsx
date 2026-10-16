import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 py-10">
      <SignUp />
    </main>
  );
}
