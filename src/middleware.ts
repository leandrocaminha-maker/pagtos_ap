import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, sha256Hex } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const senha = process.env.APP_PASSWORD;
  if (!senha) return NextResponse.next(); // sem senha configurada, acesso livre

  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === (await sha256Hex(senha))) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  // Location relativo de propósito: atrás do proxy reverso o servidor só conhece
  // o próprio endereço local, então uma URL absoluta mandaria o navegador para
  // localhost:3002 em vez do domínio acessado.
  return new NextResponse(null, { status: 307, headers: { location: "/login" } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
