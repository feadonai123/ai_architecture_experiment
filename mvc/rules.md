# MVC técnico

## Objetivo

Primeira dimensão = **responsabilidade técnica** (Controller, Model, Entity, Event, Service, Presenter, Middleware, Error). Domínios diferentes convivem nas mesmas pastas técnicas.

## Estrutura permitida

```text
src/
├── app.ts
├── financialConsumerApp.ts
├── controllers/
├── models/
├── entities/
├── enums/
├── events/
├── consumers/
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
- `enums/` — valores finitos de status e outros tipos limitados usados pela aplicação.
- `events/` — contrato, validação e serialização dos eventos da aplicação, sem acesso direto ao Redis.
- `consumers/` — `ConfigConsumer` valida as configurações de ambiente; `Consumer` concentra leitura, retry e Dead Letter; consumidores concretos implementam `processEvent` e os handlers do seu setor.
- `models/` — somente operações de acesso e persistência (`find`, `create`, `update`) como métodos estáticos sobre a entity. Decisões de negócio, como status, total, idempotência, composição de pedido e quando criar pagamento, ficam na rota ou no handler do consumer. A rota coordena a transação que persiste pedido e itens.
- `services/` — Redis centralizado (`createRedis`, `getRedis`, `ping`, `publish` e operações de consumo). Sem service “só para mover código”.
- `presenters/` — um presenter por entidade.
- `middleware/` — `errorHandler`, `authenticate` (por rota, não global) e `audit`.
- `errors/` — classes de erro da aplicação (`AppError` + erros semânticos).
- `utils/` — `requireEnv`, `loadAppEnv`, `Logger`.
- `database.ts` — arquivo único de conexão TypeORM.
- `app.ts` e `financialConsumerApp.ts` são pontos de composição: o primeiro monta somente HTTP e o segundo cria o consumer financeiro. `server.ts` abre as conexões e inicia e encerra o consumer separadamente das rotas.

## Fluxo

```text
controllers/<recurso>
  → controllers/<recurso>/routes
  → models / events / services / presenters
  → database.ts / Redis
```

O registro de rotas não contém regra de negócio. A regra pode ficar no arquivo da rota neste experimento.

## Proibido

`usecases/`, `repositories/` como abstração, `ports/`, `adapters/`, `domain/`, `contexts/`, pasta top-level `routes/`.

Não organizar primeiro por domínio (`products/`, `orders/`).

## Testes desta abordagem

- `test/` contém exclusivamente testes unitários das funções de negócio das rotas e dos consumers, com Redis, TypeORM e models mockados em `test/mocks/`.
- Não criar em `test/` testes de controller/handler HTTP, testes com `createApp` ou `supertest`, nem testes end-to-end.
- Unitários dos handlers de rota, com models mockados em `test/mocks/`.
- Mocks de persistência ficam separados por Model, um arquivo por classe; mocks de Redis ficam em arquivo próprio. Dados de cenário ficam em um arquivo dedicado por rota ou handler de consumer testado.
- `invokeHandler` (ou equivalente) fica no arquivo de teste, nunca em `test/mocks/`.
- Não criar testes com `createApp`, `supertest` ou end-to-end nesta pasta.
- Cada arquivo unitário usa um `describe` externo com o nome da operação e agrupa os casos aplicáveis em `describe('success', ...)` e `describe('errors', ...)`.
- `success` contém somente caminhos de sucesso. `errors` contém somente casos que lançam classes de erro da aplicação.
