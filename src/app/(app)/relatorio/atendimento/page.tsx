import type { Metadata } from "next";
import Pagina from "@/components/Pagina";
import Imprimir from "@/components/Imprimir";
import { exigirLogin } from "@/lib/auth";
import { config } from "@/lib/config";
import { todos } from "@/lib/db";
import { agora, dataBR, horaBR, RESULTADOS, telefoneBR, TIPOS } from "@/lib/formato";
import { atendimentos, normalizar, resumo, type Filtros, type Resumo } from "@/lib/relatorios";

export const metadata: Metadata = { title: "Relatório de atendimento" };
export const dynamic = "force-dynamic";

function Tabela({ titulo, linhas }: { titulo: string; linhas: Resumo[] }) {
  const total = linhas.reduce((s, l) => s + l.total, 0) || 1;
  return (
    <section className="cartao overflow-x-auto">
      <h2 className="mb-2 font-semibold">{titulo}</h2>
      <table className="tabela">
        <thead><tr><th /><th className="text-right">Visitas</th><th className="text-right">%</th><th className="text-right">Propostas</th><th className="text-right">Vendas</th><th className="text-right">Conversão</th></tr></thead>
        <tbody>{linhas.map((l) => (
          <tr key={l.chave}><td>{l.chave}</td><td className="text-right tabular-nums">{l.total}</td><td className="text-right tabular-nums">{Math.round((l.total / total) * 100)}%</td>
            <td className="text-right tabular-nums">{l.propostas}</td><td className="text-right tabular-nums">{l.vendas}</td>
            <td className="text-right tabular-nums">{l.total ? ((l.vendas / l.total) * 100).toFixed(1) : "0.0"}%</td></tr>
        ))}</tbody>
      </table>
    </section>
  );
}

export default async function RelAtendimento({ searchParams }: { searchParams: Promise<Partial<Filtros>> }) {
  await exigirLogin();
  const f = normalizar(await searchParams, agora(config.fuso).data);
  const [linhas, porCorretor, porEquipe, porEmp, porMidia, porResultado, emps, cors, eqs] = await Promise.all([
    atendimentos(f), resumo(f, "corretor"), resumo(f, "equipe"), resumo(f, "empreendimento"), resumo(f, "midia"), resumo(f, "resultado"),
    todos<{ codigo: number; nome: string }>("SELECT codigo, empreendimento AS nome FROM empreendimentos ORDER BY 2"),
    todos<{ codigo: number; nome: string }>("SELECT codigo, nome FROM corretores ORDER BY 2"),
    todos<{ codigo: number; nome: string }>("SELECT codigo, nome FROM equipes ORDER BY 2"),
  ]);
  const vendas = linhas.filter((l) => l.resultado === "Venda").length;
  const csv = `/relatorio/atendimento/csv?${new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][])}`;
  const sel = (nome: keyof Filtros, rotulo: string, ops: { v: string | number; r: string }[]) => (
    <div><label className="rotulo" htmlFor={nome}>{rotulo}</label>
      <select id={nome} name={nome} defaultValue={f[nome] ?? ""} className="entrada"><option value="">Todos</option>{ops.map((o) => <option key={o.v} value={o.v}>{o.r}</option>)}</select></div>
  );

  return (
    <Pagina titulo="Relatório de atendimento" sub={`Período de ${dataBR(f.de)} a ${dataBR(f.ate)}`} acoes={<><a href={csv} className="btn-contorno">Exportar CSV</a><Imprimir /></>}>
      <form className="cartao nao-imprimir mb-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-8">
        <div><label className="rotulo" htmlFor="de">De</label><input id="de" name="de" type="date" defaultValue={f.de} className="entrada" /></div>
        <div><label className="rotulo" htmlFor="ate">Até</label><input id="ate" name="ate" type="date" defaultValue={f.ate} className="entrada" /></div>
        {sel("e", "Empreendimento", emps.map((x) => ({ v: x.codigo, r: x.nome })))}
        {sel("c", "Corretor", cors.map((x) => ({ v: x.codigo, r: x.nome })))}
        {sel("q", "Equipe", eqs.map((x) => ({ v: x.codigo, r: x.nome })))}
        {sel("t", "Tipo", TIPOS.map((x) => ({ v: x, r: x })))}
        {sel("r", "Resultado", [...RESULTADOS, "Em aberto"].map((x) => ({ v: x, r: x })))}
        <div className="flex items-end"><button className="btn-primario w-full">Filtrar</button></div>
      </form>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Visitas", linhas.length], ["Clientes únicos", new Set(linhas.map((l) => l.cliente + l.telefone)).size], ["Vendas", vendas],
          ["Conversão", `${linhas.length ? ((vendas / linhas.length) * 100).toFixed(1) : "0.0"}%`]].map(([r, v]) => (
          <div key={r} className="cartao"><p className="text-xs font-semibold tracking-wide text-cinza uppercase">{r}</p><p className="mt-1 text-2xl font-bold tabular-nums">{v}</p></div>
        ))}
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Tabela titulo="Por corretor" linhas={porCorretor} />
        <Tabela titulo="Por equipe" linhas={porEquipe} />
        <Tabela titulo="Por empreendimento" linhas={porEmp} />
        <Tabela titulo="Por mídia (como conheceu)" linhas={porMidia} />
        <Tabela titulo="Por resultado" linhas={porResultado} />
      </div>

      <section className="cartao overflow-x-auto">
        <h2 className="mb-2 font-semibold">Atendimentos ({linhas.length}{linhas.length === 5000 ? ", limitado a 5000" : ""})</h2>
        <table className="tabela text-xs">
          <thead><tr><th>Data</th><th>Nº</th><th>Hora</th><th>Construtora</th><th>Empreendimento</th><th>Cliente</th><th>Corretor</th><th>Equipe</th><th>Empresa</th><th>Tipo</th><th>Resultado</th></tr></thead>
          <tbody>{linhas.map((l) => (
            <tr key={l.codigo}><td>{dataBR(l.data)}</td><td>{l.ordem}</td><td>{horaBR(l.hora)}</td><td>{l.construtora}</td><td>{l.empreendimento}</td>
              <td>{l.cliente}<br /><span className="text-cinza">{telefoneBR(l.telefone)}</span></td><td>{l.corretor}</td><td>{l.equipe}</td><td>{l.empresa}</td><td>{l.tipo}</td><td>{l.resultado ?? l.situacao}</td></tr>
          ))}</tbody>
        </table>
      </section>
    </Pagina>
  );
}
