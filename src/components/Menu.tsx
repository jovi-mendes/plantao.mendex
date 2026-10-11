"use client";
// Menu em cascata: CADASTRO / ATENDIMENTO / RELATÓRIO (no celular vira lista expansível)
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Item = { href: string; rotulo: string; supervisor?: boolean };
const MENU: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "Cadastro",
    itens: [
      { href: "/cadastro/clientes", rotulo: "Cliente" },
      { href: "/cadastro/corretores", rotulo: "Corretores", supervisor: true },
      { href: "/cadastro/equipes", rotulo: "Equipes", supervisor: true },
      { href: "/cadastro/incorporadoras", rotulo: "Incorporadoras", supervisor: true },
      { href: "/cadastro/empreendimentos", rotulo: "Empreendimentos", supervisor: true },
      { href: "/cadastro/usuarios", rotulo: "Usuários", supervisor: true },
    ],
  },
  {
    titulo: "Atendimento",
    itens: [
      { href: "/atendimento/visita", rotulo: "Visita" },
      { href: "/atendimento/roleta", rotulo: "Roleta" },
    ],
  },
  {
    titulo: "Relatório",
    itens: [
      { href: "/relatorio/atendimento", rotulo: "Atendimento" },
      { href: "/relatorio/sorteio", rotulo: "Sorteio" },
    ],
  },
];

export default function Menu({ supervisor, nome, sair }: { supervisor: boolean; nome: string; sair: () => Promise<void> }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [movel, setMovel] = useState(false);
  const rota = usePathname();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(null); };
    document.addEventListener("click", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", fora); document.removeEventListener("keydown", esc); };
  }, []);
  // fecha ao navegar (ajuste durante a renderização, sem efeito)
  const [rotaVista, setRotaVista] = useState(rota);
  if (rota !== rotaVista) { setRotaVista(rota); setAberto(null); setMovel(false); }

  const grupos = MENU.map((g) => ({ ...g, itens: g.itens.filter((i) => supervisor || !i.supervisor) }));

  return (
    <header ref={ref} className="nao-imprimir sticky top-0 z-30 bg-tinta text-white shadow">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
        <Link href="/" className="mr-4 flex items-center gap-2 font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-md bg-destaque text-tinta">P</span>
          <span>Plantão <span className="text-destaque">Mendex</span></span>
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {grupos.map((g) => (
            <div key={g.titulo} className="relative" onMouseEnter={() => setAberto(g.titulo)} onMouseLeave={() => setAberto(null)}>
              <button type="button" aria-expanded={aberto === g.titulo} onClick={() => setAberto(aberto === g.titulo ? null : g.titulo)}
                className={`flex h-14 items-center gap-1 px-3 text-sm font-semibold uppercase tracking-wide hover:text-destaque ${g.itens.some((i) => rota.startsWith(i.href)) ? "text-destaque" : ""}`}>
                {g.titulo}
                <svg viewBox="0 0 20 20" className={`size-4 transition ${aberto === g.titulo ? "rotate-180" : ""}`} fill="currentColor"><path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
              </button>
              {aberto === g.titulo && (
                <div className="absolute top-full left-0 min-w-52 overflow-hidden rounded-b-lg border border-linha bg-white py-1 text-tinta shadow-lg">
                  {g.itens.map((i) => (
                    <Link key={i.href} href={i.href} className={`block px-4 py-2 text-sm hover:bg-fundo ${rota.startsWith(i.href) ? "font-semibold text-destaque-escuro" : ""}`}>{i.rotulo}</Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-3 text-sm md:flex">
          <span className="text-white/80">{nome}</span>
          <form action={sair}><button className="rounded-md border border-white/30 px-3 py-1.5 hover:bg-white/10">Sair</button></form>
        </div>
        <button type="button" className="ml-auto rounded-md p-2 hover:bg-white/10 md:hidden" aria-label="Abrir menu" onClick={() => setMovel(!movel)}>
          <svg viewBox="0 0 24 24" className="size-6" stroke="currentColor" strokeWidth="2" fill="none"><path d={movel ? "M6 6l12 12M18 6 6 18" : "M4 7h16M4 12h16M4 17h16"} /></svg>
        </button>
      </div>
      {movel && (
        <nav className="border-t border-white/10 px-4 pb-4 md:hidden">
          {grupos.map((g) => (
            <details key={g.titulo} className="border-b border-white/10" open={g.itens.some((i) => rota.startsWith(i.href))}>
              <summary className="cursor-pointer py-3 text-sm font-semibold uppercase tracking-wide">{g.titulo}</summary>
              <div className="pb-2 pl-3">
                {g.itens.map((i) => <Link key={i.href} href={i.href} className="block py-2 text-sm text-white/85">{i.rotulo}</Link>)}
              </div>
            </details>
          ))}
          <div className="flex items-center justify-between pt-3 text-sm">
            <span className="text-white/80">{nome}</span>
            <form action={sair}><button className="rounded-md border border-white/30 px-3 py-1.5">Sair</button></form>
          </div>
        </nav>
      )}
    </header>
  );
}
