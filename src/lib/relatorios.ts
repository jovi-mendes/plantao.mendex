// Filtros e consultas dos relatórios (página e exportação CSV usam as mesmas regras)
import "server-only";
import { todos } from "./db";
import { RESULTADOS, TIPOS } from "./formato";

export type Filtros = { de: string; ate: string; e?: string; c?: string; q?: string; r?: string; t?: string };
const dataOk = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);

export function normalizar(sp: Partial<Filtros>, hoje: string): Filtros {
  const inicioMes = hoje.slice(0, 8) + "01";
  return { ...sp, de: dataOk(sp.de) ? sp.de! : inicioMes, ate: dataOk(sp.ate) ? sp.ate! : hoje };
}

function where(f: Filtros) {
  const cond = ["a.data BETWEEN $1 AND $2"];
  const p: unknown[] = [f.de, f.ate];
  const add = (sql: string, v: unknown) => { p.push(v); cond.push(sql.replace("?", `$${p.length}`)); };
  if (Number(f.e)) add("a.empreendimento = ?", Number(f.e));
  if (Number(f.c)) add("a.corretor = ?", Number(f.c));
  if (Number(f.q)) add("a.equipe = ?", Number(f.q));
  if (f.r && (RESULTADOS as readonly string[]).includes(f.r)) add("a.resultado = ?", f.r);
  if (f.r === "Em aberto") cond.push("a.situacao <> 'Finalizado'");
  if (f.t && (TIPOS as readonly string[]).includes(f.t)) add("a.tipo = ?", f.t);
  return { sql: cond.join(" AND "), p };
}

export type LinhaAtendimento = {
  codigo: number; data: string; hora: string; hora_fim: string | null; ordem: number; construtora: string; empreendimento: string;
  cliente: string; telefone: string | null; email: string | null; corretor: string | null; equipe: string | null; empresa: string | null;
  tipo: string; situacao: string; resultado: string | null; midia: string | null; observacoes: string | null;
};

export function atendimentos(f: Filtros) {
  const w = where(f);
  return todos<LinhaAtendimento>(
    `SELECT a.codigo, a.data, a.hora, a.hora_fim, a.ordem, i.construtora, p.empreendimento, c.nome AS cliente, c.telefone, c.email,
            co.nome AS corretor, e.nome AS equipe, a.empresa, a.tipo, a.situacao, a.resultado, a.midia, a.observacoes
       FROM atendimentos a
       JOIN incorporadoras i ON i.codigo = a.construtora
       JOIN empreendimentos p ON p.codigo = a.empreendimento
       JOIN clientes c ON c.codigo = a.cliente
       LEFT JOIN corretores co ON co.codigo = a.corretor
       LEFT JOIN equipes e ON e.codigo = a.equipe
      WHERE ${w.sql} ORDER BY a.data, p.empreendimento, a.ordem LIMIT 5000`, w.p);
}

export type Resumo = { chave: string; total: number; roleta: number; propostas: number; vendas: number };
export function resumo(f: Filtros, dimensao: "corretor" | "equipe" | "empreendimento" | "midia" | "resultado") {
  const w = where(f);
  const expr = {
    corretor: "coalesce(co.nome, '—')", equipe: "coalesce(e.nome, 'Sem equipe')", empreendimento: "p.empreendimento",
    midia: "coalesce(a.midia, 'Não informado')", resultado: "coalesce(a.resultado, 'Em aberto')",
  }[dimensao];
  return todos<Resumo>(
    `SELECT ${expr} AS chave, count(*) AS total, count(*) FILTER (WHERE a.tipo = 'Roleta') AS roleta,
            count(*) FILTER (WHERE a.resultado = 'Proposta') AS propostas, count(*) FILTER (WHERE a.resultado = 'Venda') AS vendas
       FROM atendimentos a JOIN empreendimentos p ON p.codigo = a.empreendimento
       LEFT JOIN corretores co ON co.codigo = a.corretor LEFT JOIN equipes e ON e.codigo = a.equipe
      WHERE ${w.sql} GROUP BY 1 ORDER BY total DESC, 1`, w.p);
}
