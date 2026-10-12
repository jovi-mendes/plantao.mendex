// Logo Mendex (versão compacta, sem slogan). "clara" = para fundo escuro
import Image from "next/image";

export default function Marca({ clara = false, altura = 28, sistema }: { clara?: boolean; altura?: number; sistema?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <Image src={clara ? "/brand/mendex-logo-compacta-branco.png" : "/brand/mendex-logo-compacta.png"} alt="Mendex" width={Math.round(altura * 640 / 140)} height={altura} priority />
      {sistema && <span className={`border-l pl-2.5 text-sm font-semibold tracking-wide uppercase ${clara ? "border-white/30 text-ciano" : "border-linha text-destaque"}`}>{sistema}</span>}
    </span>
  );
}
