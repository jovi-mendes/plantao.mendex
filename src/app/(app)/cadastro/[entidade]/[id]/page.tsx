import Link from "next/link";
import { notFound } from "next/navigation";
import Pagina from "@/components/Pagina";
import { exigirLogin, exigirSupervisor } from "@/lib/auth";
import { todos, um } from "@/lib/db";
import { ENTIDADES } from "@/lib/entidades";
import { dataBR, horaBR, telefoneBR } from "@/lib/formato";
import FormCadastro from "./FormCadastro";

export default async function Editar({ params }: { params: Promise<{ entidade: string; id: string }> }) {
  const { entidade, id } = await params;
  const ent = ENTIDADES[entidade];
  if (!ent) notFound();
  if (ent.supervisor) await exigirSupervisor(); else await exigirLogin();
  const novo = id === "novo";
  if (!novo && !/^\d+$/.test(id)) notFound();
  const colunas = ent.campos.filter((c) => c.tipo !== "senha").map((c) => c.nome);
  const reg = novo ? null : await um<Record<string, unknown>>(`SELECT codigo, ${colunas.join(", ")} FROM ${ent.tabela} WHERE codigo = $1`, [Number(id)]);
  if (!novo && !reg) notFound();

  // opções das chaves estrangeiras
  const opcoes: Record<string, { valor: number; rotulo: string }[]> = {};
  for (const c of ent.campos) {
    if (c.fk) opcoes[c.nome] = await todos(`SELECT codigo AS valor, ${c.fk.rotulo} AS rotulo FROM ${c.fk.tabela} ORDER BY 2`);
  }

  // listas relacionadas
  const corretores = ent.slug === "equipes" && reg
    ? await todos<{ codigo: number; nome: string; creci: string | null; telefone: string | null; ativo: boolean }>("SELECT codigo, nome, creci, telefone, ativo FROM corretores WHERE equipe = $1 ORDER BY nome", [reg.codigo])
    : [];
  const visitas = ent.slug === "clientes" && reg
    ? await todos<{ codigo: number; data: string; hora: string; empreendimento: string; corretor: string | null; tipo: string; resultado: string | null }>(
      `SELECT a.codigo, a.data, a.hora, p.empreendimento, co.nome AS corretor, a.tipo, a.resultado FROM atendimentos a
         JOIN empreendimentos p ON p.codigo = a.empreendimento LEFT JOIN corretores co ON co.codigo = a.corretor
        WHERE a.cliente = $1 ORDER BY a.data DESC, a.hora DESC`, [reg.codigo])
    : [];

  return (
    <Pagina titulo={novo ? `Novo ${ent.singular.toLowerCase()}` : `${ent.singular} nº ${reg!.codigo}`}
      acoes={<Link href={`/cadastro/${ent.slug}`} className="btn-contorno">‹ Voltar</Link>}>
      <div className="cartao max-w-3xl">
        <FormCadastro entidade={ent.slug} registro={reg} opcoes={opcoes} />
      </div>
      {ent.slug === "equipes" && reg && (
        <section className="cartao mt-5 max-w-3xl overflow-x-auto">
          <h2 className="mb-2 font-semibold">Corretores da equipe ({corretores.length})</h2>
          {corretores.length === 0 ? <p className="text-sm text-cinza">Nenhum corretor. Vincule pelo cadastro de Corretores.</p> : (
            <table className="tabela"><thead><tr><th>Nome</th><th>CRECI</th><th>Telefone</th><th>Ativo</th></tr></thead>
              <tbody>{corretores.map((c) => <tr key={c.codigo}><td><Link className="hover:underline" href={`/cadastro/corretores/${c.codigo}`}>{c.nome}</Link></td><td>{c.creci}</td><td>{telefoneBR(c.telefone)}</td><td>{c.ativo ? "Sim" : "Não"}</td></tr>)}</tbody></table>
          )}
        </section>
      )}
      {ent.slug === "clientes" && reg && (
        <section className="cartao mt-5 max-w-3xl overflow-x-auto">
          <h2 className="mb-2 font-semibold">Histórico de visitas ({visitas.length})</h2>
          {visitas.length === 0 ? <p className="text-sm text-cinza">Nenhuma visita registrada.</p> : (
            <table className="tabela"><thead><tr><th>Data</th><th>Hora</th><th>Empreendimento</th><th>Corretor</th><th>Tipo</th><th>Resultado</th></tr></thead>
              <tbody>{visitas.map((v) => <tr key={v.codigo}><td>{dataBR(v.data)}</td><td>{horaBR(v.hora)}</td><td>{v.empreendimento}</td><td>{v.corretor}</td><td>{v.tipo}</td><td>{v.resultado ?? "—"}</td></tr>)}</tbody></table>
          )}
        </section>
      )}
    </Pagina>
  );
}
