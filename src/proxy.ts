import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Practice, Home, Leaderboard and sign-in pages are public. Play and Profile need a signed-in user.
// API routes check auth() themselves and answer 401 JSON instead of redirecting.
const isProtectedRoute = createRouteMatcher(["/play(.*)", "/profile(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
