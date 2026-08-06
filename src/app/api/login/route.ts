import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, sha256Hex } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { senha } = await req.json();
  const esperada = process.env.APP_PASSWORD;
  if (!esperada) return NextResponse.json({ ok: true }); // login desativado

  if (senha !== esperada) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await sha256Hex(esperada), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    path: "/",
  });
  return res;
}
