"use client";
import { excluir, salvar } from "@/app/acoes/cadastro";
import CampoTelefone from "@/components/CampoTelefone";
import Mensagem from "@/components/Mensagem";
import { useEnvio } from "@/components/useEnvio";
import { ENTIDADES } from "@/lib/entidades";

export default function FormCadastro({ entidade, registro, opcoes }: {
  entidade: string; registro: Record<string, unknown> | null; opcoes: Record<string, { valor: number; rotulo: string }[]>;
}) {
  const ent = ENTIDADES[entidade];
  const [estado, enviar, pendente] = useEnvio(salvar, {});
  const [estadoEx, enviarEx, pendenteEx] = useEnvio(excluir, {});
  const v = (n: string) => (registro?.[n] ?? "") as string;

  return (
    <>
      <Mensagem erro={estado.erro ?? estadoEx.erro} />
      <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="_entidade" value={ent.slug} />
        <input type="hidden" name="_codigo" value={String(registro?.codigo ?? "")} />
        {ent.campos.map((c) => (
          <div key={c.nome} className={c.largura === "inteira" ? "sm:col-span-2" : ""}>
            {c.tipo === "booleano" ? (
              <label className="mt-6 flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name={c.nome} defaultChecked={registro ? !!registro[c.nome] : true} className="size-4 accent-tinta" /> {c.rotulo}
              </label>
            ) : (
              <>
                <label className="rotulo" htmlFor={c.nome}>{c.rotulo}{c.obrigatorio && " *"}</label>
                {c.tipo === "telefone" ? <CampoTelefone id={c.nome} name={c.nome} valor={v(c.nome)} />
                  : c.tipo === "fk" ? (
                    <select id={c.nome} name={c.nome} defaultValue={v(c.nome)} className="entrada" required={c.obrigatorio}>
                      <option value="">— selecione —</option>
                      {opcoes[c.nome]?.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                    </select>
                  ) : c.tipo === "opcoes" ? (
                    <select id={c.nome} name={c.nome} defaultValue={v(c.nome) || c.opcoes?.[0]} className="entrada">
                      {c.opcoes?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input id={c.nome} name={c.nome} type={c.tipo === "email" ? "email" : c.tipo === "senha" ? "password" : "text"} defaultValue={c.tipo === "senha" ? "" : v(c.nome)}
                      required={c.obrigatorio || (c.tipo === "senha" && !registro)} autoComplete={c.tipo === "senha" ? "new-password" : "off"}
                      placeholder={c.tipo === "senha" && registro ? "Deixe em branco para manter" : undefined} className="entrada" />
                  )}
              </>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button className="btn-primario" disabled={pendente}>{pendente ? "Salvando…" : "Salvar"}</button>
        </div>
      </form>
      {registro && (
        <form onSubmit={(e) => { if (confirm(`Excluir este ${ent.singular.toLowerCase()}?`)) enviarEx(e); else e.preventDefault(); }} className="mt-4 border-t border-linha pt-4">
          <input type="hidden" name="_entidade" value={ent.slug} />
          <input type="hidden" name="_codigo" value={String(registro.codigo)} />
          <button className="btn-perigo" disabled={pendenteEx}>Excluir</button>
        </form>
      )}
    </>
  );
}
