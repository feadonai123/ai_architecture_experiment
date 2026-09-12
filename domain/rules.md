# Domain-Oriented Modular Monolith

Leia também `/rules.md` (regras de todas as abordagens).

## Objetivo

Organizar primeiro por **contexto**, depois por **operação**, depois por responsabilidade técnica.

```text
contexto → operação → responsabilidade técnica
```

Nesta fatia o único contexto é `ordering/` (carrinho). Não criar `catalog/` só porque o carrinho lê `products`.

## Estrutura de um contexto

```text
ordering/
├── createCart/   usecases, repositories, controllers
├── getCart/      usecases, repositories, controllers, errors
├── addCartItem/  ...
├── removeCartItem/
└── cart.controller.ts   # registra as rotas HTTP do contexto
```

Pastas internas só existem se houver código. Sem `presenters/` dentro do contexto.

## Componentes globais técnicos

```text
src/services/     Redis
src/middleware/   errorHandler, authenticate (por rota), audit
src/utils/        env, Logger, format, parser, time
src/manager/      DbManager
```

## `shared/`

```text
shared/
├── entities/      Cart, CartItem, Product (domínio, sem TypeORM)
├── database/      records TypeORM, DataSource, schema (papel da infrastructure da Clean)
├── presenters/    payload HTTP
└── base/          UseCase, RouterBase
```

Não colocar em `shared/` regra que pertence a uma operação só para reduzir duplicação.

## Responsabilidades

- Use case da operação estende `UseCase` em `shared/base`; API pública é `run`.
- `repositories/` da operação: só implementação. Sem entities TypeORM.
- Controllers da operação estendem `RouterBase`; o agregador usa `.asHandler()`.
- Erros: por operação, não globais (`src/errors/` é proibido).
- Duplicar `CartRepository` entre operações é permitido e esperado.

## Transação

`RouterBase.asHandler` abre transação via `DbManager`. Use cases não importam `router.base` nem `manager/`. Repos usam `DbManager.getManager(dataSource)`.

## Proibido

Camadas globais `src/controllers`, `src/usecases`, `src/repositories`, `src/entities`, `src/presenters`, `src/base`, `src/errors`.

`src/ordering/ports`, `src/ordering/infrastructure`, `src/ordering/presenters`.

## Isolamento

Um contexto não acessa a implementação interna de outro. Integração explícita.

## Testes desta abordagem

Unitários **somente de use cases** (`run`), com dependências mockadas em `test/mocks/`. Integração compartilhada em `/test/integration/`.
