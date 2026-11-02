# Regras Estruturais da Arquitetura Experimental — Clean Architecture

## 1. Objetivo

Este arquivo define as regras estruturais que devem ser utilizadas para validar a codebase desta branch do experimento: **Clean Architecture**.

Estas regras definem exclusivamente a **organização arquitetural da codebase**. O comportamento funcional, contrato da API, modelagem de dados, infraestrutura e tecnologias devem ser equivalentes às demais variantes do experimento (mantidas em outras branches).

O propósito deste arquivo é permitir validar se esta codebase realmente representa a arquitetura que declara representar.

---

# 2. Regras gerais

## 2.1 Tecnologias obrigatórias

A implementação deve utilizar:

- Node.js
- TypeScript
- Express
- TypeORM
- PostgreSQL
- Redis

Não é permitido introduzir um framework diferente ou uma tecnologia alternativa.

## 2.2 Estruturas permitidas

Somente devem existir estruturas arquiteturais que possuam uma responsabilidade claramente definida pela arquitetura.

Não devem ser criadas estruturas apenas para:

- aumentar a quantidade de abstrações;
- satisfazer uma preferência pessoal;
- evitar poucas linhas de código duplicadas;
- criar indireção sem necessidade arquitetural;
- introduzir padrões de projeto não previstos;
- criar aliases ou wrappers que não tenham responsabilidade arquitetural clara.

## 2.3 Equivalência funcional

Nenhuma estrutura arquitetural pode alterar deliberadamente:

- endpoints;
- request/response;
- status HTTP;
- regras de negócio;
- mensagens/eventos;
- modelo de dados;
- comportamento observado pelo cliente.

## 2.4 Infraestrutura compartilhada

PostgreSQL e Redis são infraestrutura externa.

`createApp` monta somente a aplicação HTTP. Os composition roots `financialConsumerApp.ts` e `orderConsumerApp.ts` criam os consumers financeiro e de pedidos; `server.ts` controla sua inicialização e encerramento separadamente.

## 2.5 Pastas por responsabilidade

O nome da pasta define o conteúdo permitido. Uma pasta `mocks/` só pode conter mocks. Funções de teste que não são mocks (por exemplo `invokeHandler`) devem viver no próprio arquivo de teste ou em `helpers/`.

A implementação possui:

- `middleware/authenticate.ts`: exige o header `x-api-key` igual a `X_API_KEY`; caso contrário, `ForbiddenError` (HTTP 403). Aplicado **por rota** da API (não via `app.use` global), para `/docs` permanecer público.
- `middleware/audit.ts`: registra a chamada da rota (método, path, params, query, body) e, em seguida, a resposta (status e body). Não registra a API key.
- `utils/Logger.ts`: `Logger.info`, `Logger.warn` e `Logger.error`. `requireEnv` permanece em `utils/env.ts`.

---

# 3. Clean Architecture

## 3.1 Objetivo arquitetural

Organizar a aplicação por responsabilidades técnicas mais refinadas e estabelecer uma direção explícita de dependências.

A primeira dimensão de organização continua sendo técnica.

A arquitetura não deve ser organizada prioritariamente por domínio.

## 3.2 Estruturas arquiteturais permitidas

A estrutura principal deve ser:

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

Essas estruturas representam as responsabilidades arquiteturais oficiais da implementação Clean.

## 3.3 Responsabilidades

### `controllers/`

Responsável por:

- receber requisições HTTP;
- transformar HTTP em input para Use Cases;
- chamar Use Cases;
- transformar resultados em respostas HTTP;
- realizar o mapeamento entre erros da aplicação e HTTP.

Controllers não devem implementar a regra de negócio principal.

Organizados por recurso HTTP:

```text
controllers/
    cart/
        cart.controller.ts
        routes/
            create.route.ts
            show.route.ts
            addItem.route.ts
            removeItem.route.ts
```

Não deve existir pasta `src/routes/`.

Arquivos de rota são classes que estendem `RouterBase` (`asHandler()`). Toda rota abre uma transação TypeORM.

### `usecases/`

Responsável pelas operações de negócio da aplicação.

Exemplos:

```text
AddCartItem
RemoveCartItem
CreateOrder
ProcessPayment
```

Os Use Cases representam a principal unidade de lógica de aplicação.

Estendem `UseCase` em `base/useCase.base.ts`. A entrada pública é `run`; `execute` é protegido. A transação **não** vive no use case.

### `entities/`

Responsável pelas regras e objetos centrais do domínio, sem depender diretamente de Express, TypeORM ou infraestrutura externa.

### `events/`

Contratos tipados de eventos, payloads validados e enums de tipos e streams. Não executa comandos Redis.

### `ports/`

Responsável pelas abstrações de persistência e publicação utilizadas pelos Use Cases.

Exemplo:

```text
ProductRepository
CartRepository
CartItemRepository
IEventService
```

### `repositories/`

Implementações concretas das ports (TypeORM). Não contém entidades TypeORM.

### `services/`

Responsável por operações técnicas ou de domínio compartilhadas que não sejam adequadamente representadas por Entity ou Use Case.

Integrações externas e comandos Redis não são services: pertencem a `infrastructure/`.

### `consumers/`

`Consumer` organiza o ciclo de vida (`start`/`stop`), o algoritmo de consumo e o algoritmo comum de uma tentativa de retry, além de possuir o `consumerName`. A classe registra a primeira falha antes de delegar ao `handleFailure` concreto e registra a falha de retry antes de delegar ao `handleRetryFailure` concreto. `FinancialConsumer` compõe um `Consumer` abstrato e registra handlers financeiros, sem herdar nem depender de `RedisConsumer`; `financialConsumerApp.ts`, na raiz de `src/`, monta as implementações concretas, em paralelo a `app.ts` para HTTP, e `server.ts` inicia o consumer após as conexões. `IConsumerSettings` descreve os parâmetros e `ConsumerSettings` lê e valida o ambiente. `EventDispatcher` chama handlers registrados por tipo. Todos os arquivos desta pasta começam com letra minúscula.

### `handler/`

Contém todos os handlers concretos de eventos. Handlers validam e extraem o payload dos eventos, delimitam a transação e chamam Use Cases apenas com os dados de negócio necessários; Use Cases acionados por consumidores não recebem instâncias de eventos como entrada. Os efeitos de negócio ficam nos Use Cases. Handlers concretos não importam nem acionam `Logger`.

### `presenters/`

Um presenter por entidade de domínio. Transforma o modelo de domínio no payload HTTP. Controllers não devem serializar a resposta inline.

### `middleware/`

Middlewares HTTP compartilhados: `errorHandler`, `authenticate` e `audit`.

### `utils/`

Utilitários técnicos sem regra de negócio: `requireEnv`, `loadAppEnv`, `Logger`, `format`, `parser` e `time`. Não devem viver em `infrastructure/`.

### `base/`

Classes abstratas compartilhadas da aplicação:

- `useCase.base.ts`: `UseCase.run` com logs
- `router.base.ts`: `RouterBase.asHandler` envolve o handle numa transação via `DbManager`; rotas que retornam `RouteResponse` enviam a resposta após o commit e as ações pós-commit
- `eventHandler.base.ts`: classe abstrata comum dos handlers de eventos; seu método público executa o método protegido do handler concreto e registra o sucesso somente depois que o processamento termina, com `eventId` e o payload validado

Use cases não importam `router.base`.

### `manager/`

`DbManager` encapsula QueryRunner (connect, transação, commit/rollback, release) e executa ações registradas somente depois do commit. Repositórios obtêm o `EntityManager` corrente com `DbManager.getManager(dataSource)`.

### `errors/`

Responsável pelos erros semânticos identificáveis utilizados pelos Use Cases e outras partes da aplicação.

### `infrastructure/`

Responsável por:

- entidades TypeORM (`infrastructure/typeorm/`);
- adaptadores Redis em `infrastructure/redis/`, separados entre factory/conexão, comandos de Streams, armazenamento do estado de retry, implementação de `IEventService` e `RedisConsumer`;
- `RedisConsumer`, responsável pela leitura de Redis Streams, retry, reconciliação da PEL, lease e Dead Letter; utiliza `utils/parser` para interpretar datas e números recebidos do Redis e erros técnicos específicos para seus estados inválidos, sem lançar `Error` genérico;
- TypeORM DataSource;
- PostgreSQL (conexão);
- clientes de integrações externas;
- detalhes de framework (Swagger).

Implementações de repository não pertencem a `infrastructure/`. Em `infrastructure/redis/`, cada comando recebe a conexão Redis explicitamente; não há cliente global, `getRedis` nem parâmetros com conexão implícita. `requireEnv` é permitido somente no factory que cria a conexão. `EventRedisService` implementa `IEventService`, registra publicações da aplicação para depois do commit via `DbManager` e publica Dead Letter imediatamente. Falhas técnicas próprias dessa infraestrutura usam erros específicos, sem `Error` genérico. `XACK` só ocorre após o commit do processamento, e suas falhas não são classificadas como falhas do handler.

## 3.4 Regra de dependência

A regra fundamental é:

```text
Infrastructure → Application/Domain
Application/Controllers → Use Cases
Use Cases → ports, entities, events
Entities → nenhum detalhe externo
```

Em particular:

```text
entities
    NÃO podem importar Express
    NÃO podem importar TypeORM
    NÃO podem importar Redis
    NÃO podem importar infrastructure

usecases
    NÃO podem depender diretamente de TypeORM
    NÃO podem depender diretamente de Express
    NÃO podem depender de infrastructure concreta
    NÃO podem depender de repositories concretos
    dependem de ports

controllers
    podem depender de usecases, presenters e base/router
    usam TypeORM somente via RouterBase / DbManager (transação)

repositories
    implementam ports
    usam DbManager.getManager para o EntityManager da transação corrente

consumers
    podem depender de base/eventHandler, events e ports

handler
    pode depender de base/eventHandler, events, manager e usecases

infrastructure/redis
    pode depender de consumers, errors, events, manager, ports, utils e Redis
```

## 3.5 Estruturas proibidas

Não devem ser criadas subdivisões adicionais de domínio como primeira dimensão:

```text
catalog/
ordering/
payments/
inventory/
contexts/
```

Isso caracterizaria uma mudança em direção ao Domain-Oriented Modular Monolith.

Também não devem existir abstrações adicionais sem responsabilidade clara, como:

```text
factories/
managers/
providers/
orchestrators/
```

quando utilizadas apenas como camadas intermediárias genéricas.

## 3.6 Testes unitários

Na Clean, `test/mocks/` reúne todos os mocks de dependências e dados mockados de cenário dos testes unitários. Mocks de dependências ficam separados por repository, event service ou outra dependência; dados de cenário ficam em arquivos próprios por use case nessa mesma pasta. Não criar `test/data/`. Helpers HTTP, execução de handlers e asserts não pertencem a `mocks/`.

---

# 4. Regra de decisão: quando criar uma estrutura

Antes de criar qualquer arquivo ou diretório, deve-se responder:

1. Qual responsabilidade arquitetural ele possui?
2. Essa responsabilidade pertence a uma estrutura permitida pela arquitetura?
3. A estrutura já existente deveria conter essa responsabilidade?
4. Criar a nova estrutura altera a dimensão organizacional da arquitetura?
5. A nova estrutura introduz uma abstração desnecessária?

Se a resposta à pergunta 2 for "não", a estrutura não deve ser criada.

---

# 5. Regras de nomenclatura arquitetural

Os nomes devem revelar a responsabilidade do componente.

Exemplos:

```text
CreateOrderController
CreateOrder
OrderRepository
Order
ProductNotFoundError
PaymentGateway
```

Evitar nomes genéricos sem significado arquitetural:

```text
Manager
Helper
Utils
Handler
Processor
CommonService
BaseService
GenericRepository
```

a menos que exista uma responsabilidade arquitetural concreta e necessária.

Exceção normativa deste experimento: `utils/` existe para `Logger`, `env.ts`, `format`, `parser` e `time`.

---

# 6. Regra contra abstração acidental

Não criar abstrações somente porque duas estruturas possuem implementação semelhante.

```text
similaridade de código
    NÃO implica
necessidade de compartilhamento
```

---

# 7. Regra contra arquitetura cosmética

Não basta criar diretórios com nomes arquiteturais.

Uma codebase não é considerada Clean apenas porque possui:

```text
usecases/
entities/
repositories/
```

Ela precisa respeitar as dependências correspondentes.

---

# 8. Critérios de aprovação

Uma implementação será considerada aderente à arquitetura somente quando:

```text
1. Todas as estruturas obrigatórias existentes possuem responsabilidade definida.
2. Não existem estruturas arquiteturais proibidas.
3. Não existem estruturas extras sem justificativa arquitetural.
4. As regras de dependência são respeitadas.
5. A organização da codebase corresponde à dimensão estrutural definida.
6. O código funcional permanece equivalente ao das demais implementações do experimento.
```

Deve ser aprovada quando a primeira dimensão estrutural for responsabilidade técnica e a Dependency Rule for respeitada.

---

# 9. Regra experimental central

Esta codebase deve implementar:

```text
MESMO COMPORTAMENTO
MESMO CONTRATO
MESMA MODELAGEM
MESMA INFRAESTRUTURA
MESMAS TECNOLOGIAS
```

que as demais variantes do experimento (mantidas em outras branches), diferindo apenas em:

```text
COMO A INFORMAÇÃO E AS RESPONSABILIDADES
SÃO ORGANIZADAS DENTRO DA CODEBASE
```

## RF06 — Organização do consumidor de pedidos

`orderConsumerApp.ts` compõe o consumidor de pedidos, separado de HTTP. `server.ts` controla o ciclo de vida dos consumers financeiro e de pedidos.

`consumers/orderConsumer.ts` compõe `Consumer`; handlers separados em `handler/` abrem transações e acionam use cases distintos.

Dados mockados de `payment-approved`, `payment-declined` e `process-order-payment` pertencem a `test/mocks/`, um arquivo por operação; não criar `test/data/` para esses mocks.

## Estoque na criação e no cancelamento por recusa

`CreateOrder` e `CancelOrderPayment` usam ports de persistência. HTTP mantém transação em `RouterBase` + `DbManager`; o handler mantém a transação do consumo.

Baixa, pedido e itens são atômicos; devolução e cancelamento também. Bloquear produtos em ordem de ID e, no cancelamento, bloquear primeiro o pedido. Reentregas não repetem a devolução. Escritas concorrentes de estoque e catálogo protegem leitura e persistência na mesma transação.
