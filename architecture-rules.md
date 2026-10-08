# Regras Estruturais das Arquiteturas Experimentais

## 1. Objetivo

Este arquivo define as regras estruturais que devem ser utilizadas para validar as quatro codebases do experimento:

1. Monólito Acoplado
2. MVC Técnico
3. Clean Architecture
4. Domain-Oriented Modular Monolith

Estas regras definem exclusivamente a **organização arquitetural da codebase**. O comportamento funcional, contrato da API, modelagem de dados, infraestrutura e tecnologias devem ser equivalentes entre as implementações.

O propósito deste arquivo é permitir validar se uma codebase realmente representa a arquitetura que declara representar.

---

# 2. Regras gerais para todas as arquiteturas

## 2.1 Tecnologias obrigatórias

Todas as implementações devem utilizar:

- Node.js
- TypeScript
- Express
- TypeORM
- PostgreSQL
- Redis

Não é permitido introduzir um framework diferente ou uma tecnologia alternativa para representar uma arquitetura específica.

## 2.2 Estruturas permitidas

Somente devem existir estruturas arquiteturais que possuam uma responsabilidade claramente definida pela arquitetura correspondente.

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

PostgreSQL e Redis são infraestrutura externa comum a todas as implementações.

A utilização dessas dependências pode ser encapsulada de maneiras diferentes conforme a arquitetura, mas não deve ser criada uma infraestrutura tecnicamente diferente para uma implementação.

`createApp` monta somente a aplicação HTTP. Nos projetos que possuem consumers, um composition root `financialConsumerApp.ts` cria o consumer financeiro e `server.ts` controla sua inicialização e encerramento separadamente.

## 2.5 Pastas por responsabilidade

O nome da pasta define o conteúdo permitido. Uma pasta `mocks/` só pode conter mocks. Funções de teste que não são mocks (por exemplo `invokeHandler`) devem viver no próprio arquivo de teste ou em `helpers/`.

Todas as implementações possuem:

- `middleware/authenticate.ts`: exige o header `x-api-key` igual a `X_API_KEY`; caso contrário, `ForbiddenError` (HTTP 403). Aplicado **por rota** da API (não via `app.use` global), para `/docs` permanecer público.
- `middleware/audit.ts`: registra a chamada da rota (método, path, params, query, body) e, em seguida, a resposta (status e body). Não registra a API key.
- `utils/Logger.ts`: `Logger.info`, `Logger.warn` e `Logger.error`. No monólito, `requireEnv` permanece em `helpers.ts`; nas demais abordagens, permanece em `utils/env.ts`.

---

# 3. Monólito Acoplado

## 3.1 Objetivo arquitetural

Representar uma aplicação com organização arquitetural mínima, forte acoplamento e ausência de fronteiras internas formais entre responsabilidades.

A aplicação deve possuir o menor número razoável de estruturas arquiteturais.

## 3.2 Estruturas permitidas

As únicas estruturas arquiteturais principais permitidas são:

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

A pasta `entities/` é permitida exclusivamente para representar as entidades necessárias ao TypeORM.

A pasta `enums/` define status e outros conjuntos limitados de valores usados pela aplicação.

A pasta `presenters/` transforma o modelo persistido no payload HTTP.

A pasta `middleware/` contém middlewares HTTP compartilhados: `errorHandler`, `authenticate` e `audit`.

A pasta `events/` contém a representação dos eventos destinados a Redis Streams: a classe abstrata comum, que exige um método de conversão, os eventos concretos com suas classes de payload, a classe que centraliza os nomes dos streams e o enum que centraliza os tipos de evento. Ela não encapsula o cliente Redis nem a publicação; no monólito, a rota continua responsável por chamar o serviço Redis.

A pasta `consumers/` contém os processos consumidores de Redis Streams organizados por setor do e-commerce. No monólito, cada consumidor declara as listas de streams observados e eventos suportados, lê lotes de até dez mensagens e concentra o despacho e os handlers dos eventos daquele setor.

A pasta `utils/` contém somente `Logger`. `requireEnv` / `loadAppEnv` permanecem em `helpers.ts`.

A pasta `services/` expõe o cliente Redis (`createRedis`) e a publicação de eventos em Redis Streams (`publish`). O `server.ts` chama o cliente diretamente para verificação de saúde (`redis.ping()`).

## 3.3 Responsabilidade das estruturas

### `app.ts`

Responsável por montar a aplicação Express, registrar rotas, Swagger e o tratamento de erros HTTP. Não cria nem inicia consumers Redis; `financialConsumerApp.ts` cria o consumer e `server.ts` controla seu ciclo de vida.

### `database.ts`

Responsável exclusivamente pela configuração/conexão do banco de dados.

### `errors.ts`

Arquivo único com todas as classes de erro da aplicação.

Erros específicos de payload de eventos herdam de `InvalidPayloadError`.

Não deve existir uma pasta `errors/`.

### `helpers.ts`

Arquivo único com funções auxiliares: `requireEnv`, `loadAppEnv`, validação pontual, wrap de handlers e Swagger.

Não deve existir uma pasta `helpers/`. `utils/` existe somente para `Logger`.

### `routes/`

Um arquivo por rota/operação HTTP. Cada arquivo contém a leitura da requisição, a regra de negócio, o acesso direto ao TypeORM e, quando houver publicação de evento, a chamada ao `publish` do serviço Redis.

A resposta HTTP é produzida via `presenters/`.

Exemplos:

```text
routes/createCart.ts
routes/getCart.ts
routes/addCartItem.ts
routes/removeCartItem.ts
routes/listProducts.ts
routes/createProduct.ts
```

### `entities/`

Responsável exclusivamente por representar as entidades persistidas necessárias ao TypeORM.

### `services/`

Contém o factory do cliente Redis e a operação técnica comum de publicação em Redis Streams. A criação do evento e a decisão de publicá-lo permanecem na rota; o `server.ts` usa o cliente diretamente para `ping`.

### `events/`

Contém somente classes de eventos para Redis Streams. A classe abstrata concentra propriedades e serialização comuns e declara o método abstrato de conversão do payload. Cada evento concreto implementa esse método e define seu tipo, stream e classe de payload. Uma classe própria centraliza os nomes de streams e um enum próprio centraliza os tipos de evento usados por produtores e consumidores.

Na rota que produz um evento, a classe concreta de payload é instanciada explicitamente antes da classe do evento.

### `consumers/`

Contém um consumidor Redis Streams por setor do e-commerce. O arquivo do consumidor define seu consumer group, as listas de streams observados e tipos suportados, executa `XREADGROUP` com lotes de até dez mensagens, percorre cada lote e usa `processEvents` para selecionar o tipo e chamar o handler correspondente. O consumidor também mantém um loop de retry com conexão Redis própria, agenda as tentativas em Sorted Set, mantém os metadados em Hash, aplica exponential backoff tabelado, usa `XCLAIM` para reclamar mensagens elegíveis e reconcilia a agenda com `XPENDING`. Erros de payload derivados de `InvalidPayloadError` enviam a entrada para uma Dead Letter Stream antes de `XACK`, tanto na leitura inicial quanto no retry; no retry, a agenda e os metadados também são removidos. Handlers que alteram persistência acessam o TypeORM diretamente e executam todas as alterações relacionadas em uma única transação. O sucesso do handler recebe `XACK` somente após o commit da transação. `financialConsumerApp.ts` cria o consumer e `server.ts` o inicia e encerra fora de `createApp`.

### `presenters/`

Um presenter por entidade. Transforma o modelo persistido no payload HTTP.

### `middleware/`

Middlewares HTTP compartilhados: `errorHandler`, `authenticate` e `audit`.

## 3.4 Estruturas proibidas

Não devem existir, como estruturas arquiteturais próprias:

```text
controllers/
usecases/
repositories/
interfaces/
dtos/
errors/          # pasta; o arquivo errors.ts é permitido
handlers/
factories/
ports/
```

Também não devem existir módulos adicionais criados apenas para separar responsabilidades que deveriam permanecer acopladas nesta arquitetura.

## 3.5 Regras de dependência

- `routes/` pode depender diretamente de TypeORM.
- `routes/` pode depender diretamente de Express.
- `app.ts` pode depender de `routes/`, `helpers.ts` e Express.
- Regras de negócio podem acessar diretamente a persistência.
- Não há Dependency Rule arquitetural entre camadas.
- Não deve existir uma camada de abstração de repositório apenas para ocultar TypeORM.

## 3.6 Regra de simplicidade

Se uma nova responsabilidade puder ser implementada diretamente em uma rota ou em `app.ts` sem tornar o código impraticável, não deve ser criada uma nova estrutura arquitetural para ela.

A existência de um arquivo adicional deve ser justificada por necessidade técnica concreta, e não por organização arquitetural.

## 3.7 Testes unitários

No monólito, `test/mocks/` separa os mocks dos repositórios TypeORM por classe de entidade, mantém mocks de Redis em arquivo próprio e usa um arquivo de dados de cenário por rota ou handler de consumer testado.

---

# 4. MVC Técnico

## 4.1 Objetivo arquitetural

Organizar a aplicação principalmente por **responsabilidade técnica**.

A primeira dimensão de organização é:

```text
Controller
Model
Entity
Event
Consumer
Service
Presenter
Middleware
Error
```

Domínios diferentes podem aparecer dentro das mesmas estruturas técnicas.

## 4.2 Estruturas arquiteturais permitidas

A estrutura principal deve ser:

```text
src/
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

Não deve existir pasta `src/routes/` nem pasta `src/database/`.

As estruturas acima são as estruturas arquiteturais oficiais do MVC experimental.

## 4.3 Responsabilidade de cada estrutura

### `controllers/`

Organizados por recurso HTTP. Cada recurso tem um arquivo que registra as rotas e uma pasta `routes/` com um arquivo por operação:

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

`cart.controller.ts` associa método HTTP ao arquivo da rota. Cada `*.route.ts` recebe a requisição, valida entrada HTTP, coordena Models/Services, chama o presenter e produz a resposta.

A regra de negócio pode permanecer no arquivo da rota neste experimento.

### `entities/`

Mapeamento TypeORM (decorators, colunas, relações). Sem métodos de persistência além do que o TypeORM exige.

### `enums/`

Define status e outros conjuntos limitados de valores usados pela aplicação.

### `models/`

Importam a entity correspondente e concentram somente as operações de acesso e persistência (`find`, `create`, `update`, `remove`, etc.) como métodos estáticos. No fluxo de pedidos, cálculos, status, idempotência e composição de pedido pertencem à rota ou ao handler do consumer; os models podem receber um `EntityManager` para usar a mesma transação. A rota coordena a transação que persiste pedido e itens.

### `events/`

Contém o contrato, a validação e a serialização dos eventos da aplicação. Eventos não acessam o Redis diretamente; a publicação permanece em `services/`.

### `consumers/`

`ConfigConsumer` valida os parâmetros de ambiente. `Consumer` implementa o ciclo de leitura, retry, reconciliação da PEL e Dead Letter. Cada consumer concreto implementa `processEvent` e os handlers dos tipos aceitos. Comandos Redis ficam em `services/redis.ts`; persistência fica nos models. `financialConsumerApp.ts` instancia o consumer financeiro e `server.ts` o inicia e encerra fora de `createApp`.

### `services/`

Operações técnicas compartilhadas. Redis: todas as ações (`createRedis`, `getRedis`, `ping` e futuras) ficam no service.

Não deve existir um Service apenas para mover código arbitrariamente para outro arquivo.

### `presenters/`

Um presenter por entidade. Transforma o modelo de domínio no payload HTTP.

### `middleware/`

Middlewares HTTP compartilhados: `errorHandler`, `authenticate` e `audit`.

### `errors/`

Responsável pelas classes de erro reconhecíveis da aplicação.

Exemplos:

```text
ProductNotFoundError
CartNotFoundError
InvalidQuantityError
InsufficientStockError
ForbiddenError
```

### `utils/`

Utilitários técnicos sem regra de negócio. Nesta fatia, `requireEnv`, `loadAppEnv` e `Logger`.

### `database.ts`

Arquivo único de configuração/conexão TypeORM. Não deve existir pasta `database/`.

## 4.4 Organização obrigatória

Os componentes devem ser organizados horizontalmente por responsabilidade técnica.

Exemplo válido:

```text
controllers/
    cart/
        cart.controller.ts
        routes/
            create.route.ts

models/
    Cart.ts
    CartItem.ts
    Product.ts

entities/
    Cart.ts
    CartItem.ts
    Product.ts
```

Não deve existir como primeira dimensão:

```text
products/
orders/
payments/
```

## 4.5 Estruturas proibidas

O MVC experimental não deve possuir estruturas características da Clean Architecture ou do Domain-Oriented Modular Monolith, como:

```text
usecases/
repositories/             # como camada de abstração arquitetural
ports/
adapters/
domain/
contexts/
bounded-contexts/
routes/                   # pasta de topo; rotas ficam em controllers/<recurso>/routes
```

`services/` é permitido somente como responsabilidade técnica transversal.

## 4.6 Regras de dependência

Fluxo esperado:

```text
controllers/<recurso>
  ↓
controllers/<recurso>/routes
  ↓
models / services / presenters
  ↓
database.ts / Redis
```

Regras mínimas:

- O registro de rotas não contém regra de negócio.
- Arquivos de rota podem depender de Models, Services e Presenters.
- Models importam Entities e TypeORM.
- Services centralizam Redis.
- Presenters não acessam persistência.
- `requireEnv` / `loadAppEnv` vivem em `utils/`.
- O sistema não precisa aplicar a Dependency Rule da Clean Architecture.
- Domínios diferentes podem compartilhar Models e Services.

---

## 4.7 Testes unitários

No MVC, `test/mocks/` separa mocks de persistência por Model, um arquivo por classe, mantém mocks de Redis em arquivo próprio e usa um arquivo de dados de cenário por rota ou handler de consumer testado.

# 5. Clean Architecture

## 5.1 Objetivo arquitetural

Organizar a aplicação por responsabilidades técnicas mais refinadas e estabelecer uma direção explícita de dependências.

A primeira dimensão de organização continua sendo técnica.

A arquitetura não deve ser organizada prioritariamente por domínio.

## 5.2 Estruturas arquiteturais permitidas

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

## 5.3 Responsabilidades

### `controllers/`

Responsável por:

- receber requisições HTTP;
- transformar HTTP em input para Use Cases;
- chamar Use Cases;
- transformar resultados em respostas HTTP;
- realizar o mapeamento entre erros da aplicação e HTTP.

Controllers não devem implementar a regra de negócio principal.

Organizados por recurso HTTP, no mesmo esquema do MVC:

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

## 5.4 Regra de dependência

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

## 5.5 Estruturas proibidas

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

## 5.6 Testes unitários

Na Clean, `test/mocks/` contém apenas mocks de dependências separados por repository, event service ou outra dependência. Dados de cenário pertencem a `test/data/`, em um arquivo por use case testado.

---

# 6. Domain-Oriented Modular Monolith

## 6.1 Objetivo arquitetural

Organizar a codebase primeiro por **domínio/contexto semântico**, depois por **operação**, e dentro de cada operação por responsabilidade técnica.

A regra estrutural fundamental é:

```text
Contexto
    ↓
Operação
    ↓
Responsabilidade técnica
```

Exemplo:

```text
ordering/
    createCart/
        usecases/
        repositories/
        controllers/
    getCart/
        usecases/
        repositories/
        controllers/
        errors/
    addCartItem/
        usecases/
        repositories/
        controllers/
        errors/
    removeCartItem/
        ...
    createOrder/
        usecases/
        repositories/
        controllers/
        errors/
    cart.controller.ts
    order.controller.ts
```

## 6.2 Contextos permitidos

Os contextos implementados são `ordering/` (carrinho e pedidos), `inventory/` (estoque, RF03) e `catalog/` (produtos, RF01/RF02). As operações de cada contexto seguem os mesmos componentes: use cases, repositories, controllers e erros por operação.

Outros contextos (`payments/`) não devem ser criados sem que exista uma funcionalidade pertencente a eles.

## 6.3 Estrutura interna obrigatória de cada contexto

Dentro do contexto, a primeira subdivisão é a **operação**. Cada operação pode possuir:

```text
<context>/
├── <operation>/
│   ├── usecases/
│   ├── repositories/
│   ├── controllers/
│   └── errors/
└── <recurso>.controller.ts   # registra as rotas HTTP do contexto (cart.controller.ts, order.controller.ts, stock.controller.ts, product.controller.ts)
```

As estruturas devem ser criadas somente quando houver código correspondente àquela responsabilidade.

Não devem ser criadas pastas vazias ou camadas sem necessidade.

## 6.4 Responsabilidades

### operação (`createCart`, `getCart`, ...)

Agrupa tudo que pertence àquela operação HTTP/negócio.

### `usecases/`

Regras de aplicação da operação. Estendem `UseCase` em `shared/base`; a entrada pública é `run`.

### `repositories/`

Somente a implementação de persistência da operação. Não contém entities TypeORM.

### `controllers/`

Interface HTTP da operação. Classes que estendem `RouterBase` em `shared/base`; `asHandler()` envolve cada rota numa transação.

### `errors/`

Erros semânticos lançados por aquela operação.

### `presenters/`

Vivem em `shared/presenters/`. Transformam o modelo de domínio no payload HTTP compartilhado pelas operações.

## 6.5 Componentes compartilhados

Além de `shared/`, existem componentes técnicos globais que não pertencem a um contexto:

```text
src/services/      # Redis: createRedis, getRedis, ping
src/middleware/    # errorHandler, authenticate (por rota), audit
src/utils/         # requireEnv, loadAppEnv, Logger, format, parser, time
src/manager/       # DbManager (transação TypeORM e callbacks pós-commit)
```

Pode existir também:

```text
shared/
├── entities/      # entidades de domínio (Cart, CartItem, Product, Order, OrderItem)
├── database/      # equivalente à infrastructure da Clean: records TypeORM, DataSource, schema
├── presenters/    # serialização HTTP compartilhada
├── base/          # UseCase, RouterBase
├── messaging/
└── integrations/
```

Records TypeORM vivem em `shared/database/`, não nas pastas `repositories/` das operações.

`requireEnv` / `loadAppEnv` não vivem em `shared/database`. Redis não vive em `shared/messaging`.

Regras específicas de uma operação não devem ser movidas para `shared/` apenas para remover duplicação.

Efeitos externos dependentes da persistência devem ser registrados durante a transação e executados pelo `DbManager` depois do commit. O `RouterBase` pode receber um `RouteResponse` do controller para enviar a resposta somente após o commit e esses efeitos pós-commit.

## 6.6 Isolamento entre contextos

Um contexto não deve depender diretamente da implementação interna de outro contexto.

Deve existir uma interface ou mecanismo explícito de integração entre os contextos.

## 6.7 Duplicação permitida

Duplicação de código é permitida quando contribui para o isolamento de operação ou de contexto.

Não deve ser criada uma abstração global somente para eliminar duplicação entre operações.

Por exemplo, é permitido existir `CartRepository` em `getCart/` e outro em `addCartItem/`, cada um com os métodos que aquela operação precisa.

## 6.8 Estruturas proibidas

Não deve existir uma camada global que contenha as principais responsabilidades de todos os contextos:

```text
src/
├── controllers/
├── usecases/
├── repositories/
├── entities/
├── base/
```

Isso seria uma organização transversal semelhante à Clean Architecture.

A primeira dimensão obrigatoriamente deve ser o contexto; a segunda, a operação.

Também não devem ser criados contextos artificiais apenas para aumentar a modularização.

---

# 7. Comparação estrutural normativa

| Característica | Monólito Acoplado | MVC Técnico | Clean | Domain-Oriented |
|---|---|---|---|---|
| Primeira dimensão | aplicação | técnica | técnica | **domínio → operação** |
| Controller | não separado (rotas) | sim, por recurso + arquivo por rota | sim, por recurso + arquivo por rota | sim, por operação |
| Model | não como camada | sim (operações); Entity = TypeORM | não como camada principal | não como camada principal |
| Use Case | não | não | sim | sim, por operação |
| Entity | apenas representação ORM | TypeORM em `entities/` | sim (domínio) | `shared/entities/` |
| Presenter | pasta `presenters/` | pasta `presenters/` | pasta `presenters/` | `shared/presenters/` |
| Middleware | pasta `middleware/` | pasta `middleware/` | pasta `middleware/` | pasta `middleware/` |
| Repository abstraction | não | não | `ports/` | implementação por operação |
| Services | factory Redis + publicação em Streams | Redis centralizado | serviços compartilhados; Redis em `infrastructure/` | Redis centralizado |
| Errors | arquivo único | global | global | por operação |
| Env (`requireEnv`) | `helpers.ts` | `utils/` | `utils/` | `utils/` |
| Infrastructure | mínima (`database.ts`) | `database.ts` | explícita | compartilhada + específica quando necessária |
| Isolamento por domínio | baixo | baixo | baixo | **alto** |
| Duplicação entre domínios | permitida | permitida | reduzida | **explicitamente permitida** |
| Dependências rígidas | mínimas | moderadas | fortes | fortes + entre contextos |

---

# 8. Regra de decisão: quando criar uma estrutura

Antes de criar qualquer arquivo ou diretório, deve-se responder:

1. Qual responsabilidade arquitetural ele possui?
2. Essa responsabilidade pertence a uma estrutura permitida pela arquitetura?
3. A estrutura já existente deveria conter essa responsabilidade?
4. Criar a nova estrutura altera a dimensão organizacional da arquitetura?
5. A nova estrutura introduz uma abstração desnecessária?

Se a resposta à pergunta 2 for "não", a estrutura não deve ser criada.

Se a nova estrutura existir somente para evitar poucas linhas de duplicação, ela deve ser evitada, especialmente no Domain-Oriented Modular Monolith.

---

# 9. Regras de nomenclatura arquitetural

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

Exceção normativa deste experimento: `helpers.ts` no monólito existe para `requireEnv` / `loadAppEnv` (e wrap/Swagger). `utils/` existe em todas as abordagens para `Logger` e, a partir do MVC, também para `env.ts`. Clean e Domain também têm `format`, `parser` e `time`. Não criar `utils/` para regras de negócio.

---

# 10. Regra contra abstração acidental

Não criar abstrações somente porque duas estruturas possuem implementação semelhante.

Especialmente no Domain-Oriented Modular Monolith:

```text
similaridade de código
    NÃO implica
necessidade de compartilhamento
```

A duplicação pode ser intencional e arquiteturalmente válida.

---

# 11. Regra contra arquitetura cosmética

Não basta criar diretórios com nomes arquiteturais.

Uma codebase não é considerada Clean apenas porque possui:

```text
usecases/
entities/
repositories/
```

Ela precisa respeitar as dependências correspondentes.

Da mesma forma, uma codebase não é considerada Domain-Oriented apenas porque possui:

```text
ordering/
payments/
```

Os contextos precisam realmente possuir fronteiras e evitar acesso arbitrário às estruturas internas uns dos outros.

---

# 12. Critérios de aprovação

Uma implementação será considerada aderente à arquitetura somente quando:

```text
1. Todas as estruturas obrigatórias existentes possuem responsabilidade definida.
2. Não existem estruturas arquiteturais proibidas.
3. Não existem estruturas extras sem justificativa arquitetural.
4. As regras de dependência são respeitadas.
5. A organização da codebase corresponde à dimensão estrutural definida.
6. O código funcional permanece equivalente ao das demais implementações.
```

## 12.1 Monólito Acoplado

Deve ser aprovado quando apresentar organização mínima e ausência de camadas arquiteturais artificiais.

## 12.2 MVC Técnico

Deve ser aprovado quando a primeira dimensão estrutural for responsabilidade técnica e os domínios permanecerem distribuídos entre as estruturas técnicas.

## 12.3 Clean Architecture

Deve ser aprovado quando a primeira dimensão estrutural for responsabilidade técnica e a Dependency Rule for respeitada.

## 12.4 Domain-Oriented Modular Monolith

Deve ser aprovado quando a primeira dimensão estrutural for domínio/contexto e cada contexto possuir suas responsabilidades técnicas internas, com fronteiras explícitas entre contextos.

---

# 13. Regra experimental central

As quatro codebases devem implementar:

```text
MESMO COMPORTAMENTO
MESMO CONTRATO
MESMA MODELAGEM
MESMA INFRAESTRUTURA
MESMAS TECNOLOGIAS
```

A principal variável estrutural é:

```text
COMO A INFORMAÇÃO E AS RESPONSABILIDADES
SÃO ORGANIZADAS DENTRO DA CODEBASE
```

A comparação deve preservar especialmente a diferença entre:

```text
Organização por responsabilidade técnica
```

e:

```text
Organização por domínio → responsabilidade técnica
```

Essa diferença constitui uma das principais propriedades experimentais utilizadas para investigar a influência da co-localização semântica sobre a navegação e evolução da codebase por agentes de IA.
