import { clerkMiddleware } from "@clerk/nextjs/server";

// Access checks live in the operator layouts (auth.protect). The proxy only
// runs Clerk on operator and auth pages; golfer routes never touch Clerk.
// signInUrl here (not just on ClerkProvider) so server-side auth.protect()
// redirects to our /sign-in instead of Clerk's hosted page.
export default clerkMiddleware({ signInUrl: "/sign-in", signUpUrl: "/sign-up" });

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/courses/:courseId/menu/:path*",
    "/courses/:courseId/settings/:path*",
    "/courses/:courseId/orders/:path*",
    "/courses/:courseId/qr/:path*",
    "/sign-in/:path*",
    "/sign-up/:path*",
  ],
};
