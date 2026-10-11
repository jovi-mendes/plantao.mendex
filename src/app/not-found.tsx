import Link from "next/link";
export default function NaoEncontrado() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div><h1 className="text-2xl font-bold">Página não encontrada</h1><Link href="/" className="btn-primario mt-4">Voltar ao início</Link></div>
    </main>
  );
}
