import { clerkMiddleware } from "@clerk/nextjs/server";

// Access checks live in the operator layouts (auth.protect). The proxy only
// runs Clerk on operator and auth pages; golfer routes never touch Clerk.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/admin/:path*",
    "/courses/:courseId/orders/:path*",
    "/courses/:courseId/qr/:path*",
    "/sign-in/:path*",
    "/sign-up/:path*",
  ],
};
