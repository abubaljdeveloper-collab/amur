import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const isAuthRoute = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/signup");
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isDevRoute = req.nextUrl.pathname.startsWith("/api/dev");
  const isMediaRoute = req.nextUrl.pathname.startsWith("/api/media");
  const isWebhookRoute = req.nextUrl.pathname.startsWith("/api/webhooks");

  if (isApiAuthRoute || isDevRoute || isMediaRoute || isWebhookRoute) return;

  if (!isLoggedIn && !isAuthRoute) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(loginUrl);
  }
  if (isLoggedIn && isAuthRoute) {
    const dashboardUrl = new URL("/dashboard", req.nextUrl.origin);
    return Response.redirect(dashboardUrl);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
