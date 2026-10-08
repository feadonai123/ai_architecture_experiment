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
├── handler/
├── presenters/
├── middleware/
├── errors/
├── utils/
├── base/
├── manager/
└── infrastructure/
```

## Responsabilidades

- `app.ts` e `financialConsumerApp.ts` são composition roots: o primeiro monta a aplicação HTTP e o segundo monta o consumer financeiro e suas implementações concretas. `server.ts` abre as conexões, chama essas factories e controla inicialização e encerramento.
- `controllers/` — por recurso, igual ao MVC (`cart.controller.ts` + `routes/*.route.ts`). Rotas são classes que estendem `RouterBase` e expõem `asHandler()`. Sem pasta `src/routes/`.
- `usecases/` — regra de aplicação. Estendem `UseCase`; API pública é `run`. `execute` é protegido. Não abrem transação.
- `entities/` — domínio puro: sem Express, TypeORM, Redis ou infrastructure.
- `events/` — contratos tipados de eventos, payloads validados e enums de tipos e streams; sem comandos Redis.
- `ports/` — interfaces de persistência e de publicação usadas pelos use cases.
- `repositories/` — implementações TypeORM das ports. Sem records TypeORM nesta pasta.
- `presenters/` — domínio → payload HTTP.
- `consumers/` — `Consumer` define o ciclo de vida (`start`/`stop`), o algoritmo de consumo e o algoritmo comum de uma tentativa de retry, além de possuir o `consumerName`. A classe registra a primeira falha antes de delegar ao `handleFailure` concreto e registra a falha de retry antes de delegar ao `handleRetryFailure` concreto. `FinancialConsumer` compõe um `Consumer` abstrato e registra os handlers financeiros no `EventDispatcher`, sem herdar nem depender de `RedisConsumer`. `financialConsumerApp.ts` monta as implementações concretas; `server.ts` inicia o consumer após as conexões. Todos os arquivos desta pasta começam com letra minúscula.
- `handler/` — handlers concretos de eventos. Eles validam e extraem o payload, abrem a transação e passam somente os dados de negócio necessários aos use cases; estes não recebem instâncias de eventos como entrada. Handlers concretos não importam nem acionam `Logger` e não contêm regras de negócio.
- `IConsumerSettings` define a configuração; `ConsumerSettings` lê e valida o ambiente antes da inicialização. Streams, tipos, tempos e limites são obrigatórios e não têm fallback.
- `middleware/` — `errorHandler`, `authenticate` (por rota da API, não `app.use` global) e `audit`.
- `utils/` — `env`, `Logger`, `format`, `parser`, `time`. `parser` concentra validações técnicas reutilizáveis de valores desconhecidos, inclusive objeto, array não vazio, string e inteiro positivo; eventos e use cases escolhem o erro da aplicação correspondente.
- `base/` — `UseCase`, `RouterBase` e a classe abstrata `EventHandler`, em arquivos com o padrão `<nome>.base.ts`. `EventHandler.handle` executa o método protegido do handler concreto e registra o sucesso somente após seu término, com `eventId` e o payload validado. Use cases não importam `router.base`.
- `manager/` — `DbManager`: QueryRunner, commit/rollback e ações registradas para depois do commit. Repos usam `DbManager.getManager(dataSource)`.
- `infrastructure/` — records TypeORM em `typeorm/`, DataSource, Swagger e todos os adaptadores Redis em `redis/`. Nessa pasta, conexão, comandos de Streams, persistência do estado de retry, implementação de `IEventService` e `RedisConsumer` ficam separados por responsabilidade. O cliente Redis é sempre recebido explicitamente pelos comandos; não existe cliente global, `getRedis` nem parâmetro com conexão implícita. `RedisConsumer` implementa Redis Streams, retry, reconciliação da PEL, lease e Dead Letter; usa `utils/parser` para datas e valores numéricos recebidos do Redis e lança erros técnicos específicos, nunca `Error` genérico, para estados inválidos próprios do consumer. A falha de `XACK` é tratada separadamente da falha do handler. `requireEnv` é permitido apenas no factory de conexão Redis; implementações de repository não pertencem à pasta.

## Dependency Rule

```text
entities → nada externo
usecases → ports, entities e events (não TypeORM, Express, infrastructure, repositories, manager, router.base)
controllers → usecases, presenters, base/router
repositories → ports + infrastructure/typeorm + manager
services → entities + events + ports
consumers → base/eventHandler + events + ports
handler → base/eventHandler + events + manager + usecases
infrastructure/redis → consumers + errors + events + manager + ports + utils + Redis
```

## Transação

Toda rota (`RouterBase.asHandler`) roda dentro de uma transação. A transação **não** vive no use case.
Um use case pode solicitar publicação pela port `IEventService.publishAfterCommit`; a implementação registra a publicação no `DbManager`, que a executa somente após o commit. Rotas de pedido enviam a resposta somente após a publicação. Uma falha de publicação após o commit não desfaz os dados já persistidos.
`IEventService.publishNow` publica a Dead Letter Stream imediatamente. O consumidor só faz `XACK` após o processamento e seu commit; no retry, `XACK`, remoção da agenda e exclusão do Hash ocorrem na mesma transação Redis.

## Proibido

Pastas de contexto como primeira dimensão (`ordering/`, `catalog/`, `contexts/`). `factories/`, `managers/` genéricos, `orchestrators/` sem papel claro. Não existe `transactionContext` solto: transação é `DbManager`.

## Testes desta abordagem

- Unitários **somente de use cases** (`run`), com ports mockados em `test/mocks/`.
- `test/mocks/` contém somente mocks de dependências, separados por repository, event service, relógio ou gerador de IDs. Dados de cenário ficam em `test/data/`, com um arquivo próprio para cada use case testado; arquivos de dados não exportam mocks de dependências.
- Não criar testes de controller/handler HTTP, testes com `createApp` ou `supertest`, nem testes end-to-end.
- Cada arquivo unitário usa um `describe` externo com o nome da operação e agrupa os casos aplicáveis em `describe('success', ...)` e `describe('errors', ...)`.
- `success` contém somente caminhos de sucesso. `errors` contém somente casos que lançam classes de erro da aplicação.
