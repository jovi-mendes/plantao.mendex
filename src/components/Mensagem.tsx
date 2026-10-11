export default function Mensagem({ erro, ok }: { erro?: string; ok?: string }) {
  if (!erro && !ok) return null;
  return (
    <p role={erro ? "alert" : "status"} className={`mb-4 rounded-md border px-3 py-2 text-sm ${erro ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
      {erro ?? ok}
    </p>
  );
}
