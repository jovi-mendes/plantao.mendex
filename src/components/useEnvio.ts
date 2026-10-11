"use client";
// Envio de formulário para uma Server Action SEM limpar os campos (o <form action> do React 19 reseta
// os campos não controlados ao terminar; num erro de validação a pessoa perderia tudo o que digitou)
import { startTransition, useActionState, type FormEvent } from "react";

export function useEnvio<S>(acao: (estado: Awaited<S>, f: FormData) => Promise<S>, inicial: Awaited<S>) {
  const [estado, despachar, pendente] = useActionState(acao, inicial);
  const aoEnviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // inclui o botão clicado (name/value), como num envio normal
    const f = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => despachar(f));
  };
  return [estado, aoEnviar, pendente] as const;
}
