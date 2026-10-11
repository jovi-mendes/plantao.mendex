// Banco PostgreSQL (pool único + helpers)
import "server-only";
import { Pool, types, type PoolClient } from "pg";
import { config } from "./config";

// date e time como texto ("2026-10-11", "14:30:00"); bigint/COUNT como number
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1083, (v) => v);
types.setTypeParser(20, (v) => Number(v));
types.setTypeParser(1700, (v) => Number(v));

const global = globalThis as unknown as { pool?: Pool };

export const pool = global.pool ?? new Pool({ ...config.db, max: 10, idleTimeoutMillis: 30_000, options: `-c TimeZone=${config.fuso}` });
if (process.env.NODE_ENV !== "production") global.pool = pool;

type Linha = Record<string, unknown>;
export type Executor = Pick<PoolClient, "query">;

export async function todos<T = Linha>(sql: string, p: unknown[] = [], c: Executor = pool): Promise<T[]> {
  return (await c.query(sql, p)).rows as T[];
}
export async function um<T = Linha>(sql: string, p: unknown[] = [], c: Executor = pool): Promise<T | null> {
  return ((await c.query(sql, p)).rows[0] as T) ?? null;
}
export async function valor<T = unknown>(sql: string, p: unknown[] = [], c: Executor = pool): Promise<T | null> {
  const r = await c.query({ text: sql, values: p, rowMode: "array" });
  return (r.rows[0]?.[0] as T) ?? null;
}

// transação; serializa a roleta do dia com advisory lock quando "trava" é informado
export async function tx<T>(fn: (c: PoolClient) => Promise<T>, trava?: string): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    if (trava) await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [trava]);
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

// SQLSTATE (23505 = único violado; 23503 = chave estrangeira)
export function codigoErro(e: unknown): string {
  return typeof e === "object" && e && "code" in e ? String((e as { code: unknown }).code) : "";
}

export function like(t: string): string {
  return "%" + t.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
}
