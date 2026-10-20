# Minhas Contas

App mobile-first para lançar receitas e despesas em poucos toques, com dashboard do mês e do ano.

**Stack:** Next.js 16 (App Router, Server Actions) · shadcn/ui + Tailwind 4 · Drizzle ORM · Postgres (Neon) · Vercel.

## Rodando localmente

```bash
npm install
npm run db:push      # cria as tabelas
npm run db:seed      # cria as categorias padrão
npm run db:import    # (opcional) importa "Financeiro 26.xlsx"
npm run dev
```

Sem `DATABASE_URL` no `.env.local`, o app usa um Postgres embutido (PGlite) salvo em `./.pglite`, sem precisar de nenhum serviço externo.
A senha local fica em `APP_PASSWORD` no `.env.local`.

## Deploy na Vercel + Neon

1. **Banco:** crie um projeto no [Neon](https://console.neon.tech) (região `sa-east-1` / São Paulo) e copie a connection string **pooled**.
2. **Tabelas e dados:** coloque essa string como `DATABASE_URL` no `.env.local` e rode:
   ```bash
   npm run db:push
   npm run db:import -- "Financeiro 26.xlsx"   # já cria as categorias também
   ```
   (Se não for importar a planilha, rode `npm run db:seed` no lugar.)
3. **Vercel:** suba o projeto para o GitHub, importe na Vercel e configure as variáveis de ambiente:
   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | connection string do Neon |
   | `APP_PASSWORD` | sua senha de acesso (use uma forte) |
   | `AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
4. **No celular:** abra o site e use "Adicionar à tela inicial". Ele abre como app (PWA).

## Scripts

| Script | O que faz |
|---|---|
| `npm run db:push` | Aplica o schema (`src/db/schema.ts`) no banco |
| `npm run db:seed` | Cria as categorias padrão (não duplica) |
| `npm run db:import -- arq1.xlsx arq2.xlsx [--dry-run] [--verbose]` | Importa planilhas antigas (uma aba por mês) e compara com o total de cada aba; reimportar substitui só os meses importados |
| `npm run db:studio` | Abre o Drizzle Studio para ver/editar os dados |

## Estrutura

```
src/
  app/
    (app)/            telas autenticadas: mês (/), ano, lançamentos, ajustes
    login/            tela de senha
    api/export/       CSV (abre direto no Excel)
    actions.ts        Server Actions (criar/editar/excluir, categorias, login)
  components/         drawer de lançamento, listas, gráficos, filtros
  db/                 schema Drizzle, conexão (Neon ou PGlite), categorias padrão
  lib/                consultas, formatação (R$, datas em America/Sao_Paulo), sessão
  proxy.ts            protege todas as rotas com o cookie de sessão
scripts/              seed, importação da planilha, geração de ícones
```
