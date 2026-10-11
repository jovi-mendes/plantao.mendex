import type { Metadata } from "next";
import Pagina from "@/components/Pagina";
import Imprimir from "@/components/Imprimir";
import { exigirLogin } from "@/lib/auth";
import { config } from "@/lib/config";
import { todos } from "@/lib/db";
import { agora, dataBR } from "@/lib/formato";
import { normalizar, type Filtros } from "@/lib/relatorios";

export const metadata: Metadata = { title: "Relatório de sorteio" };
export const dynamic = "force-dynamic";

type Linha = { codigo: number; data: string; empreendimento: string; sorteio: number; corretor: string; gerente: string | null; empresa: string | null; equipe: string | null; situacao: string; pulos: number; roleta: number; outros: number; vendas: number };

export default async function RelSorteio({ searchParams }: { searchParams: Promise<Partial<Filtros>> }) {
  await exigirLogin();
  const f = normalizar(await searchParams, agora(config.fuso).data);
  const p: unknown[] = [f.de, f.ate];
  let filtro = "";
  if (Number(f.e)) { p.push(Number(f.e)); filtro = ` AND r.empreendimento = $3`; }
  const [linhas, emps] = await Promise.all([
    todos<Linha>(
      `SELECT r.codigo, r.data, pe.empreendimento, r.sorteio, co.nome AS corretor, r.gerente, r.empresa, e.nome AS equipe, r.situacao, r.pulos,
              count(a.codigo) FILTER (WHERE a.tipo = 'Roleta') AS roleta, count(a.codigo) FILTER (WHERE a.tipo <> 'Roleta') AS outros,
              count(a.codigo) FILTER (WHERE a.resultado = 'Venda') AS vendas
         FROM roleta r JOIN corretores co ON co.codigo = r.corretor JOIN empreendimentos pe ON pe.codigo = r.empreendimento
         LEFT JOIN equipes e ON e.codigo = r.equipe
         LEFT JOIN atendimentos a ON a.corretor = r.corretor AND a.data = r.data AND a.empreendimento = r.empreendimento
        WHERE r.data BETWEEN $1 AND $2${filtro}
        GROUP BY r.codigo, pe.empreendimento, co.nome, e.nome ORDER BY r.data DESC, pe.empreendimento, r.sorteio`, p),
    todos<{ codigo: number; nome: string }>("SELECT codigo, empreendimento AS nome FROM empreendimentos ORDER BY 2"),
  ]);
  // agrupa por dia + empreendimento
  const grupos = new Map<string, Linha[]>();
  for (const l of linhas) { const k = `${dataBR(l.data)} — ${l.empreendimento}`; grupos.set(k, [...(grupos.get(k) ?? []), l]); }
  // participação no período por corretor
  const ranking = new Map<string, { plantoes: number; roleta: number; vendas: number }>();
  for (const l of linhas) { const r = ranking.get(l.corretor) ?? { plantoes: 0, roleta: 0, vendas: 0 }; r.plantoes++; r.roleta += l.roleta; r.vendas += l.vendas; ranking.set(l.corretor, r); }

  return (
    <Pagina titulo="Relatório de sorteio" sub={`Roletas de ${dataBR(f.de)} a ${dataBR(f.ate)}`} acoes={<Imprimir />}>
      <form className="cartao nao-imprimir mb-5 grid gap-3 sm:grid-cols-4">
        <div><label className="rotulo" htmlFor="de">De</label><input id="de" name="de" type="date" defaultValue={f.de} className="entrada" /></div>
        <div><label className="rotulo" htmlFor="ate">Até</label><input id="ate" name="ate" type="date" defaultValue={f.ate} className="entrada" /></div>
        <div><label className="rotulo" htmlFor="e">Empreendimento</label>
          <select id="e" name="e" defaultValue={f.e ?? ""} className="entrada"><option value="">Todos</option>{emps.map((x) => <option key={x.codigo} value={x.codigo}>{x.nome}</option>)}</select></div>
        <div className="flex items-end"><button className="btn-primario w-full">Filtrar</button></div>
      </form>
      {linhas.length === 0 ? <p className="cartao text-sm text-cinza">Nenhum sorteio no período.</p> : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            {[...grupos].map(([titulo, ls]) => (
              <section key={titulo} className="cartao overflow-x-auto">
                <h2 className="mb-2 font-semibold">{titulo}</h2>
                <table className="tabela">
                  <thead><tr><th>Sorteio</th><th>Corretor</th><th>Gerente</th><th>Empresa</th><th className="text-right">Roleta</th><th className="text-right">Outros</th><th className="text-right">Pulos</th><th>Situação final</th></tr></thead>
                  <tbody>{ls.map((l) => (
                    <tr key={l.codigo}><td className="tabular-nums">{l.sorteio}º</td><td>{l.corretor}<div className="text-xs text-cinza">{l.equipe}</div></td><td>{l.gerente}</td><td>{l.empresa}</td>
                      <td className="text-right tabular-nums">{l.roleta}</td><td className="text-right tabular-nums">{l.outros}</td><td className="text-right tabular-nums">{l.pulos}</td><td>{l.situacao}</td></tr>
                  ))}</tbody>
                </table>
              </section>
            ))}
          </div>
          <aside className="cartao h-fit overflow-x-auto">
            <h2 className="mb-2 font-semibold">Participação no período</h2>
            <table className="tabela">
              <thead><tr><th>Corretor</th><th className="text-right">Plantões</th><th className="text-right">Roleta</th><th className="text-right">Vendas</th></tr></thead>
              <tbody>{[...ranking].sort((a, b) => b[1].roleta - a[1].roleta).map(([n, r]) => (
                <tr key={n}><td>{n}</td><td className="text-right tabular-nums">{r.plantoes}</td><td className="text-right tabular-nums">{r.roleta}</td><td className="text-right tabular-nums">{r.vendas}</td></tr>
              ))}</tbody>
            </table>
          </aside>
        </div>
      )}
    </Pagina>
  );
}
