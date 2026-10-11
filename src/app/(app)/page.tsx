import Link from "next/link";
import Pagina from "@/components/Pagina";
import Mensagem from "@/components/Mensagem";
import { exigirLogin } from "@/lib/auth";
import { config } from "@/lib/config";
import { todos, um } from "@/lib/db";
import { agora, dataBR, horaBR } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function Inicio({ searchParams }: { searchParams: Promise<{ negado?: string }> }) {
  const u = await exigirLogin();
  const { negado } = await searchParams;
  const { data } = agora(config.fuso);
  const t = await um<{ visitas: number; atendendo: number; vendas: number; propostas: number; corretores: number }>(
    `SELECT (SELECT count(*) FROM atendimentos WHERE data = $1) AS visitas,
            (SELECT count(*) FROM atendimentos WHERE data = $1 AND situacao <> 'Finalizado') AS atendendo,
            (SELECT count(*) FROM atendimentos WHERE data = $1 AND resultado = 'Venda') AS vendas,
            (SELECT count(*) FROM atendimentos WHERE data = $1 AND resultado = 'Proposta') AS propostas,
            (SELECT count(*) FROM roleta WHERE data = $1 AND situacao = 'Disponível') AS corretores`, [data]);
  const ultimas = await todos<{ codigo: number; hora: string; ordem: number; cliente: string; empreendimento: string; corretor: string | null; situacao: string }>(
    `SELECT a.codigo, a.hora, a.ordem, c.nome AS cliente, p.empreendimento, co.nome AS corretor, a.situacao
       FROM atendimentos a JOIN clientes c ON c.codigo = a.cliente JOIN empreendimentos p ON p.codigo = a.empreendimento
       LEFT JOIN corretores co ON co.codigo = a.corretor
      WHERE a.data = $1 ORDER BY a.hora DESC LIMIT 8`, [data]);
  const cards = [
    { r: "Visitas hoje", v: t?.visitas ?? 0 },
    { r: "Em atendimento", v: t?.atendendo ?? 0 },
    { r: "Corretores na roleta", v: t?.corretores ?? 0 },
    { r: "Propostas", v: t?.propostas ?? 0 },
    { r: "Vendas", v: t?.vendas ?? 0 },
  ];
  return (
    <Pagina titulo={`Olá, ${u.nome.split(" ")[0]}`} sub={`Plantão de ${dataBR(data)}`}
      acoes={<><Link href="/atendimento/visita" className="btn-destaque">+ Registrar visita</Link><Link href="/atendimento/roleta" className="btn-primario">Roleta</Link></>}>
      {negado && <Mensagem erro="Esta área é exclusiva para Supervisores." />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.r} className="cartao"><p className="text-xs font-semibold tracking-wide text-cinza uppercase">{c.r}</p><p className="mt-1 text-3xl font-bold tabular-nums">{c.v}</p></div>
        ))}
      </div>
      <section className="cartao mt-5 overflow-x-auto">
        <h2 className="mb-2 font-semibold">Últimas visitas de hoje</h2>
        {ultimas.length === 0 ? <p className="text-sm text-cinza">Nenhuma visita registrada hoje.</p> : (
          <table className="tabela"><thead><tr><th>Nº</th><th>Hora</th><th>Cliente</th><th>Empreendimento</th><th>Corretor</th><th>Situação</th></tr></thead>
            <tbody>{ultimas.map((a) => (
              <tr key={a.codigo}><td>{a.ordem}</td><td>{horaBR(a.hora)}</td><td>{a.cliente}</td><td>{a.empreendimento}</td><td>{a.corretor}</td><td>{a.situacao}</td></tr>
            ))}</tbody></table>
        )}
      </section>
    </Pagina>
  );
}
