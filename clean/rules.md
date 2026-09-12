# Clean Architecture

Leia também `/rules.md` (regras de todas as abordagens).

## Objetivo

Organização por **camada técnica** com direção explícita de dependências. Não organizar por bounded context.

## Estrutura permitida

```text
src/
├── controllers/
├── usecases/
├── entities/
├── ports/
├── repositories/
├── services/
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
- `ports/` — interfaces de persistência usadas pelos use cases.
- `repositories/` — implementações TypeORM das ports. Sem records TypeORM nesta pasta.
- `presenters/` — domínio → payload HTTP.
- `middleware/` — `errorHandler`, `authenticate`, `audit`.
- `utils/` — `env`, `Logger`, `format`, `parser`, `time`.
- `base/` — `UseCase` e `RouterBase`. Use cases não importam `router.base`.
- `manager/` — `DbManager`: QueryRunner, commit/rollback. Repos usam `DbManager.getManager(dataSource)`.
- `infrastructure/` — records TypeORM em `typeorm/`, DataSource, Swagger. Sem Redis, sem `requireEnv`, sem implementações de repository.

## Dependency Rule

```text
entities → nada externo
usecases → ports (não TypeORM, Express, infrastructure, repositories, manager, router.base)
controllers → usecases, presenters, base/router
repositories → ports + infrastructure/typeorm + manager
```

## Transação

Toda rota (`RouterBase.asHandler`) roda dentro de uma transação. A transação **não** vive no use case.

## Proibido

Pastas de contexto como primeira dimensão (`ordering/`, `catalog/`, `contexts/`). `factories/`, `managers/` genéricos, `orchestrators/` sem papel claro. Não existe `transactionContext` solto: transação é `DbManager`.

## Testes desta abordagem

Unitários **somente de use cases** (`run`), com ports mockados em `test/mocks/`. Integração compartilhada em `/test/integration/`.
