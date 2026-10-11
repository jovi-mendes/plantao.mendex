"use client";
// Botão que dispara uma Server Action com campos ocultos (pular, pausar, excluir...)
import { useActionState } from "react";

type Estado = { erro?: string; ok?: string };
export default function BotaoAcao({ acao, campos, rotulo, classe = "btn-contorno", confirmar }: {
  acao: (e: Estado, f: FormData) => Promise<Estado>; campos: Record<string, string | number>; rotulo: string; classe?: string; confirmar?: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return (
    <form action={enviar} className="inline" onSubmit={(e) => { if (confirmar && !confirm(confirmar)) e.preventDefault(); }}>
      {Object.entries(campos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button className={classe} disabled={pendente}>{rotulo}</button>
      {estado.erro && <span role="alert" className="ml-2 text-xs text-red-700">{estado.erro}</span>}
    </form>
  );
}
