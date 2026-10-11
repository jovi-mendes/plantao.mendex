// Regras da roleta (rodízio de corretores no plantão)
//
// 1. No início do plantão, os corretores presentes são sorteados (ordem aleatória = "sorteio").
// 2. A vez é de quem tem a menor contagem (atendimentos de roleta + vezes puladas + vez_inicial);
//    no empate vale o menor número do sorteio. Assim a fila gira em rodadas: todos atendem 1 antes
//    de alguém atender o 2º.
// 3. Quem chega atrasado entra no fim da rodada atual (vez_inicial = rodada atual), sem furar a fila.
// 4. Corretor em atendimento é pulado, mas NÃO perde a vez (volta a ser o próximo quando terminar).
// 5. Corretor pausado/que saiu não recebe cliente. "Pular a vez" conta como uma vez usada.
// 6. Retorno, Indicação e Agendado vão direto para o corretor escolhido e não contam na roleta.
import "server-only";
import { randomInt } from "node:crypto";
import { todos, valor, type Executor, pool } from "./db";

export type Posicao = {
  codigo: number;
  sorteio: number;
  corretor: number;
  nome: string;
  equipe: string | null;
  gerente: string | null;
  empresa: string | null;
  situacao: "Disponível" | "Pausado" | "Saiu";
  pulos: number;
  vez_inicial: number;
  atendimentos: number;
  em_atendimento: number;
  contagem: number;
};

export async function fila(data: string, empreendimento: number, c: Executor = pool): Promise<Posicao[]> {
  return todos<Posicao>(
    `SELECT r.codigo, r.sorteio, r.corretor, co.nome, e.nome AS equipe, r.gerente, r.empresa, r.situacao, r.pulos, r.vez_inicial,
            count(a.codigo) FILTER (WHERE a.tipo = 'Roleta') AS atendimentos,
            count(a.codigo) FILTER (WHERE a.situacao <> 'Finalizado') AS em_atendimento,
            count(a.codigo) FILTER (WHERE a.tipo = 'Roleta') + r.pulos + r.vez_inicial AS contagem
       FROM roleta r
       JOIN corretores co ON co.codigo = r.corretor
       LEFT JOIN equipes e ON e.codigo = r.equipe
       LEFT JOIN atendimentos a ON a.corretor = r.corretor AND a.data = r.data AND a.empreendimento = r.empreendimento
      WHERE r.data = $1 AND r.empreendimento = $2
      GROUP BY r.codigo, co.nome, e.nome
      ORDER BY (r.situacao = 'Disponível') DESC, contagem, r.sorteio`,
    [data, empreendimento], c,
  );
}

// próximo da vez: disponível e sem cliente em atendimento
export const proximo = (f: Posicao[]) => f.find((p) => p.situacao === "Disponível" && p.em_atendimento === 0) ?? null;

// rodada atual = menor contagem entre os disponíveis
const rodada = (f: Posicao[]) => {
  const d = f.filter((p) => p.situacao === "Disponível");
  return d.length ? Math.min(...d.map((p) => p.contagem)) : 0;
};

// sorteia e inclui corretores na fila do dia (os novos entram no fim da rodada atual)
export async function incluir(c: Executor, data: string, empreendimento: number, corretores: number[], usuario: number): Promise<number> {
  const atual = await fila(data, empreendimento, c);
  const ja = new Set(atual.map((p) => p.corretor));
  const novos = corretores.filter((x) => !ja.has(x));
  // embaralhamento de Fisher-Yates com gerador criptográfico
  for (let i = novos.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [novos[i], novos[j]] = [novos[j], novos[i]];
  }
  let n = (await valor<number>("SELECT coalesce(max(sorteio), 0) FROM roleta WHERE data = $1 AND empreendimento = $2", [data, empreendimento], c)) ?? 0;
  const vez = rodada(atual);
  for (const corretor of novos) {
    await c.query(
      `INSERT INTO roleta (data, empreendimento, sorteio, corretor, equipe, gerente, empresa, vez_inicial, usuario)
       SELECT $1, $2, $3, co.codigo, co.equipe, e.gerente, co.empresa, $5, $6
         FROM corretores co LEFT JOIN equipes e ON e.codigo = co.equipe
        WHERE co.codigo = $4 AND co.ativo`,
      [data, empreendimento, ++n, corretor, vez, usuario],
    );
  }
  return novos.length;
}
