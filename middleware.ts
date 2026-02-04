import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from 'next/server';

/**
 * Configure which routes should be protected by Clerk authentication
 * Note: /signup and /login are public routes (not protected)
 */
const isProtectedRoute = createRouteMatcher([
  '/record(.*)',
  '/editor(.*)',
  '/settings(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth.protect();
  }

  return NextResponse.next();
});
