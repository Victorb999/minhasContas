import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const ok = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Tudo, exceto login, assets do Next e arquivos públicos (ícones, manifest).
  matcher: ["/((?!login|_next/|favicon|icon|apple-icon|manifest|.*\.(?:png|svg|ico|webmanifest)$).*)"],
};
