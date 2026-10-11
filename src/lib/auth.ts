// Login, sessão (JWT em cookie) e permissões por função (Supervisor / Recepção)
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { config } from "./config";
import { um } from "./db";

const COOKIE = "pm_sessao";
const DURACAO_S = 60 * 60 * 12; // um turno de plantão

export type Usuario = { codigo: number; nome: string; email: string; telefone: string | null; funcao: "Supervisor" | "Recepção"; ativo: boolean };

const chave = () => {
  if (config.segredo.length < 32) throw new Error("Defina SESSAO_SEGREDO com pelo menos 32 caracteres");
  return new TextEncoder().encode(config.segredo);
};

export async function iniciarSessao(codigo: number): Promise<void> {
  const jwt = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(String(codigo))
    .setIssuedAt().setExpirationTime(`${DURACAO_S}s`).sign(chave());
  (await cookies()).set(COOKIE, jwt, { httpOnly: true, secure: config.url.startsWith("https"), sameSite: "lax", path: "/", maxAge: DURACAO_S });
}
export async function encerrarSessao(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export const usuario = cache(async (): Promise<Usuario | null> => {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, chave(), { algorithms: ["HS256"] });
    const u = await um<Usuario>("SELECT codigo, nome, email, telefone, funcao, ativo FROM usuarios WHERE codigo = $1", [Number(payload.sub)]);
    return u?.ativo ? u : null;
  } catch {
    return null;
  }
});

export const eSupervisor = (u: Usuario | null) => u?.funcao === "Supervisor";

export async function exigirLogin(): Promise<Usuario> {
  const u = await usuario();
  if (!u) redirect("/login");
  return u;
}
export async function exigirSupervisor(): Promise<Usuario> {
  const u = await exigirLogin();
  if (!eSupervisor(u)) redirect("/?negado=1");
  return u;
}

export const hashSenha = (s: string) => bcrypt.hash(s, 10);
export const senhaConfere = (s: string, h: string) => bcrypt.compare(s, h);
