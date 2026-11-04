# Regras Estruturais da Arquitetura Experimental — Domain-Oriented Modular Monolith

## 1. Objetivo

Este arquivo define as regras estruturais que devem ser utilizadas para validar a codebase desta branch do experimento: **Domain-Oriented Modular Monolith**.

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

# 3. Domain-Oriented Modular Monolith

## 3.1 Objetivo arquitetural

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
    getOrderStatus/
        usecases/
        repositories/
        controllers/
        errors/
    cart.controller.ts
    order.controller.ts
```

## 3.2 Contextos permitidos

Os contextos implementados são `ordering/` (carrinho e pedidos), `payments/` (pagamentos), `inventory/` (estoque, RF03) e `catalog/` (produtos, RF01/RF02). As operações de cada contexto seguem os componentes necessários: use cases, repositories, controllers ou handlers e erros por operação.

Outros contextos não devem ser criados sem que exista uma funcionalidade pertencente a eles.

## 3.3 Estrutura interna obrigatória de cada contexto

Dentro do contexto, a primeira subdivisão é a **operação**. Cada operação pode possuir:

```text
<context>/
├── <operation>/
│   ├── usecases/
│   ├── repositories/
│   ├── controllers/
│   ├── handlers/
│   └── errors/
└── <recurso>.controller.ts   # registra as rotas HTTP do contexto (cart.controller.ts, order.controller.ts, stock.controller.ts, product.controller.ts)
```

As estruturas devem ser criadas somente quando houver código correspondente àquela responsabilidade.

Não devem ser criadas pastas vazias ou camadas sem necessidade.

## 3.4 Responsabilidades

### operação (`createCart`, `getCart`, ...)

Agrupa tudo que pertence àquela operação HTTP/negócio.

### `usecases/`

Regras de aplicação da operação. Estendem `UseCase` em `shared/base`; a entrada pública é `run`.

### `repositories/`

Somente a implementação de persistência da operação. Não contém entities TypeORM.

### `controllers/`

Interface HTTP da operação. Classes que estendem `RouterBase` em `shared/base`; `asHandler()` envolve cada rota numa transação.

### `handlers/`

Interface de eventos da operação. Handlers estendem `EventHandler` em `shared/base` e abrem via `DbManager` a transação da regra executada pelo consumer.

### `errors/`

Erros semânticos lançados por aquela operação.

### `presenters/`

Vivem em `shared/presenters/`. Transformam o modelo de domínio no payload HTTP compartilhado pelas operações.

## 3.5 Componentes compartilhados

Além de `shared/`, existem componentes técnicos globais que não pertencem a um contexto:

```text
src/services/      # Redis
src/middleware/    # errorHandler, authenticate (por rota), audit
src/utils/         # requireEnv, loadAppEnv, Logger, format, parser, time
src/manager/       # DbManager (transação TypeORM e callbacks pós-commit)
```

Pode existir também:

```text
shared/
├── entities/      # entidades de domínio (Cart, CartItem, Product, Order, OrderItem, OrderPayment)
├── database/      # equivalente à infrastructure da Clean: records TypeORM, DataSource, schema
├── presenters/    # serialização HTTP compartilhada
├── base/          # UseCase, RouterBase
├── consumers/     # Consumer, dispatcher, settings e estado de retry
├── events/        # eventos, payloads e contratos de publicação
└── infrastructure/ # Redis, RedisConsumer e detalhes técnicos externos
```

Records TypeORM vivem em `shared/database/`, não nas pastas `repositories/` das operações.

`requireEnv` / `loadAppEnv` não vivem em `shared/database`. Classes de evento não encapsulam Redis; essa implementação vive diretamente em `shared/infrastructure`.

Regras específicas de uma operação não devem ser movidas para `shared/` apenas para remover duplicação.

Efeitos externos dependentes da persistência devem ser registrados durante a transação e executados pelo `DbManager` depois do commit. O `RouterBase` pode receber um `RouteResponse` do controller para enviar a resposta somente após o commit e esses efeitos pós-commit.

As classes genéricas de consumer vivem em `shared/consumers`, as classes de evento em `shared/events`, e Redis com `RedisConsumer` diretamente em `shared/infrastructure`. A composição fica em `financialConsumerApp.ts`; o registro dos handlers do contexto fica em `payments/financial.consumer.ts`; cada handler permanece na operação correspondente. `createApp` não inicia consumers, e `server.ts` controla seu ciclo de vida separadamente da aplicação HTTP. O `XACK` só ocorre depois do retorno bem-sucedido do handler e do commit.

Erros semânticos permanecem na operação. Erros exclusivamente técnicos do adaptador Redis podem viver em `shared/infrastructure/errors/`.

## 3.6 Isolamento entre contextos

Um contexto não deve depender diretamente da implementação interna de outro contexto.

Deve existir uma interface ou mecanismo explícito de integração entre os contextos.

## 3.7 Duplicação permitida

Duplicação de código é permitida quando contribui para o isolamento de operação ou de contexto.

Não deve ser criada uma abstração global somente para eliminar duplicação entre operações.

Por exemplo, é permitido existir `CartRepository` em `getCart/` e outro em `addCartItem/`, cada um com os métodos que aquela operação precisa.

## 3.8 Estruturas proibidas

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

# 4. Regra de decisão: quando criar uma estrutura

Antes de criar qualquer arquivo ou diretório, deve-se responder:

1. Qual responsabilidade arquitetural ele possui?
2. Essa responsabilidade pertence a uma estrutura permitida pela arquitetura?
3. A estrutura já existente deveria conter essa responsabilidade?
4. Criar a nova estrutura altera a dimensão organizacional da arquitetura?
5. A nova estrutura introduz uma abstração desnecessária?

Se a resposta à pergunta 2 for "não", a estrutura não deve ser criada.

Se a nova estrutura existir somente para evitar poucas linhas de duplicação, ela deve ser evitada, especialmente no Domain-Oriented Modular Monolith.

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

Especialmente no Domain-Oriented Modular Monolith:

```text
similaridade de código
    NÃO implica
necessidade de compartilhamento
```

A duplicação pode ser intencional e arquiteturalmente válida.

---

# 7. Regra contra arquitetura cosmética

Não basta criar diretórios com nomes arquiteturais.

Uma codebase não é considerada Domain-Oriented apenas porque possui:

```text
ordering/
payments/
```

Os contextos precisam realmente possuir fronteiras e evitar acesso arbitrário às estruturas internas uns dos outros.

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

Deve ser aprovada quando a primeira dimensão estrutural for domínio/contexto e cada contexto possuir suas responsabilidades técnicas internas, com fronteiras explícitas entre contextos.

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

Esta variante organiza por:

```text
Organização por domínio → responsabilidade técnica
```

Essa diferença constitui uma das principais propriedades experimentais utilizadas para investigar a influência da co-localização semântica sobre a navegação e evolução da codebase por agentes de IA.

## RF06 — Organização do consumidor de pedidos

`orderConsumerApp.ts` compõe o consumidor de pedidos, separado de HTTP. `server.ts` controla o ciclo de vida dos consumers financeiro e de pedidos.

`ordering/order.consumer.ts` registra handlers das operações `ordering/approveOrderPayment` e `ordering/cancelOrderPayment`. A rota fica em `payments/processOrderPayment`, registrada em `payments/payment.controller.ts`. A integração entre os contextos ocorre pelos eventos compartilhados.

Dados mockados de `payment-approved`, `payment-declined` e `process-order-payment` pertencem a `test/mocks/`, um arquivo por operação; não criar `test/data/` para esses mocks.

## Segunda chance após recusa de pagamento (até duas tentativas)

A operação `payments/processOrderPayment` declara explicitamente sua dependência de tentativas de pagamento (`order_payment_attempts`) no construtor do use case `ProcessOrderPayment`, ao lado das dependências já existentes de pedido e pagamento. O repository de tentativas vive em `payments/processOrderPayment/repositories/`, sobre o record compartilhado `shared/database/OrderPaymentAttemptRecord.ts`, seguindo o mesmo padrão dos demais records de `order_payments`/`orders`. Os erros `InvalidIdempotencyKeyError` e `PaymentAttemptConflictError` pertencem a `payments/processOrderPayment/errors/`, como os demais erros dessa operação.

O controller lê o cabeçalho `Idempotency-Key` e o passa ao use case; a validação de formato, a política de duas tentativas, a idempotência por chave e a decisão de publicar o evento (somente na tentativa definitiva) ficam inteiramente no use case, não no controller nem no `RouterBase`.

## Estoque na criação e no cancelamento por recusa

As operações `ordering/createOrder` e `ordering/cancelOrderPayment` declaram explicitamente sua dependência de estoque nos construtores dos use cases. Repositories locais implementam essa dependência usando os records compartilhados, sem importar implementações de outro contexto. Preservar a transação de `RouterBase`/handler via `DbManager`.

Baixa, pedido e itens são atômicos; devolução e cancelamento também. Bloquear produtos em ordem de ID e, no cancelamento, bloquear primeiro o pedido. Reentregas não repetem a devolução. Escritas concorrentes de estoque e catálogo protegem leitura e persistência na mesma transação.
