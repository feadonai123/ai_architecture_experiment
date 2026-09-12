# MVC técnico

Leia também `/rules.md` (regras de todas as abordagens).

## Objetivo

Primeira dimensão = **responsabilidade técnica** (Controller, Model, Entity, Service, Presenter, Middleware, Error). Domínios diferentes convivem nas mesmas pastas técnicas.

## Estrutura permitida

```text
src/
├── controllers/
├── models/
├── entities/
├── services/
├── presenters/
├── middleware/
├── errors/
├── utils/
└── database.ts
```

Não existe `src/routes/` nem `src/database/`.

## Responsabilidades

- `controllers/<recurso>/` — `*.controller.ts` só registra HTTP. `routes/*.route.ts` lê request, coordena models/services, chama presenter, responde.
- `entities/` — mapeamento TypeORM, sem métodos de persistência de negócio.
- `models/` — operações de persistência como métodos estáticos sobre a entity.
- `services/` — Redis centralizado (`createRedis`, `getRedis`, `ping`). Sem service “só para mover código”.
- `presenters/` — um presenter por entidade.
- `middleware/` — `errorHandler`, `authenticate` (por rota, não global) e `audit`.
- `errors/` — classes de erro da aplicação (`AppError` + erros semânticos).
- `utils/` — `requireEnv`, `loadAppEnv`, `Logger`.
- `database.ts` — arquivo único de conexão TypeORM.

## Fluxo

```text
controllers/<recurso>
  → controllers/<recurso>/routes
  → models / services / presenters
  → database.ts / Redis
```

O registro de rotas não contém regra de negócio. A regra pode ficar no arquivo da rota neste experimento.

## Proibido

`usecases/`, `repositories/` como abstração, `ports/`, `adapters/`, `domain/`, `contexts/`, pasta top-level `routes/`.

Não organizar primeiro por domínio (`products/`, `orders/`).

## Testes desta abordagem

Unitários dos handlers de rota. `invokeHandler` (ou equivalente) fica **no arquivo de teste**, nunca em `test/mocks/`. Integração compartilhada em `/test/integration/`.
