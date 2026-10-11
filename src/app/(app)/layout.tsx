import { sair } from "@/app/acoes/login";
import { eSupervisor, exigirLogin } from "@/lib/auth";
import Menu from "@/components/Menu";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const u = await exigirLogin();
  return (
    <>
      <Menu supervisor={eSupervisor(u)} nome={`${u.nome} · ${u.funcao}`} sair={sair} />
      {children}
    </>
  );
}
