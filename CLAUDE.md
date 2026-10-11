# Plantão Mendex — guia para o Claude Code

Controle de atendimento (visitas) e roleta de corretores do plantão de vendas.
**Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + PostgreSQL (pg)**. Produção: https://plantao.mendex.app.br. Detalhes no README.

## Comandos (sem Node no servidor)

```bash
docker run --rm -v "$PWD":/app -w /app node:24-alpine sh -c 'npm ci && npx tsc --noEmit && npx eslint . && npx next build'
docker compose up -d --build
```

## Estrutura

- `src/lib/` — servidor: `db.ts` (pg, `tx()` com advisory lock), `auth.ts` (JWT no cookie `pm_sessao`, funções Supervisor/Recepção), `roleta.ts` (regras do rodízio), `relatorios.ts`, `consultas.ts`; `entidades.ts` define os cadastros genéricos; `formato.ts` serve servidor e navegador.
- `src/app/acoes/` — Server Actions (`"use server"`: só funções assíncronas exportadas).
- `src/app/(app)/` — páginas logadas (layout com o menu em cascata `components/Menu.tsx`).
- `src/app/(app)/cadastro/[entidade]` — lista e formulário genéricos guiados por `ENTIDADES`.

## Regras

- Toda página/ação protegida chama `exigirLogin()` ou `exigirSupervisor()`.
- Registro de visita e sorteio rodam em `tx(..., "roleta:<data>:<empreendimento>")` para serializar a fila.
- Mudanças de esquema: edite `scripts/schema.sql` de forma idempotente e aplique com `docker exec -i postgres psql -U plantao -d plantao < scripts/schema.sql`.
- Formulários com Server Action usam `useEnvio` para não limpar os campos num erro.
- Segredos só no `.env` (fora do Git). Textos em português do Brasil com acentuação.

## Infra

Container `plantao.mendex.app.br` (alias `plantao-app:3000`) na rede Docker `proxy`; Caddy em `/opt/caddy/Caddyfile` (edite com `cat >>` e `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`); banco `plantao` no container `postgres`.
