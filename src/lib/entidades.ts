// Definição dos cadastros (menu CADASTRO): campos do formulário, colunas da lista e permissões.
// As telas e as Server Actions de cadastro são genéricas e só aceitam os campos declarados aqui.

export type TipoCampo = "texto" | "email" | "telefone" | "fk" | "opcoes" | "booleano" | "senha";

export type Campo = {
  nome: string;
  rotulo: string;
  tipo: TipoCampo;
  obrigatorio?: boolean;
  opcoes?: readonly string[];
  fk?: { tabela: string; rotulo: string; filtro?: string };
  largura?: "inteira" | "meia";
};

export type Coluna = { campo: string; rotulo: string; tipo?: "telefone" | "booleano" };

export type Entidade = {
  slug: string;
  tabela: string;
  titulo: string; // plural, para a lista
  singular: string;
  supervisor: boolean; // só Supervisor cadastra
  campos: Campo[];
  // SELECT da lista: precisa expor "codigo" e as colunas; "busca" são expressões para o filtro de texto
  lista: { sql: string; colunas: Coluna[]; busca: string[]; ordem: string };
};

export const ENTIDADES: Record<string, Entidade> = {
  clientes: {
    slug: "clientes",
    tabela: "clientes",
    titulo: "Clientes",
    singular: "Cliente",
    supervisor: false,
    campos: [
      { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, largura: "inteira" },
      { nome: "telefone", rotulo: "Telefone", tipo: "telefone" },
      { nome: "email", rotulo: "E-mail", tipo: "email" },
      { nome: "endereco", rotulo: "Endereço", tipo: "texto", largura: "inteira" },
      { nome: "cidade", rotulo: "Cidade", tipo: "texto" },
      { nome: "bairro", rotulo: "Bairro", tipo: "texto" },
    ],
    lista: {
      sql: "SELECT c.codigo, c.nome, c.telefone, c.email, c.cidade, c.bairro, (SELECT count(*) FROM atendimentos a WHERE a.cliente = c.codigo) AS visitas FROM clientes c",
      colunas: [
        { campo: "nome", rotulo: "Nome" },
        { campo: "telefone", rotulo: "Telefone", tipo: "telefone" },
        { campo: "email", rotulo: "E-mail" },
        { campo: "cidade", rotulo: "Cidade" },
        { campo: "bairro", rotulo: "Bairro" },
        { campo: "visitas", rotulo: "Visitas" },
      ],
      busca: ["c.nome", "c.email", "c.bairro", "c.cidade", "regexp_replace(c.telefone, '\\D', '', 'g')"],
      ordem: "c.nome",
    },
  },
  corretores: {
    slug: "corretores",
    tabela: "corretores",
    titulo: "Corretores",
    singular: "Corretor",
    supervisor: true,
    campos: [
      { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, largura: "inteira" },
      { nome: "empresa", rotulo: "Empresa (imobiliária)", tipo: "texto" },
      { nome: "equipe", rotulo: "Equipe", tipo: "fk", fk: { tabela: "equipes", rotulo: "nome" } },
      { nome: "creci", rotulo: "CRECI", tipo: "texto" },
      { nome: "telefone", rotulo: "Telefone", tipo: "telefone" },
      { nome: "ativo", rotulo: "Ativo (participa da roleta)", tipo: "booleano" },
    ],
    lista: {
      sql: "SELECT c.codigo, c.nome, c.empresa, e.nome AS equipe, e.gerente, c.creci, c.telefone, c.ativo FROM corretores c LEFT JOIN equipes e ON e.codigo = c.equipe",
      colunas: [
        { campo: "nome", rotulo: "Nome" },
        { campo: "empresa", rotulo: "Empresa" },
        { campo: "equipe", rotulo: "Equipe" },
        { campo: "gerente", rotulo: "Gerente" },
        { campo: "creci", rotulo: "CRECI" },
        { campo: "telefone", rotulo: "Telefone", tipo: "telefone" },
        { campo: "ativo", rotulo: "Ativo", tipo: "booleano" },
      ],
      busca: ["c.nome", "c.empresa", "c.creci", "e.nome", "e.gerente"],
      ordem: "c.nome",
    },
  },
  equipes: {
    slug: "equipes",
    tabela: "equipes",
    titulo: "Equipes",
    singular: "Equipe",
    supervisor: true,
    campos: [
      { nome: "nome", rotulo: "Nome da equipe", tipo: "texto", obrigatorio: true },
      { nome: "incorporadora", rotulo: "Construtora", tipo: "fk", fk: { tabela: "incorporadoras", rotulo: "construtora" } },
      { nome: "gerente", rotulo: "Gerente", tipo: "texto" },
      { nome: "telefone", rotulo: "Telefone", tipo: "telefone" },
      { nome: "email", rotulo: "E-mail", tipo: "email" },
    ],
    lista: {
      sql: "SELECT e.codigo, e.nome, i.construtora, e.gerente, e.telefone, e.email, (SELECT count(*) FROM corretores c WHERE c.equipe = e.codigo AND c.ativo) AS corretores FROM equipes e LEFT JOIN incorporadoras i ON i.codigo = e.incorporadora",
      colunas: [
        { campo: "nome", rotulo: "Equipe" },
        { campo: "construtora", rotulo: "Construtora" },
        { campo: "gerente", rotulo: "Gerente" },
        { campo: "telefone", rotulo: "Telefone", tipo: "telefone" },
        { campo: "email", rotulo: "E-mail" },
        { campo: "corretores", rotulo: "Corretores" },
      ],
      busca: ["e.nome", "e.gerente", "i.construtora"],
      ordem: "e.nome",
    },
  },
  incorporadoras: {
    slug: "incorporadoras",
    tabela: "incorporadoras",
    titulo: "Incorporadoras",
    singular: "Incorporadora",
    supervisor: true,
    campos: [
      { nome: "construtora", rotulo: "Construtora", tipo: "texto", obrigatorio: true, largura: "inteira" },
      { nome: "contato", rotulo: "Contato", tipo: "texto" },
      { nome: "telefone", rotulo: "Telefone", tipo: "telefone" },
      { nome: "email", rotulo: "E-mail", tipo: "email" },
    ],
    lista: {
      sql: "SELECT i.codigo, i.construtora, i.contato, i.telefone, i.email, (SELECT count(*) FROM empreendimentos p WHERE p.incorporadora = i.codigo) AS empreendimentos FROM incorporadoras i",
      colunas: [
        { campo: "construtora", rotulo: "Construtora" },
        { campo: "contato", rotulo: "Contato" },
        { campo: "telefone", rotulo: "Telefone", tipo: "telefone" },
        { campo: "email", rotulo: "E-mail" },
        { campo: "empreendimentos", rotulo: "Empreendimentos" },
      ],
      busca: ["i.construtora", "i.contato", "i.email"],
      ordem: "i.construtora",
    },
  },
  empreendimentos: {
    slug: "empreendimentos",
    tabela: "empreendimentos",
    titulo: "Empreendimentos",
    singular: "Empreendimento",
    supervisor: true,
    campos: [
      { nome: "incorporadora", rotulo: "Construtora", tipo: "fk", obrigatorio: true, fk: { tabela: "incorporadoras", rotulo: "construtora" } },
      { nome: "empreendimento", rotulo: "Empreendimento", tipo: "texto", obrigatorio: true },
      { nome: "tipologia", rotulo: "Tipologia", tipo: "texto" },
      { nome: "bairro", rotulo: "Bairro", tipo: "texto" },
      { nome: "ativo", rotulo: "Ativo (plantão aberto)", tipo: "booleano" },
    ],
    lista: {
      sql: "SELECT p.codigo, i.construtora, p.empreendimento, p.tipologia, p.bairro, p.ativo FROM empreendimentos p JOIN incorporadoras i ON i.codigo = p.incorporadora",
      colunas: [
        { campo: "empreendimento", rotulo: "Empreendimento" },
        { campo: "construtora", rotulo: "Construtora" },
        { campo: "tipologia", rotulo: "Tipologia" },
        { campo: "bairro", rotulo: "Bairro" },
        { campo: "ativo", rotulo: "Ativo", tipo: "booleano" },
      ],
      busca: ["p.empreendimento", "i.construtora", "p.bairro", "p.tipologia"],
      ordem: "p.empreendimento",
    },
  },
  usuarios: {
    slug: "usuarios",
    tabela: "usuarios",
    titulo: "Usuários",
    singular: "Usuário",
    supervisor: true,
    campos: [
      { nome: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true, largura: "inteira" },
      { nome: "email", rotulo: "E-mail (login)", tipo: "email", obrigatorio: true },
      { nome: "telefone", rotulo: "Telefone", tipo: "telefone" },
      { nome: "funcao", rotulo: "Função", tipo: "opcoes", obrigatorio: true, opcoes: ["Recepção", "Supervisor"] },
      { nome: "senha", rotulo: "Senha", tipo: "senha" },
      { nome: "ativo", rotulo: "Ativo", tipo: "booleano" },
    ],
    lista: {
      sql: "SELECT u.codigo, u.nome, u.email, u.telefone, u.funcao, u.ativo FROM usuarios u",
      colunas: [
        { campo: "nome", rotulo: "Nome" },
        { campo: "email", rotulo: "E-mail" },
        { campo: "telefone", rotulo: "Telefone", tipo: "telefone" },
        { campo: "funcao", rotulo: "Função" },
        { campo: "ativo", rotulo: "Ativo", tipo: "booleano" },
      ],
      busca: ["u.nome", "u.email"],
      ordem: "u.nome",
    },
  },
};
