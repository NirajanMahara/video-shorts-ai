import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export default authMiddleware({
  publicRoutes: [
    "/",
    "/api/health",
    "/api/upload",
    "/api/youtube",
    "/api/task/:path*",
    "/api/download/:path*"
  ],
  afterAuth(auth, req) {
    // Allow public routes
    if (req.url.includes('/api/health') || 
        req.url.includes('/api/upload') || 
        req.url.includes('/api/youtube') || 
        req.url.includes('/api/task/') || 
        req.url.includes('/api/download/') ||
        req.nextUrl.pathname === '/') {
      return NextResponse.next();
    }

    // Handle other routes
    if (!auth.userId && !auth.isPublicRoute) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }
  }
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}; 