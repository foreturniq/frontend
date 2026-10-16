import { ClerkProvider } from "@clerk/nextjs";

// Wraps operator pages only. Kept out of the root layout so Clerk's JS never
// loads on golfer order/checkout pages (compliance.md rule 8).
export default function OperatorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/admin"
      signUpFallbackRedirectUrl="/admin"
      afterSignOutUrl="/sign-in"
    >
      {children}
    </ClerkProvider>
  );
}
