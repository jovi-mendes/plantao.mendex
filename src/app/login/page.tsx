import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { usuario } from "@/lib/auth";
import Marca from "@/components/Marca";
import FormLogin from "./FormLogin";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login() {
  if (await usuario()) redirect("/");
  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-br from-tinta via-tinta-2 to-destaque-escuro px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-7 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Marca altura={44} />
          <p className="text-xs font-semibold tracking-[0.2em] text-cinza uppercase">Plantão de vendas</p>
        </div>
        <FormLogin />
      </div>
    </main>
  );
}
