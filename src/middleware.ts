import { withAuth } from "next-auth/middleware";

// Protect the whole /dashboard area. Unauthenticated users are redirected to /login.
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
