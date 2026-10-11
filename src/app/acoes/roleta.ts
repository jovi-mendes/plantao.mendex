"use server";
import { revalidatePath } from "next/cache";
import { exigirLogin, exigirSupervisor } from "@/lib/auth";
import { config } from "@/lib/config";
import { codigoErro, pool, tx } from "@/lib/db";
import { agora } from "@/lib/formato";
import { incluir } from "@/lib/roleta";

export type Estado = { erro?: string; ok?: string };
const trava = (data: string, emp: number) => `roleta:${data}:${emp}`;

export async function sortear(_: Estado, f: FormData): Promise<Estado> {
  const u = await exigirLogin();
  const emp = Number(f.get("empreendimento"));
  const corretores = f.getAll("corretor").map(Number).filter(Boolean);
  if (!emp) return { erro: "Escolha o empreendimento." };
  if (!corretores.length) return { erro: "Marque os corretores presentes no plantão." };
  const { data } = agora(config.fuso);
  const n = await tx((c) => incluir(c, data, emp, corretores, u.codigo), trava(data, emp));
  revalidatePath("/atendimento/roleta");
  return { ok: n ? `${n} corretor(es) sorteado(s) e incluído(s) na fila.` : "Esses corretores já estavam na fila." };
}

// pular a vez, pausar, retomar ou registrar saída
export async function mudar(_: Estado, f: FormData): Promise<Estado> {
  await exigirLogin();
  const codigo = Number(f.get("codigo"));
  const acao = String(f.get("acao"));
  const sql: Record<string, string> = {
    pular: "UPDATE roleta SET pulos = pulos + 1 WHERE codigo = $1",
    pausar: "UPDATE roleta SET situacao = 'Pausado' WHERE codigo = $1",
    retomar: "UPDATE roleta SET situacao = 'Disponível' WHERE codigo = $1",
    saiu: "UPDATE roleta SET situacao = 'Saiu' WHERE codigo = $1",
  };
  if (!sql[acao]) return { erro: "Ação inválida." };
  await pool.query(sql[acao], [codigo]);
  revalidatePath("/atendimento/roleta");
  return {};
}

// remove da fila (só supervisor, e só se o corretor ainda não atendeu pela roleta)
export async function remover(_: Estado, f: FormData): Promise<Estado> {
  await exigirSupervisor();
  try {
    const r = await pool.query(
      `DELETE FROM roleta r WHERE r.codigo = $1 AND NOT EXISTS
         (SELECT 1 FROM atendimentos a WHERE a.roleta = r.codigo)`, [Number(f.get("codigo"))]);
    if (!r.rowCount) return { erro: "Este corretor já atendeu pela roleta hoje; use “Saiu” em vez de remover." };
  } catch (e) {
    if (codigoErro(e) === "23503") return { erro: "Não é possível remover: há registros ligados." };
    throw e;
  }
  revalidatePath("/atendimento/roleta");
  return {};
}
