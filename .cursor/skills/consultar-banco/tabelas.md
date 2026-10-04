# Tabelas do banco (visão de domínio)

PostgreSQL via TypeORM. Schema canônico em `db/schema.sql`. Credenciais em `.env` (`POSTGRES_DB=ecommerce` na aplicação; testes usam `ecommerce_test`).

## Convenções

- PK de todas as tabelas: `id` (UUID).
- Relacionamentos em snake_case: `cart_id`, `product_id`, `created_at`.
- Sem soft delete e sem multi-tenant nesta fatia.

## Catálogo

| Tabela | Para que serve |
| --- | --- |
| `products` | Produto. Colunas: `id`, `name`, `slug` (único), `description`, `price`, `stock`, `deleted_at`. |

## Carrinho

| Tabela | Para que serve |
| --- | --- |
| `carts` | Carrinho. Colunas: `id`, `created_at`. |
| `cart_items` | Item do carrinho. Colunas: `id`, `cart_id`, `product_id`, `quantity`. Unique `(cart_id, product_id)`. |

Fluxo típico de debug: `carts` → `cart_items` → `products`.
