# Plantão Mendex

Sistema de **controle de atendimento de clientes no plantão de vendas** e **roleta (sorteio/rodízio) de corretores**.

Em produção em **https://plantao.mendex.app.br**.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · PostgreSQL 17 (driver `pg`, sem ORM) · Docker + Caddy.

## Menu

| CADASTRO | ATENDIMENTO | RELATÓRIO |
|---|---|---|
| Cliente · Corretores · Equipes · Incorporadoras · Empreendimentos · Usuários | Visita · Roleta | Atendimento · Sorteio |

Perfis (`usuarios.funcao`):
- **Supervisor**: acesso total (todos os cadastros, exclusões, remover da roleta).
- **Recepção**: cadastra clientes, registra visitas, opera a roleta e consulta relatórios.

## Banco de dados

Esquema em [`scripts/schema.sql`](scripts/schema.sql) (idempotente).

```
incorporadoras 1──N empreendimentos
incorporadoras 1──N equipes 1──N corretores
roleta        : data × empreendimento × corretor (sorteio = posição; equipe/gerente/empresa gravados no dia)
atendimentos  : data/hora/ordem × construtora × empreendimento × cliente × corretor (equipe e empresa gravadas na hora)
usuarios      : login (e-mail + senha bcrypt) e função Supervisor/Recepção
```

| Tabela | Campos principais |
|---|---|
| `clientes` | codigo, nome, telefone, email, endereco, cidade, bairro |
| `incorporadoras` | codigo, construtora, contato, telefone, email |
| `empreendimentos` | codigo, incorporadora → incorporadoras, empreendimento, tipologia, bairro, ativo |
| `corretores` | codigo, empresa, equipe → equipes, nome, creci, telefone, ativo |
| `equipes` | codigo, nome, incorporadora → incorporadoras, gerente, telefone, email (corretores da equipe = `corretores.equipe`) |
| `usuarios` | codigo, nome, telefone, email, senha_hash, funcao (Supervisor/Recepção), ativo |
| `roleta` | codigo, data, empreendimento, sorteio, corretor, equipe, gerente, empresa, vez_inicial, pulos, situacao |
| `atendimentos` | codigo, data, hora, ordem, construtora, empreendimento, cliente, corretor, equipe, empresa, tipo, situacao, resultado, midia, hora_fim, observacoes |

## Rotinas implantadas

Baseadas nas práticas de plantão de vendas imobiliário (rodízio justo entre corretores, um cliente por corretor, controle de retorno):

1. **Sorteio do dia** — os corretores presentes são sorteados (embaralhamento criptográfico) e formam a fila do plantão de cada empreendimento.
2. **Rodízio em rodadas** — a vez é de quem tem menos atendimentos de roleta; no empate, vale a ordem do sorteio. Todos atendem um cliente antes de alguém receber o segundo.
3. **Ocupado não perde a vez** — corretor com cliente em atendimento é pulado, mas volta a ser o próximo quando finaliza.
4. **Chegou atrasado entra no fim da rodada** — sem furar a fila de quem já estava.
5. **Pular vez / Pausar / Saiu** — "pular" conta como vez usada; pausado e quem saiu não recebem clientes.
6. **Cliente de retorno** — a recepção busca o cliente por nome/telefone; se ele já visitou o empreendimento, o sistema avisa e sugere registrar como *Retorno* para o mesmo corretor (não conta na roleta). Telefone repetido reaproveita o cadastro.
7. **Indicação / Agendado** — vão direto ao corretor escolhido, fora da roleta.
8. **Fechamento do atendimento** — resultado (Interessado, Agendou retorno, Proposta, Venda, Sem interesse) e hora de término.
9. **Mídia de origem** — "como conheceu" para medir os canais de captação.
10. **Relatórios** — atendimentos por corretor, equipe, empreendimento, mídia e resultado, com taxa de conversão, exportação CSV (Excel) e impressão; relatório de sorteios com participação dos corretores no período.

## Desenvolvimento

Não há Node instalado no servidor: tudo roda em container.

```bash
# checagens e build
docker run --rm -v "$PWD":/app -w /app node:24-alpine sh -c 'npm ci && npx tsc --noEmit && npx eslint . && npx next build'

# publicar (gera a imagem e recria o container)
docker compose up -d --build
docker logs -f plantao.mendex.app.br
```

Configuração em `.env` (modelo em [`.env.exemplo`](.env.exemplo)).

### Primeira instalação

```bash
docker exec -i postgres psql -U postgres -c "CREATE ROLE plantao LOGIN PASSWORD '...'" -c "CREATE DATABASE plantao OWNER plantao"
docker exec -i postgres psql -U plantao -d plantao < scripts/schema.sql
# primeiro supervisor (gere o hash bcrypt da senha):
docker run --rm -v "$PWD":/app -w /app node:24-alpine node -e "require('bcryptjs').hash(process.argv[1],10).then(console.log)" 'SENHA'
# INSERT INTO usuarios (nome, email, senha_hash, funcao) VALUES ('Supervisor', 'email@dominio', '<hash>', 'Supervisor');
```

HTTPS pelo Caddy (`/opt/caddy/Caddyfile`):

```
plantao.mendex.app.br {
	encode zstd gzip
	reverse_proxy plantao-app:3000
}
```
