// Consultas compartilhadas entre telas
import "server-only";
import { todos } from "./db";

export const empreendimentosAtivos = () =>
  todos<{ codigo: number; rotulo: string; incorporadora: number }>(
    `SELECT p.codigo, p.empreendimento || ' — ' || i.construtora AS rotulo, p.incorporadora
       FROM empreendimentos p JOIN incorporadoras i ON i.codigo = p.incorporadora WHERE p.ativo ORDER BY p.empreendimento`);

export const corretoresAtivos = () =>
  todos<{ codigo: number; nome: string; equipe: string | null; empresa: string | null }>(
    `SELECT c.codigo, c.nome, e.nome AS equipe, c.empresa FROM corretores c LEFT JOIN equipes e ON e.codigo = c.equipe WHERE c.ativo ORDER BY c.nome`);
