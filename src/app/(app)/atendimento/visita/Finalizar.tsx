"use client";
import { useActionState } from "react";
import { finalizar } from "@/app/acoes/atendimento";
import { RESULTADOS } from "@/lib/formato";

export default function Finalizar({ codigo }: { codigo: number }) {
  const [estado, enviar, pendente] = useActionState(finalizar, {});
  return (
    <form action={enviar} className="flex flex-wrap gap-1">
      <input type="hidden" name="codigo" value={codigo} />
      <select name="resultado" required defaultValue="" className="entrada h-9 w-auto flex-1 text-xs">
        <option value="" disabled>Resultado…</option>
        {RESULTADOS.map((r) => <option key={r}>{r}</option>)}
      </select>
      <button className="btn-contorno" disabled={pendente}>Finalizar</button>
      {estado.erro && <p role="alert" className="w-full text-xs text-red-700">{estado.erro}</p>}
    </form>
  );
}
