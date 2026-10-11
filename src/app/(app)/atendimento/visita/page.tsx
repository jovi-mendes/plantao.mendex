import type { Metadata } from "next";
import Pagina from "@/components/Pagina";
import BotaoAcao from "@/components/BotaoAcao";
import SeletorEmpreendimento from "@/components/SeletorEmpreendimento";
import { excluirAtendimento } from "@/app/acoes/atendimento";
import { eSupervisor, exigirLogin } from "@/lib/auth";
import { config } from "@/lib/config";
import { corretoresAtivos, empreendimentosAtivos } from "@/lib/consultas";
import { todos } from "@/lib/db";
import { agora, dataBR, horaBR, telefoneBR } from "@/lib/formato";
import { fila, proximo } from "@/lib/roleta";
import FormVisita from "./FormVisita";
import Finalizar from "./Finalizar";

export const metadata: Metadata = { title: "Visitas" };
export const dynamic = "force-dynamic";

type Linha = { codigo: number; ordem: number; hora: string; hora_fim: string | null; cliente: string; telefone: string | null; corretor: string | null; equipe: string | null; tipo: string; situacao: string; resultado: string | null; midia: string | null; observacoes: string | null };

export default async function Visita({ searchParams }: { searchParams: Promise<{ e?: string; d?: string }> }) {
  const u = await exigirLogin();
  const sp = await searchParams;
  const emps = await empreendimentosAtivos();
  const emp = Number(sp.e) || emps[0]?.codigo || 0;
  const hoje = agora(config.fuso).data;
  const data = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : hoje;
  const vez = emp && data === hoje ? proximo(await fila(hoje, emp)) : null;
  const linhas = emp ? await todos<Linha>(
    `SELECT a.codigo, a.ordem, a.hora, a.hora_fim, c.nome AS cliente, c.telefone, co.nome AS corretor, e.nome AS equipe, a.tipo, a.situacao, a.resultado, a.midia, a.observacoes
       FROM atendimentos a JOIN clientes c ON c.codigo = a.cliente LEFT JOIN corretores co ON co.codigo = a.corretor LEFT JOIN equipes e ON e.codigo = a.equipe
      WHERE a.data = $1 AND a.empreendimento = $2 ORDER BY a.ordem DESC`, [data, emp]) : [];

  return (
    <Pagina titulo="Registro de visitas" sub={`Atendimentos de ${dataBR(data)}`}>
      <SeletorEmpreendimento opcoes={emps} atual={emp} comData={data} />
      {emp > 0 && (
        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          {data === hoje ? (
            <aside className="cartao h-fit">
              <h2 className="mb-1 font-semibold">Nova visita</h2>
              <p className="mb-3 text-sm">Próximo da roleta: {vez ? <b>{vez.nome}</b> : <span className="text-red-700">nenhum corretor disponível</span>}</p>
              <FormVisita empreendimento={emp} corretores={await corretoresAtivos()} />
            </aside>
          ) : <aside className="cartao h-fit text-sm text-cinza">Consultando um dia anterior. Novas visitas só podem ser registradas na data de hoje.</aside>}
          <section className="cartao overflow-x-auto">
            <h2 className="mb-2 font-semibold">Visitas do dia ({linhas.length})</h2>
            {linhas.length === 0 ? <p className="text-sm text-cinza">Nenhuma visita registrada.</p> : (
              <table className="tabela">
                <thead><tr><th>Nº</th><th>Hora</th><th>Cliente</th><th>Corretor</th><th>Tipo</th><th>Situação / resultado</th></tr></thead>
                <tbody>
                  {linhas.map((a) => (
                    <tr key={a.codigo} className="align-top">
                      <td className="font-bold tabular-nums">{a.ordem}</td>
                      <td className="tabular-nums">{horaBR(a.hora)}{a.hora_fim && <span className="text-xs text-cinza"><br />até {horaBR(a.hora_fim)}</span>}</td>
                      <td><div className="font-medium">{a.cliente}</div><div className="text-xs text-cinza">{telefoneBR(a.telefone)}{a.midia && ` · ${a.midia}`}</div>{a.observacoes && <div className="mt-1 text-xs italic text-cinza">{a.observacoes}</div>}</td>
                      <td>{a.corretor}<div className="text-xs text-cinza">{a.equipe}</div></td>
                      <td>{a.tipo}</td>
                      <td className="min-w-56">
                        {a.situacao === "Finalizado" ? <span className="font-semibold">{a.resultado}</span> : <Finalizar codigo={a.codigo} />}
                        {eSupervisor(u) && <div className="mt-1"><BotaoAcao acao={excluirAtendimento} campos={{ codigo: a.codigo }} rotulo="Excluir" classe="text-xs text-red-700 hover:underline cursor-pointer" confirmar="Excluir este atendimento?" /></div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </Pagina>
  );
}
