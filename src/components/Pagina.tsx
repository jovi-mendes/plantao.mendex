// Cabeçalho padrão das páginas
export default function Pagina({ titulo, sub, acoes, children }: { titulo: string; sub?: string; acoes?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
          {sub && <p className="mt-0.5 text-sm text-cinza">{sub}</p>}
        </div>
        {acoes && <div className="nao-imprimir flex flex-wrap gap-2">{acoes}</div>}
      </div>
      {children}
    </main>
  );
}
