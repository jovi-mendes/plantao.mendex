"use server";
import { revalidatePath } from "next/cache";
import { exigirLogin, exigirSupervisor } from "@/lib/auth";
import { config } from "@/lib/config";
import { like, pool, todos, tx, um, valor } from "@/lib/db";
import { agora, dataBR, MIDIAS, RESULTADOS, soDigitos, TIPOS } from "@/lib/formato";
import { fila, proximo } from "@/lib/roleta";

export type Estado = { erro?: string; ok?: string; retorno?: boolean };

export type ClienteAchado = {
  codigo: number; nome: string; telefone: string | null; email: string | null; bairro: string | null;
  ultima_data: string | null; ultimo_corretor: number | null; ultimo_corretor_nome: string | null; ultimo_empreendimento: string | null;
};

// busca por nome ou telefone, com a última visita (para identificar cliente de retorno)
export async function buscarCliente(termo: string): Promise<ClienteAchado[]> {
  await exigirLogin();
  const t = termo.trim();
  if (t.length < 3) return [];
  const dig = soDigitos(t);
  return todos<ClienteAchado>(
    `SELECT c.codigo, c.nome, c.telefone, c.email, c.bairro,
            u.data AS ultima_data, u.corretor AS ultimo_corretor, co.nome AS ultimo_corretor_nome, p.empreendimento AS ultimo_empreendimento
       FROM clientes c
       LEFT JOIN LATERAL (SELECT a.data, a.corretor, a.empreendimento FROM atendimentos a WHERE a.cliente = c.codigo ORDER BY a.data DESC, a.hora DESC LIMIT 1) u ON true
       LEFT JOIN corretores co ON co.codigo = u.corretor
       LEFT JOIN empreendimentos p ON p.codigo = u.empreendimento
      WHERE c.nome ILIKE $1 OR ($2 <> '' AND regexp_replace(c.telefone, '\\D', '', 'g') LIKE $3) OR c.email ILIKE $1
      ORDER BY c.nome LIMIT 8`,
    [like(t), dig.length >= 4 ? dig : "", `%${dig}%`],
  );
}

export async function registrar(_: Estado, f: FormData): Promise<Estado> {
  const u = await exigirLogin();
  const emp = Number(f.get("empreendimento"));
  const tipo = String(f.get("tipo") ?? "Roleta");
  const midia = String(f.get("midia") ?? "") || null;
  const obs = String(f.get("observacoes") ?? "").trim() || null;
  let cliente = Number(f.get("cliente")) || null;
  const nome = String(f.get("cliente_nome") ?? "").trim();
  const telefone = soDigitos(String(f.get("cliente_telefone") ?? ""));
  if (!emp) return { erro: "Escolha o empreendimento." };
  if (!(TIPOS as readonly string[]).includes(tipo)) return { erro: "Tipo de atendimento inválido." };
  if (midia && !(MIDIAS as readonly string[]).includes(midia)) return { erro: "Mídia inválida." };
  if (!cliente && !nome) return { erro: "Informe o cliente (busque um cadastrado ou digite o nome)." };
  if (!cliente && telefone && ![10, 11].includes(telefone.length)) return { erro: "Telefone do cliente: informe DDD + número." };

  const { data, hora } = agora(config.fuso);
  const empreendimento = await um<{ incorporadora: number; empreendimento: string }>("SELECT incorporadora, empreendimento FROM empreendimentos WHERE codigo = $1", [emp]);
  if (!empreendimento) return { erro: "Empreendimento não encontrado." };

  // cliente novo com telefone já cadastrado: reaproveita o cadastro
  if (!cliente && telefone) cliente = await valor<number>("SELECT codigo FROM clientes WHERE regexp_replace(telefone, '\\D', '', 'g') = $1 LIMIT 1", [telefone]);

  // cliente que já visitou este empreendimento: pertence ao corretor que o atendeu (retorno)
  if (cliente && tipo === "Roleta" && f.get("forcar") !== "on") {
    const ant = await um<{ data: string; nome: string }>(
      `SELECT a.data, co.nome FROM atendimentos a JOIN corretores co ON co.codigo = a.corretor
        WHERE a.cliente = $1 AND a.empreendimento = $2 ORDER BY a.data DESC, a.hora DESC LIMIT 1`, [cliente, emp]);
    if (ant) return { retorno: true, erro: `Este cliente já foi atendido neste empreendimento por ${ant.nome} em ${dataBR(ant.data)}. Registre como “Retorno” para o mesmo corretor ou marque “Ignorar e usar a roleta”.` };
  }

  try {
    const r = await tx(async (c) => {
      if (!cliente) {
        cliente = await valor<number>(
          "INSERT INTO clientes (nome, telefone, email, bairro, cidade) VALUES ($1, $2, $3, $4, $5) RETURNING codigo",
          [nome, telefone || null, String(f.get("cliente_email") ?? "").trim().toLowerCase() || null,
            String(f.get("cliente_bairro") ?? "").trim() || null, String(f.get("cliente_cidade") ?? "").trim() || null], c);
      }
      let corretor: number | null = null, roleta: number | null = null;
      if (tipo === "Roleta") {
        const p = proximo(await fila(data, emp, c));
        if (!p) throw new Error("SEM_CORRETOR");
        corretor = p.corretor;
        roleta = p.codigo;
      } else {
        corretor = Number(f.get("corretor")) || null;
        if (!corretor) throw new Error("ESCOLHA_CORRETOR");
      }
      const ordem = ((await valor<number>("SELECT coalesce(max(ordem), 0) FROM atendimentos WHERE data = $1 AND empreendimento = $2", [data, emp], c)) ?? 0) + 1;
      await c.query(
        `INSERT INTO atendimentos (data, hora, ordem, construtora, empreendimento, cliente, corretor, equipe, empresa, roleta, tipo, midia, observacoes, usuario)
         SELECT $1, $2, $3, $4, $5, $6, co.codigo, co.equipe, co.empresa, $8, $9, $10, $11, $12 FROM corretores co WHERE co.codigo = $7`,
        [data, hora, ordem, empreendimento.incorporadora, emp, cliente, corretor, roleta, tipo, midia, obs, u.codigo]);
      return { ordem, nome: await valor<string>("SELECT nome FROM corretores WHERE codigo = $1", [corretor], c) };
    }, `roleta:${data}:${emp}`);
    revalidatePath("/atendimento/visita");
    revalidatePath("/atendimento/roleta");
    return { ok: `Visita nº ${r.ordem} registrada — corretor: ${r.nome}.` };
  } catch (e) {
    if (e instanceof Error && e.message === "SEM_CORRETOR") return { erro: "Não há corretor disponível na roleta deste empreendimento. Faça o sorteio do dia ou libere um corretor em Atendimento › Roleta." };
    if (e instanceof Error && e.message === "ESCOLHA_CORRETOR") return { erro: "Para Retorno, Indicação ou Agendado, escolha o corretor." };
    throw e;
  }
}

export async function finalizar(_: Estado, f: FormData): Promise<Estado> {
  await exigirLogin();
  const resultado = String(f.get("resultado") ?? "");
  if (!(RESULTADOS as readonly string[]).includes(resultado)) return { erro: "Escolha o resultado do atendimento." };
  const { hora } = agora(config.fuso);
  await pool.query(
    `UPDATE atendimentos SET situacao = 'Finalizado', resultado = $2, hora_fim = coalesce(hora_fim, $3),
            observacoes = coalesce(nullif($4, ''), observacoes) WHERE codigo = $1`,
    [Number(f.get("codigo")), resultado, hora, String(f.get("observacoes") ?? "").trim()]);
  revalidatePath("/atendimento/visita");
  revalidatePath("/atendimento/roleta");
  return { ok: "Atendimento finalizado." };
}

export async function excluirAtendimento(_: Estado, f: FormData): Promise<Estado> {
  await exigirSupervisor();
  await pool.query("DELETE FROM atendimentos WHERE codigo = $1", [Number(f.get("codigo"))]);
  revalidatePath("/atendimento/visita");
  revalidatePath("/atendimento/roleta");
  return { ok: "Atendimento excluído." };
}
