"use server";
// Gravação genérica dos cadastros: só os campos declarados em ENTIDADES entram no SQL
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirLogin, exigirSupervisor, hashSenha } from "@/lib/auth";
import { codigoErro, pool } from "@/lib/db";
import { ENTIDADES } from "@/lib/entidades";
import { soDigitos } from "@/lib/formato";

export type Estado = { erro?: string };

async function permissao(slug: string) {
  const ent = ENTIDADES[slug];
  if (!ent) throw new Error("Cadastro inválido");
  const u = ent.supervisor ? await exigirSupervisor() : await exigirLogin();
  return { ent, u };
}

export async function salvar(_: Estado, f: FormData): Promise<Estado> {
  const { ent, u } = await permissao(String(f.get("_entidade")));
  const codigo = Number(f.get("_codigo")) || null;
  const colunas: string[] = [];
  const valores: unknown[] = [];
  for (const c of ent.campos) {
    const bruto = String(f.get(c.nome) ?? "").trim();
    if (c.tipo === "booleano") {
      colunas.push(c.nome);
      valores.push(f.get(c.nome) === "on");
      continue;
    }
    if (c.tipo === "senha") {
      if (!bruto && codigo) continue; // edição sem trocar a senha
      if (bruto.length < 6) return { erro: "A senha precisa ter pelo menos 6 caracteres." };
      colunas.push("senha_hash");
      valores.push(await hashSenha(bruto));
      continue;
    }
    if (c.obrigatorio && !bruto) return { erro: `Preencha o campo ${c.rotulo}.` };
    if (c.tipo === "email" && bruto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bruto)) return { erro: `${c.rotulo}: e-mail inválido.` };
    if (c.tipo === "telefone" && bruto && ![10, 11].includes(soDigitos(bruto).length)) return { erro: `${c.rotulo}: informe DDD + número.` };
    if (c.tipo === "opcoes" && bruto && !c.opcoes?.includes(bruto)) return { erro: `${c.rotulo}: opção inválida.` };
    colunas.push(c.nome);
    valores.push(!bruto ? null : c.tipo === "fk" ? Number(bruto) : c.tipo === "telefone" ? soDigitos(bruto) : c.tipo === "email" ? bruto.toLowerCase() : bruto);
  }
  if (ent.slug === "usuarios" && codigo === u.codigo) {
    // ninguém tira o próprio acesso de supervisor nem se desativa
    const i = colunas.indexOf("funcao"), j = colunas.indexOf("ativo");
    if (valores[i] !== "Supervisor" || valores[j] !== true) return { erro: "Você não pode remover o seu próprio acesso de Supervisor." };
  }
  try {
    if (codigo) {
      const sets = colunas.map((c, i) => `${c} = $${i + 1}`).join(", ");
      await pool.query(`UPDATE ${ent.tabela} SET ${sets} WHERE codigo = $${colunas.length + 1}`, [...valores, codigo]);
    } else {
      await pool.query(`INSERT INTO ${ent.tabela} (${colunas.join(", ")}) VALUES (${colunas.map((_, i) => `$${i + 1}`).join(", ")})`, valores);
    }
  } catch (e) {
    if (codigoErro(e) === "23505") return { erro: "Já existe um registro com esses dados (nome, CRECI ou e-mail repetido)." };
    if (codigoErro(e) === "23502" && !codigo && ent.slug === "usuarios") return { erro: "Informe a senha do novo usuário." };
    throw e;
  }
  revalidatePath(`/cadastro/${ent.slug}`);
  redirect(`/cadastro/${ent.slug}?ok=1`);
}

export async function excluir(_: Estado, f: FormData): Promise<Estado> {
  const { ent, u } = await permissao(String(f.get("_entidade")));
  const codigo = Number(f.get("_codigo"));
  if (ent.slug === "usuarios" && codigo === u.codigo) return { erro: "Você não pode excluir o seu próprio usuário." };
  try {
    await pool.query(`DELETE FROM ${ent.tabela} WHERE codigo = $1`, [codigo]);
  } catch (e) {
    if (codigoErro(e) === "23503") return { erro: `Este ${ent.singular.toLowerCase()} já tem atendimentos, sorteios ou cadastros ligados e não pode ser excluído. Desative-o, se for o caso.` };
    throw e;
  }
  revalidatePath(`/cadastro/${ent.slug}`);
  redirect(`/cadastro/${ent.slug}?excluido=1`);
}
