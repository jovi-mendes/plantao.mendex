"use client";
import { entrar } from "@/app/acoes/login";
import Mensagem from "@/components/Mensagem";
import { useEnvio } from "@/components/useEnvio";

export default function FormLogin() {
  const [estado, enviar, pendente] = useEnvio(entrar, {});
  return (
    <form onSubmit={enviar} className="space-y-4">
      <Mensagem erro={estado.erro} />
      <div><label className="rotulo" htmlFor="email">E-mail</label><input id="email" name="email" type="email" required autoComplete="username" className="entrada" /></div>
      <div><label className="rotulo" htmlFor="senha">Senha</label><input id="senha" name="senha" type="password" required autoComplete="current-password" className="entrada" /></div>
      <button className="btn-primario w-full" disabled={pendente}>{pendente ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}
