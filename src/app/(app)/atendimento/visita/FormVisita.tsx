"use client";
import { useEffect, useState } from "react";
import { buscarCliente, registrar, type ClienteAchado } from "@/app/acoes/atendimento";
import CampoTelefone from "@/components/CampoTelefone";
import Mensagem from "@/components/Mensagem";
import { useEnvio } from "@/components/useEnvio";
import { dataBR, MIDIAS, telefoneBR, TIPOS } from "@/lib/formato";

export default function FormVisita({ empreendimento, corretores }: { empreendimento: number; corretores: { codigo: number; nome: string; equipe: string | null }[] }) {
  const [estado, enviar, pendente] = useEnvio(registrar, {});
  const [termo, setTermo] = useState("");
  const [achados, setAchados] = useState<ClienteAchado[]>([]);
  const [cliente, setCliente] = useState<ClienteAchado | null>(null);
  const [tipo, setTipo] = useState<string>("Roleta");
  const [corretor, setCorretor] = useState("");

  // busca com atraso enquanto digita
  useEffect(() => {
    if (cliente || termo.trim().length < 3) return;
    const t = setTimeout(() => buscarCliente(termo).then(setAchados), 300);
    return () => clearTimeout(t);
  }, [termo, cliente]);

  // depois de registrar, limpa para o próximo cliente (a "versao" recria os campos não controlados)
  const [visto, setVisto] = useState(estado);
  const [versao, setVersao] = useState(0);
  if (estado !== visto) {
    setVisto(estado);
    if (estado.ok) { setCliente(null); setTermo(""); setAchados([]); setTipo("Roleta"); setCorretor(""); setVersao((v) => v + 1); }
  }

  const escolher = (c: ClienteAchado) => {
    setCliente(c); setAchados([]);
    // cliente que já veio: sugere retorno ao mesmo corretor
    if (c.ultimo_corretor) { setTipo("Retorno"); setCorretor(String(c.ultimo_corretor)); }
  };

  return (
    <form onSubmit={enviar} className="space-y-3">
      <Mensagem erro={estado.erro} ok={estado.ok} />
      <input type="hidden" name="empreendimento" value={empreendimento} />
      <input type="hidden" name="cliente" value={cliente?.codigo ?? ""} />
      <div key={versao} className="space-y-3">

      {cliente ? (
        <div className="rounded-md border border-linha bg-fundo p-3 text-sm">
          <div className="flex justify-between gap-2"><b>{cliente.nome}</b><button type="button" className="text-xs text-destaque-escuro hover:underline" onClick={() => { setCliente(null); setTipo("Roleta"); setCorretor(""); }}>trocar</button></div>
          <div className="text-xs text-cinza">{telefoneBR(cliente.telefone)} {cliente.email}</div>
          {cliente.ultima_data && <div className="mt-1 text-xs text-amber-800">Última visita: {dataBR(cliente.ultima_data)} · {cliente.ultimo_empreendimento} · {cliente.ultimo_corretor_nome}</div>}
        </div>
      ) : (
        <>
          <div className="relative">
            <label className="rotulo" htmlFor="busca">Buscar cliente cadastrado</label>
            <input id="busca" className="entrada" placeholder="Nome, telefone ou e-mail" value={termo} autoComplete="off" onChange={(e) => { setTermo(e.target.value); if (e.target.value.trim().length < 3) setAchados([]); }} />
            {achados.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-linha bg-white shadow-lg">
                {achados.map((c) => (
                  <li key={c.codigo}><button type="button" onClick={() => escolher(c)} className="block w-full px-3 py-2 text-left text-sm hover:bg-fundo">
                    <b>{c.nome}</b> <span className="text-xs text-cinza">{telefoneBR(c.telefone)}</span>
                    {c.ultimo_corretor_nome && <span className="block text-xs text-amber-800">já atendido por {c.ultimo_corretor_nome}</span>}
                  </button></li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-cinza">…ou cadastre um cliente novo:</p>
          <div><label className="rotulo" htmlFor="cliente_nome">Nome *</label><input id="cliente_nome" name="cliente_nome" className="entrada" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="rotulo" htmlFor="cliente_telefone">Telefone</label><CampoTelefone id="cliente_telefone" name="cliente_telefone" /></div>
            <div><label className="rotulo" htmlFor="cliente_email">E-mail</label><input id="cliente_email" name="cliente_email" type="email" className="entrada" /></div>
            <div><label className="rotulo" htmlFor="cliente_bairro">Bairro</label><input id="cliente_bairro" name="cliente_bairro" className="entrada" /></div>
            <div><label className="rotulo" htmlFor="cliente_cidade">Cidade</label><input id="cliente_cidade" name="cliente_cidade" className="entrada" /></div>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="rotulo" htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" className="entrada" value={tipo} onChange={(e) => setTipo(e.target.value)}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
        </div>
        <div>
          <label className="rotulo" htmlFor="midia">Como conheceu</label>
          <select id="midia" name="midia" className="entrada" defaultValue=""><option value="">—</option>{MIDIAS.map((m) => <option key={m}>{m}</option>)}</select>
        </div>
      </div>
      {tipo !== "Roleta" ? (
        <div>
          <label className="rotulo" htmlFor="corretor">Corretor *</label>
          <select id="corretor" name="corretor" className="entrada" value={corretor} onChange={(e) => setCorretor(e.target.value)} required>
            <option value="">— selecione —</option>
            {corretores.map((c) => <option key={c.codigo} value={c.codigo}>{c.nome}{c.equipe ? ` (${c.equipe})` : ""}</option>)}
          </select>
          <p className="mt-1 text-xs text-cinza">Não conta na roleta.</p>
        </div>
      ) : estado.retorno && (
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="forcar" className="size-4 accent-tinta" /> Ignorar e usar a roleta</label>
      )}
      <div><label className="rotulo" htmlFor="observacoes">Observações</label><textarea id="observacoes" name="observacoes" rows={2} className="entrada h-auto py-2" /></div>
      </div>
      <button className="btn-destaque w-full" disabled={pendente}>{pendente ? "Registrando…" : tipo === "Roleta" ? "Registrar e chamar próximo da roleta" : "Registrar visita"}</button>
    </form>
  );
}
