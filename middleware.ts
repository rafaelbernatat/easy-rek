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
  // Allow all requests to pass through, auth will be checked in individual routes
  // This ensures auth cookies are available to API routes
  return NextResponse.next();
});
