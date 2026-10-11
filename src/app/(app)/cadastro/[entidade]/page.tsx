import Link from "next/link";
import { notFound } from "next/navigation";
import Pagina from "@/components/Pagina";
import Mensagem from "@/components/Mensagem";
import { exigirLogin, exigirSupervisor } from "@/lib/auth";
import { like, todos } from "@/lib/db";
import { ENTIDADES } from "@/lib/entidades";
import { telefoneBR } from "@/lib/formato";

const POR_PAGINA = 50;

export default async function Lista({ params, searchParams }: { params: Promise<{ entidade: string }>; searchParams: Promise<{ q?: string; p?: string; ok?: string; excluido?: string }> }) {
  const { entidade } = await params;
  const ent = ENTIDADES[entidade];
  if (!ent) notFound();
  if (ent.supervisor) await exigirSupervisor(); else await exigirLogin();
  const { q = "", p = "1", ok, excluido } = await searchParams;
  const pagina = Math.max(1, Number(p) || 1);
  const filtro = q.trim() ? `WHERE ${ent.lista.busca.map((b) => `${b} ILIKE $1`).join(" OR ")}` : "";
  const linhas = await todos<Record<string, unknown>>(
    `${ent.lista.sql} ${filtro} ORDER BY ${ent.lista.ordem} LIMIT ${POR_PAGINA + 1} OFFSET ${(pagina - 1) * POR_PAGINA}`,
    q.trim() ? [like(q.trim())] : []);
  const mais = linhas.length > POR_PAGINA;
  const link = (n: number) => `?${new URLSearchParams({ ...(q ? { q } : {}), p: String(n) })}`;

  return (
    <Pagina titulo={ent.titulo} sub={`Cadastro de ${ent.titulo.toLowerCase()}`}
      acoes={<Link href={`/cadastro/${ent.slug}/novo`} className="btn-destaque">+ Novo {ent.singular.toLowerCase()}</Link>}>
      {ok && <Mensagem ok="Registro salvo." />}
      {excluido && <Mensagem ok="Registro excluído." />}
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar…" className="entrada max-w-md" />
        <button className="btn-primario">Buscar</button>
      </form>
      <div className="cartao overflow-x-auto p-0 sm:p-0">
        <table className="tabela">
          <thead><tr><th>Código</th>{ent.lista.colunas.map((c) => <th key={c.campo}>{c.rotulo}</th>)}<th /></tr></thead>
          <tbody>
            {linhas.slice(0, POR_PAGINA).map((l) => (
              <tr key={String(l.codigo)} className="hover:bg-fundo">
                <td className="tabular-nums text-cinza">{String(l.codigo)}</td>
                {ent.lista.colunas.map((c) => (
                  <td key={c.campo}>{c.tipo === "telefone" ? telefoneBR(l[c.campo] as string) : c.tipo === "booleano" ? (l[c.campo] ? "Sim" : "Não") : String(l[c.campo] ?? "")}</td>
                ))}
                <td className="text-right"><Link href={`/cadastro/${ent.slug}/${l.codigo}`} className="font-semibold text-destaque-escuro hover:underline">Editar</Link></td>
              </tr>
            ))}
            {linhas.length === 0 && <tr><td colSpan={ent.lista.colunas.length + 2} className="py-6 text-center text-cinza">Nenhum registro encontrado.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-2">
        {pagina > 1 && <Link href={link(pagina - 1)} className="btn-contorno">‹ Anterior</Link>}
        {mais && <Link href={link(pagina + 1)} className="btn-contorno">Próxima ›</Link>}
      </div>
    </Pagina>
  );
}
