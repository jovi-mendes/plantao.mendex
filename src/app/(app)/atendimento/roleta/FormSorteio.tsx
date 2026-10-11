"use client";
import { useState } from "react";
import { sortear } from "@/app/acoes/roleta";
import Mensagem from "@/components/Mensagem";
import { useEnvio } from "@/components/useEnvio";

export default function FormSorteio({ empreendimento, corretores, jaTemFila }: { empreendimento: number; corretores: { codigo: number; nome: string; equipe: string | null }[]; jaTemFila: boolean }) {
  const [estado, enviar, pendente] = useEnvio(sortear, {});
  const [marcados, setMarcados] = useState<Set<number>>(new Set());
  const alternar = (c: number) => setMarcados((m) => { const n = new Set(m); if (n.has(c)) n.delete(c); else n.add(c); return n; });
  if (!corretores.length) return <><Mensagem erro={estado.erro} ok={estado.ok} /><p className="text-sm text-cinza">Todos os corretores ativos já estão na fila.</p></>;
  return (
    <form onSubmit={(e) => { enviar(e); setMarcados(new Set()); }}>
      <Mensagem erro={estado.erro} ok={estado.ok} />
      <input type="hidden" name="empreendimento" value={empreendimento} />
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="size-4 accent-tinta" checked={marcados.size === corretores.length}
          onChange={(e) => setMarcados(e.target.checked ? new Set(corretores.map((c) => c.codigo)) : new Set())} /> Marcar todos
      </label>
      <div className="max-h-80 space-y-1 overflow-y-auto rounded-md border border-linha p-2">
        {corretores.map((c) => (
          <label key={c.codigo} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-fundo">
            <input type="checkbox" name="corretor" value={c.codigo} checked={marcados.has(c.codigo)} onChange={() => alternar(c.codigo)} className="size-4 accent-tinta" />
            <span>{c.nome}</span>{c.equipe && <span className="ml-auto text-xs text-cinza">{c.equipe}</span>}
          </label>
        ))}
      </div>
      <button className="btn-primario mt-3 w-full" disabled={pendente || marcados.size === 0}>
        {pendente ? "Sorteando…" : jaTemFila ? `Incluir ${marcados.size || ""} na fila` : `Sortear ${marcados.size || ""} corretor(es)`}
      </button>
    </form>
  );
}
