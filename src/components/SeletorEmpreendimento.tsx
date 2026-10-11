"use client";
// Troca o empreendimento (e a data, quando houver) pela URL
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function SeletorEmpreendimento({ opcoes, atual, comData }: { opcoes: { codigo: number; rotulo: string }[]; atual: number; comData?: string }) {
  const router = useRouter();
  const rota = usePathname();
  const sp = useSearchParams();
  const ir = (k: string, v: string) => { const p = new URLSearchParams(sp); p.set(k, v); router.push(`${rota}?${p}`); };
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <label className="rotulo" htmlFor="emp">Empreendimento (plantão)</label>
        <select id="emp" className="entrada min-w-64" value={atual || ""} onChange={(e) => ir("e", e.target.value)}>
          {opcoes.length === 0 && <option value="">Cadastre um empreendimento</option>}
          {opcoes.map((o) => <option key={o.codigo} value={o.codigo}>{o.rotulo}</option>)}
        </select>
      </div>
      {comData !== undefined && (
        <div>
          <label className="rotulo" htmlFor="data">Data</label>
          <input id="data" type="date" className="entrada" value={comData} onChange={(e) => e.target.value && ir("d", e.target.value)} />
        </div>
      )}
    </div>
  );
}
