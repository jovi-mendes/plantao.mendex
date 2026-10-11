// Formatação (servidor e navegador)

export function dataBR(d: string | null | undefined): string {
  if (!d) return "";
  const [a, m, dia] = d.slice(0, 10).split("-");
  return `${dia}/${m}/${a}`;
}
export const horaBR = (h: string | null | undefined) => (h ? h.slice(0, 5) : "");

export function telefoneBR(t: string | null | undefined): string {
  const d = (t ?? "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t ?? "";
}
export const soDigitos = (t: string) => t.replace(/\D/g, "");

// data/hora de agora no fuso do plantão
export function agora(fuso = "America/Sao_Paulo"): { data: string; hora: string } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}:${p.second}` };
}

export const RESULTADOS = ["Interessado", "Agendou retorno", "Proposta", "Venda", "Sem interesse"] as const;
export const TIPOS = ["Roleta", "Retorno", "Indicação", "Agendado"] as const;
export const MIDIAS = ["Passou em frente", "Instagram", "Facebook", "Google", "Portal imobiliário", "Indicação", "Panfleto/Outdoor", "Corretor", "Outros"] as const;
