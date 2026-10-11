-- Plantão Mendex — esquema do banco (PostgreSQL 17)
-- Idempotente: pode rodar de novo sem perder dados.
--   docker exec -i postgres psql -U plantao -d plantao < scripts/schema.sql
--
-- Relacionamentos:
--   incorporadoras 1─N empreendimentos
--   incorporadoras 1─N equipes          (equipe de vendas que atende a construtora)
--   equipes        1─N corretores       (gerente da equipe = equipes.gerente)
--   roleta: corretor × data × empreendimento (sorteio = posição na fila do dia)
--   atendimentos: cliente × empreendimento × corretor (equipe, empresa e construtora gravadas na hora)

CREATE TABLE IF NOT EXISTS clientes (
  codigo     integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome       text NOT NULL,
  telefone   text,
  email      text,
  endereco   text,
  cidade     text,
  bairro     text,
  criado_em  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clientes_telefone_idx ON clientes (regexp_replace(telefone, '\D', '', 'g'));
CREATE INDEX IF NOT EXISTS clientes_nome_idx ON clientes (lower(nome));

CREATE TABLE IF NOT EXISTS incorporadoras (
  codigo      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  construtora text NOT NULL UNIQUE,
  contato     text,
  telefone    text,
  email       text,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS empreendimentos (
  codigo         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  incorporadora  integer NOT NULL REFERENCES incorporadoras (codigo) ON DELETE RESTRICT,
  empreendimento text NOT NULL,
  tipologia      text,
  bairro         text,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (incorporadora, empreendimento)
);

CREATE TABLE IF NOT EXISTS equipes (
  codigo        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome          text NOT NULL UNIQUE,
  incorporadora integer REFERENCES incorporadoras (codigo) ON DELETE SET NULL,
  gerente       text,
  telefone      text,
  email         text,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS corretores (
  codigo    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  empresa   text,               -- imobiliária do corretor
  equipe    integer REFERENCES equipes (codigo) ON DELETE SET NULL,
  nome      text NOT NULL,
  creci     text UNIQUE,
  telefone  text,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
  codigo     integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome       text NOT NULL,
  telefone   text,
  email      text NOT NULL UNIQUE,
  senha_hash text NOT NULL,
  funcao     text NOT NULL DEFAULT 'Recepção' CHECK (funcao IN ('Supervisor', 'Recepção')),
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- Roleta: fila de corretores presentes no plantão do dia (por empreendimento).
-- "sorteio" é a posição sorteada; a vez é de quem tem menos (atendimentos + pulos + vez_inicial),
-- empatando pelo menor sorteio (rodízio). Quem entra atrasado recebe vez_inicial = rodada atual
-- e vai para o fim da rodada, sem furar a fila.
CREATE TABLE IF NOT EXISTS roleta (
  codigo         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data           date NOT NULL,
  empreendimento integer NOT NULL REFERENCES empreendimentos (codigo) ON DELETE RESTRICT,
  sorteio        integer NOT NULL,
  corretor       integer NOT NULL REFERENCES corretores (codigo) ON DELETE RESTRICT,
  equipe         integer REFERENCES equipes (codigo) ON DELETE SET NULL,
  gerente        text,
  empresa        text,
  vez_inicial    integer NOT NULL DEFAULT 0,
  pulos          integer NOT NULL DEFAULT 0,
  situacao       text NOT NULL DEFAULT 'Disponível' CHECK (situacao IN ('Disponível', 'Pausado', 'Saiu')),
  usuario        integer REFERENCES usuarios (codigo) ON DELETE SET NULL,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (data, empreendimento, corretor),
  UNIQUE (data, empreendimento, sorteio)
);

CREATE TABLE IF NOT EXISTS atendimentos (
  codigo         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data           date NOT NULL,
  hora           time NOT NULL,
  ordem          integer NOT NULL,                -- ordem de chegada no dia/empreendimento
  construtora    integer NOT NULL REFERENCES incorporadoras (codigo) ON DELETE RESTRICT,
  empreendimento integer NOT NULL REFERENCES empreendimentos (codigo) ON DELETE RESTRICT,
  cliente        integer NOT NULL REFERENCES clientes (codigo) ON DELETE RESTRICT,
  corretor       integer REFERENCES corretores (codigo) ON DELETE RESTRICT,
  equipe         integer REFERENCES equipes (codigo) ON DELETE SET NULL,
  empresa        text,
  roleta         integer REFERENCES roleta (codigo) ON DELETE SET NULL,
  tipo           text NOT NULL DEFAULT 'Roleta' CHECK (tipo IN ('Roleta', 'Retorno', 'Indicação', 'Agendado')),
  situacao       text NOT NULL DEFAULT 'Em atendimento' CHECK (situacao IN ('Aguardando', 'Em atendimento', 'Finalizado')),
  resultado      text CHECK (resultado IN ('Interessado', 'Agendou retorno', 'Proposta', 'Venda', 'Sem interesse')),
  midia          text,                            -- como conheceu o empreendimento
  hora_fim       time,
  observacoes    text,
  usuario        integer REFERENCES usuarios (codigo) ON DELETE SET NULL,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (data, empreendimento, ordem)
);
CREATE INDEX IF NOT EXISTS atendimentos_data_idx ON atendimentos (data, empreendimento);
CREATE INDEX IF NOT EXISTS atendimentos_cliente_idx ON atendimentos (cliente);
CREATE INDEX IF NOT EXISTS atendimentos_corretor_idx ON atendimentos (corretor, data);
