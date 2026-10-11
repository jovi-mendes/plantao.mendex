// Configuração lida do ambiente (.env)
import "server-only";

export const config = {
  url: process.env.APP_URL ?? "http://localhost:3000",
  segredo: process.env.SESSAO_SEGREDO ?? "",
  fuso: process.env.FUSO ?? "America/Sao_Paulo",
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORTA ?? 5432),
    database: process.env.DB_NOME ?? "plantao",
    user: process.env.DB_USUARIO ?? "plantao",
    password: process.env.DB_SENHA ?? "",
  },
};
