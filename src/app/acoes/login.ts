"use server";
import { redirect } from "next/navigation";
import { encerrarSessao, iniciarSessao, senhaConfere } from "@/lib/auth";
import { um } from "@/lib/db";

export async function entrar(_: { erro?: string }, f: FormData): Promise<{ erro?: string }> {
  const email = String(f.get("email") ?? "").trim().toLowerCase();
  const senha = String(f.get("senha") ?? "");
  const u = await um<{ codigo: number; senha_hash: string; ativo: boolean }>("SELECT codigo, senha_hash, ativo FROM usuarios WHERE lower(email) = $1", [email]);
  if (!u || !u.ativo || !(await senhaConfere(senha, u.senha_hash))) return { erro: "E-mail ou senha inválidos." };
  await iniciarSessao(u.codigo);
  redirect("/");
}

export async function sair(): Promise<void> {
  await encerrarSessao();
  redirect("/login");
}
