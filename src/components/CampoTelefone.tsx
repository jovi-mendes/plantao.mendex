"use client";
// Entrada com máscara (00) 00000-0000
import { useState } from "react";
import { telefoneBR } from "@/lib/formato";

function mascara(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function CampoTelefone({ name, valor, id, onChange }: { name: string; valor?: string | null; id?: string; onChange?: (v: string) => void }) {
  const [v, setV] = useState(telefoneBR(valor));
  return <input id={id} name={name} className="entrada" inputMode="tel" placeholder="(00) 00000-0000" value={v}
    onChange={(e) => { const m = mascara(e.target.value); setV(m); onChange?.(m); }} />;
}
