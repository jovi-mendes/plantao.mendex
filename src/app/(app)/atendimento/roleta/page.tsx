import type { Metadata } from "next";
import Link from "next/link";
import Pagina from "@/components/Pagina";
import BotaoAcao from "@/components/BotaoAcao";
import SeletorEmpreendimento from "@/components/SeletorEmpreendimento";
import { mudar, remover } from "@/app/acoes/roleta";
import { eSupervisor, exigirLogin } from "@/lib/auth";
import { config } from "@/lib/config";
import { corretoresAtivos, empreendimentosAtivos } from "@/lib/consultas";
import { agora, dataBR } from "@/lib/formato";
import { fila, proximo } from "@/lib/roleta";
import FormSorteio from "./FormSorteio";

export const metadata: Metadata = { title: "Roleta" };
export const dynamic = "force-dynamic";

const cor: Record<string, string> = { "Disponível": "bg-emerald-100 text-emerald-800", Pausado: "bg-amber-100 text-amber-800", Saiu: "bg-slate-200 text-slate-600" };

export default async function Roleta({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const u = await exigirLogin();
  const emps = await empreendimentosAtivos();
  const emp = Number((await searchParams).e) || emps[0]?.codigo || 0;
  const { data } = agora(config.fuso);
  const f = emp ? await fila(data, emp) : [];
  const vez = proximo(f);
  const naFila = new Set(f.map((p) => p.corretor));
  const fora = (await corretoresAtivos()).filter((c) => !naFila.has(c.codigo));

  return (
    <Pagina titulo="Roleta de corretores" sub={`Plantão de ${dataBR(data)} — rodízio pela ordem do sorteio`}
      acoes={<Link href={`/atendimento/visita?e=${emp}`} className="btn-destaque">+ Registrar visita</Link>}>
      <SeletorEmpreendimento opcoes={emps} atual={emp} />
      {emp > 0 && (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <section className="cartao overflow-x-auto">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Fila do dia</h2>
              {vez && <p className="rounded-full bg-destaque/20 px-3 py-1 text-sm">Próximo da vez: <b>{vez.nome}</b></p>}
            </div>
            {f.length === 0 ? <p className="text-sm text-cinza">Nenhum sorteio hoje. Marque os corretores presentes ao lado e clique em “Sortear”.</p> : (
              <table className="tabela">
                <thead><tr><th>Pos.</th><th>Sorteio</th><th>Corretor</th><th>Equipe / Gerente</th><th>Atend.</th><th>Situação</th><th className="nao-imprimir" /></tr></thead>
                <tbody>
                  {f.map((p, i) => (
                    <tr key={p.codigo} className={vez?.codigo === p.codigo ? "bg-destaque/10" : ""}>
                      <td className="font-bold tabular-nums">{p.situacao === "Disponível" ? i + 1 : "—"}</td>
                      <td className="tabular-nums">{p.sorteio}º</td>
                      <td>
                        <div className="font-medium">{p.nome}</div>
                        {p.em_atendimento > 0 && <div className="text-xs text-sky-700">em atendimento (não perde a vez)</div>}
                      </td>
                      <td className="text-xs">{p.equipe ?? "—"}<br /><span className="text-cinza">{p.gerente}</span></td>
                      <td className="tabular-nums">{p.atendimentos}{p.pulos > 0 && <span className="text-xs text-cinza"> (+{p.pulos} pulo{p.pulos > 1 ? "s" : ""})</span>}</td>
                      <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cor[p.situacao]}`}>{p.situacao}</span></td>
                      <td className="nao-imprimir">
                        <div className="flex flex-wrap justify-end gap-1">
                          {p.situacao === "Disponível" && <BotaoAcao acao={mudar} campos={{ codigo: p.codigo, acao: "pular" }} rotulo="Pular vez" confirmar={`${p.nome} perde esta vez?`} />}
                          {p.situacao === "Disponível" && <BotaoAcao acao={mudar} campos={{ codigo: p.codigo, acao: "pausar" }} rotulo="Pausar" />}
                          {p.situacao !== "Disponível" && <BotaoAcao acao={mudar} campos={{ codigo: p.codigo, acao: "retomar" }} rotulo="Retomar" />}
                          {p.situacao !== "Saiu" && <BotaoAcao acao={mudar} campos={{ codigo: p.codigo, acao: "saiu" }} rotulo="Saiu" />}
                          {eSupervisor(u) && p.atendimentos === 0 && <BotaoAcao acao={remover} campos={{ codigo: p.codigo }} rotulo="Remover" classe="btn-perigo" confirmar="Remover da fila de hoje?" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <aside className="cartao h-fit">
            <h2 className="mb-1 font-semibold">{f.length ? "Incluir corretor que chegou" : "Sorteio do dia"}</h2>
            <p className="mb-3 text-xs text-cinza">{f.length ? "Quem chega depois entra no fim da rodada atual." : "Marque os presentes; a ordem é sorteada aleatoriamente."}</p>
            <FormSorteio empreendimento={emp} corretores={fora} jaTemFila={f.length > 0} />
          </aside>
        </div>
      )}
      <details className="cartao mt-5 text-sm text-cinza">
        <summary className="cursor-pointer font-semibold text-tinta">Regras da roleta</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>A ordem inicial é sorteada entre os corretores presentes.</li>
          <li>A fila gira em rodadas: todos atendem um cliente antes de alguém receber o segundo.</li>
          <li>Corretor em atendimento é pulado, mas não perde a vez; volta a ser o próximo quando terminar.</li>
          <li>“Pular vez” conta como um atendimento usado. Pausado ou que saiu não recebe clientes.</li>
          <li>Cliente que já visitou o empreendimento volta para o mesmo corretor (Retorno) e não conta na roleta.</li>
        </ul>
      </details>
    </Pagina>
  );
}
