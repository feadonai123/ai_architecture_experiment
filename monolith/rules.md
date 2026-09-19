# Monólito acoplado

Leia também `/rules.md` (regras de todas as abordagens).

## Objetivo

Organização mínima, forte acoplamento, sem fronteiras internas formais. A menor quantidade razoável de estruturas.

## Estrutura permitida

```text
src/
├── app.ts
├── database.ts
├── errors.ts
├── helpers.ts
├── routes/
├── entities/
├── presenters/
├── middleware/
├── services/
└── utils/
```

## Responsabilidades

- `routes/` — um arquivo por operação HTTP. Lê o request, aplica regra de negócio, acessa TypeORM direto, responde via presenter.
- `entities/` — somente mapeamento TypeORM.
- `presenters/` — modelo persistido → payload HTTP.
- `middleware/` — `errorHandler`, `authenticate` (por rota, não global) e `audit`.
- `services/` — factory do Redis (`createRedis`). Rotas e `server.ts` usam o cliente direto (`redis.ping()`).
- `utils/` — somente `Logger`.
- `helpers.ts` — `requireEnv`, `loadAppEnv`, validação pontual, wrap de handlers, Swagger. Sem pasta `helpers/`.
- `errors.ts` — todas as classes de erro. Sem pasta `errors/`.
- `database.ts` — conexão TypeORM. Sem pasta `database/`.

## Proibido

`controllers/`, `usecases/`, `repositories/`, `ports/`, `interfaces/`, `dtos/`, pasta `errors/`, `handlers/`, `factories/`, `http/`.

Não criar camada de repositório só para esconder TypeORM.

## Dependências

Rotas podem depender de Express e TypeORM. Não há Dependency Rule entre camadas.

## Simplicidade

Se a responsabilidade cabe na rota ou em `app.ts` sem tornar o código impraticável, não crie arquivo novo.

## Testes desta abordagem

- `test/` contém exclusivamente testes unitários das funções de negócio das rotas, com TypeORM mockado em `test/mocks/`.
- Não criar em `test/` testes de controller/handler HTTP, testes com `createApp` ou `supertest`, nem testes end-to-end.
- Cada arquivo unitário usa um `describe` externo com o nome da operação e agrupa os casos aplicáveis em `describe('success', ...)` e `describe('errors', ...)`.
- `success` contém somente caminhos de sucesso. `errors` contém somente casos que lançam classes de erro da aplicação.
