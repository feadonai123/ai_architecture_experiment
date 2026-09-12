---
name: consultar-banco
description: Consulta o PostgreSQL em modo somente-leitura via pg, para debug e inspeção de dados. Use when inspecting the database, debugging with SQL, checking table contents, entender tabelas, ou quando o usuário pedir para olhar o banco.
---

# Skill: consultar-banco

Consulta **somente leitura** ao Postgres deste experimento. Use o script desta pasta — ele valida o SQL e abre uma transação `READ ONLY`. Credenciais vêm do `.env` na raiz (`POSTGRES_*`), sem fallback.

## Fluxo

1. Leia [tabelas.md](tabelas.md) para localizar o domínio.
2. Monte **um** statement SQL de leitura (`SELECT` / `WITH` / `VALUES` / `TABLE` / `EXPLAIN` sem `ANALYZE`).
3. Execute **somente** este script, a partir da raiz do repositório:

```bash
node .cursor/skills/consultar-banco/query.js "SELECT id, name, stock FROM products LIMIT 20"
```

Também aceita stdin ou `--file`:

```bash
node .cursor/skills/consultar-banco/query.js --file /tmp/query.sql
echo 'SELECT 1' | node .cursor/skills/consultar-banco/query.js
```

Para inspecionar o banco de teste (sem alterar o `.env`):

```bash
POSTGRES_DB=ecommerce_test node .cursor/skills/consultar-banco/query.js "SELECT id FROM carts LIMIT 20"
```

`--limit N` (padrão 200, máximo 1000) trunca o JSON se vierem mais linhas.

Saída: JSON em stdout (`rowCount`, `truncated`, `rows`). Erros de validação ou do banco em stderr, exit code ≠ 0.

## Regras do SQL

- Sempre `LIMIT` em listagens (além do `--limit` do script).
- Nomes de tabela e coluna em snake_case: `cart_items`, `created_at`, `product_id`.
- Preferir poucas colunas. Resumir o resultado no chat; não colar dumps enormes.

## Proibido

- `INSERT` / `UPDATE` / `DELETE` / `TRUNCATE` / `DROP` / `ALTER`.
- Criar script paralelo que “pule” a validação.
- Vários statements, `EXPLAIN ANALYZE`, CTE com escrita, `SELECT INTO`, `FOR UPDATE`.
