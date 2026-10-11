// Exportação do relatório de atendimento em CSV (abre no Excel: separador ";" e BOM UTF-8)
import { usuario } from "@/lib/auth";
import { config } from "@/lib/config";
import { agora, dataBR, horaBR, telefoneBR } from "@/lib/formato";
import { atendimentos, normalizar, type Filtros } from "@/lib/relatorios";

export async function GET(req: Request) {
  if (!(await usuario())) return new Response("Não autorizado", { status: 401 });
  const sp = Object.fromEntries(new URL(req.url).searchParams) as Partial<Filtros>;
  const f = normalizar(sp, agora(config.fuso).data);
  const linhas = await atendimentos(f);
  const cel = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const cab = ["Data", "Ordem", "Hora", "Hora fim", "Construtora", "Empreendimento", "Cliente", "Telefone", "E-mail", "Corretor", "Equipe", "Empresa", "Tipo", "Situação", "Resultado", "Mídia", "Observações"];
  const corpo = linhas.map((l) => [dataBR(l.data), l.ordem, horaBR(l.hora), horaBR(l.hora_fim), l.construtora, l.empreendimento, l.cliente, telefoneBR(l.telefone), l.email,
    l.corretor, l.equipe, l.empresa, l.tipo, l.situacao, l.resultado, l.midia, l.observacoes].map(cel).join(";"));
  return new Response("﻿" + [cab.map(cel).join(";"), ...corpo].join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="atendimentos_${f.de}_${f.ate}.csv"` },
  });
}
