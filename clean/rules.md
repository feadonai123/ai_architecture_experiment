# Clean Architecture

## Objetivo

Organização por **camada técnica** com direção explícita de dependências. Não organizar por bounded context.

## Estrutura permitida

```text
src/
├── controllers/
├── usecases/
├── entities/
├── events/
├── ports/
├── repositories/
├── services/
├── consumers/
├── presenters/
├── middleware/
├── errors/
├── utils/
├── base/
├── manager/
└── infrastructure/
```

## Responsabilidades

- `controllers/` — por recurso, igual ao MVC (`cart.controller.ts` + `routes/*.route.ts`). Rotas são classes que estendem `RouterBase` e expõem `asHandler()`. Sem pasta `src/routes/`.
- `usecases/` — regra de aplicação. Estendem `UseCase`; API pública é `run`. `execute` é protegido. Não abrem transação.
- `entities/` — domínio puro: sem Express, TypeORM, Redis ou infrastructure.
- `events/` — contratos tipados de eventos, payloads validados e enums de tipos e streams; sem comandos Redis.
- `ports/` — interfaces de persistência e de publicação usadas pelos use cases.
- `repositories/` — implementações TypeORM das ports. Sem records TypeORM nesta pasta.
- `presenters/` — domínio → payload HTTP.
- `consumers/` — contratos e implementações dos consumidores de eventos; a lógica de negócio dos handlers fica nos use cases.
- `middleware/` — `errorHandler`, `authenticate` (por rota da API, não `app.use` global) e `audit`.
- `utils/` — `env`, `Logger`, `format`, `parser`, `time`.
- `base/` — `UseCase` e `RouterBase`. Use cases não importam `router.base`.
- `manager/` — `DbManager`: QueryRunner, commit/rollback e ações registradas para depois do commit. Repos usam `DbManager.getManager(dataSource)`.
- `infrastructure/` — records TypeORM em `typeorm/`, DataSource, Swagger. Sem Redis, sem `requireEnv`, sem implementações de repository.

## Dependency Rule

```text
entities → nada externo
usecases → ports, entities e events (não TypeORM, Express, infrastructure, repositories, manager, router.base)
controllers → usecases, presenters, base/router
repositories → ports + infrastructure/typeorm + manager
services → ports + Redis + manager
```

## Transação

Toda rota (`RouterBase.asHandler`) roda dentro de uma transação. A transação **não** vive no use case.
Um use case pode solicitar publicação pela port `IEventService.publishAfterCommit`; a implementação registra a publicação no `DbManager`, que a executa somente após o commit. Rotas de pedido enviam a resposta somente após a publicação. Uma falha de publicação após o commit não desfaz os dados já persistidos.

## Proibido

Pastas de contexto como primeira dimensão (`ordering/`, `catalog/`, `contexts/`). `factories/`, `managers/` genéricos, `orchestrators/` sem papel claro. Não existe `transactionContext` solto: transação é `DbManager`.

## Testes desta abordagem

- `test/` contém exclusivamente testes unitários dos use cases (`run`), com ports e repositórios mockados em `test/mocks/`.
- Não criar em `test/` testes de controller/handler HTTP, testes com `createApp` ou `supertest`, nem testes end-to-end.
- Cada arquivo unitário usa um `describe` externo com o nome da operação e agrupa os casos aplicáveis em `describe('success', ...)` e `describe('errors', ...)`.
- `success` contém somente caminhos de sucesso. `errors` contém somente casos que lançam classes de erro da aplicação.
