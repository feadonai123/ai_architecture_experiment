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
├── enums/
├── presenters/
├── middleware/
├── events/
├── consumers/
├── services/
└── utils/
```

## Responsabilidades

- `routes/` — um arquivo por operação HTTP. Lê o request, aplica regra de negócio, acessa TypeORM direto, responde via presenter.
- `entities/` — somente mapeamento TypeORM.
- `enums/` — valores finitos de status e outros tipos limitados usados pela aplicação.
- `presenters/` — modelo persistido → payload HTTP.
- `middleware/` — `errorHandler`, `authenticate` (por rota, não global) e `audit`.
- `events/` — classes que representam eventos publicados em Redis Streams. A classe abstrata exige um método de conversão do payload, implementado por cada evento concreto para sua classe específica de payload. Os nomes dos streams ficam em uma classe própria e os tipos de evento em um enum próprio nesta pasta. Não publica eventos nem cria o cliente Redis.
- Ao criar um evento na rota produtora, construir explicitamente a classe concreta de payload antes de instanciar o evento.
- `consumers/` — processos consumidores de Redis Streams organizados por setor do e-commerce. Cada consumidor define seu consumer group, uma lista de streams observados, uma lista de tipos suportados e mantém no próprio arquivo os handlers dos eventos que consome. O loop principal lê lotes de até dez mensagens, percorre o lote e chama `processEvents`, que seleciona o tipo do evento e delega ao handler correspondente. Um segundo loop, com conexão Redis própria, mantém uma agenda de retry em Sorted Set, metadados por evento em Hash, exponential backoff com intervalos tabelados, reclama mensagens elegíveis com `XCLAIM` e reconcilia periodicamente a agenda com `XPENDING`. Quando um handler altera o banco, ele acessa o TypeORM diretamente, concentra as alterações em uma única transação e o consumidor executa `XACK` somente após o commit.
- Cada consumidor lê suas configurações obrigatórias do ambiente com um prefixo próprio (por exemplo, `FINANCIAL_CONSUMER_`), sem valores padrão no código. Streams e tipos configurados devem corresponder às definições em `events/`.
- `services/` — factory do Redis (`createRedis`) e publicação de eventos em Redis Streams (`publish`). O `server.ts` usa o cliente diretamente para verificação de saúde (`redis.ping()`).
- `utils/` — somente `Logger`.
- `helpers.ts` — `requireEnv`, `loadAppEnv`, validação pontual, wrap de handlers, Swagger. Sem pasta `helpers/`.
- `errors.ts` — todas as classes de erro. Sem pasta `errors/`.
- Validações de payload de eventos lançam uma classe de erro específica declarada em `errors.ts`, nunca `Error` genérico.
- Erros específicos de payload herdam de `InvalidPayloadError`. O consumidor envia esses eventos para uma Dead Letter Stream configurada por consumer e executa `XACK` somente depois da publicação; no retry, também remove a entrada da agenda e seus metadados. Outras falhas continuam elegíveis para retry.
- `database.ts` — conexão TypeORM. Sem pasta `database/`.

## Proibido

`controllers/`, `usecases/`, `repositories/`, `ports/`, `interfaces/`, `dtos/`, pasta `errors/`, `handlers/`, `factories/`, `http/`.

Não criar camada de repositório só para esconder TypeORM.

## Dependências

Rotas podem depender de Express e TypeORM. Não há Dependency Rule entre camadas.

## Simplicidade

Se a responsabilidade cabe na rota ou em `app.ts` sem tornar o código impraticável, não crie arquivo novo.

## Testes desta abordagem

- `test/` contém exclusivamente testes unitários das funções de negócio das rotas e dos handlers de consumidores, com TypeORM e Redis mockados em `test/mocks/`.
- Não criar em `test/` testes de controller/handler HTTP, testes com `createApp` ou `supertest`, nem testes end-to-end.
- Cada arquivo unitário usa um `describe` externo com o nome da operação e agrupa os casos aplicáveis em `describe('success', ...)` e `describe('errors', ...)`.
- `success` contém somente caminhos de sucesso. `errors` contém somente casos que lançam classes de erro da aplicação.
