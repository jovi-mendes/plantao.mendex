import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { usuario } from "@/lib/auth";
import FormLogin from "./FormLogin";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login() {
  if (await usuario()) redirect("/");
  return (
    <main className="grid min-h-dvh place-items-center bg-tinta px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-7 shadow-xl">
        <div className="mb-6 flex items-center gap-2 text-xl font-bold">
          <span className="grid size-9 place-items-center rounded-md bg-destaque text-tinta">P</span>
          Plantão <span className="text-destaque-escuro">Mendex</span>
        </div>
        <FormLogin />
      </div>
    </main>
  );
}
