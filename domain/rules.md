# Domain-Oriented Modular Monolith

## Objetivo

Organizar primeiro por **contexto**, depois por **operação**, depois por responsabilidade técnica.

```text
contexto → operação → responsabilidade técnica
```

Os contextos são `ordering/` (carrinho e pedidos), `payments/` (pagamentos), `inventory/` (estoque, RF03) e `catalog/` (produtos, RF01/RF02). Cada operação possui seus próprios use cases, repositories, controllers ou handlers e erros, seguindo os componentes existentes.

## Estrutura de um contexto

```text
ordering/
├── createCart/   usecases, repositories, controllers
├── getCart/      usecases, repositories, controllers, errors
├── addCartItem/  ...
├── removeCartItem/
├── createOrder/  usecases, repositories, controllers, errors
├── cart.controller.ts   # registra as rotas HTTP de carrinho
└── order.controller.ts  # registra as rotas HTTP de pedido

inventory/
├── listStocks/
├── getStock/
├── updateStock/
├── increaseStock/
├── decreaseStock/
└── stock.controller.ts

catalog/
├── listProducts/
├── getProduct/
├── createProduct/
├── updateProduct/
├── deleteProduct/
└── product.controller.ts

payments/
├── createOrderPayment/  usecases, repositories, handlers, errors
└── financial.consumer.ts  # registra handlers do consumer financeiro
```

Pastas internas só existem se houver código. Sem `presenters/` dentro do contexto.

## Componentes globais técnicos

```text
src/services/     Redis
src/middleware/   errorHandler, authenticate (por rota), audit
src/utils/        env, Logger, format, parser, time
src/manager/      DbManager
```

## `shared/`

```text
shared/
├── entities/      Cart, CartItem, Product, Order, OrderItem, OrderPayment (domínio, sem TypeORM)
├── database/      records TypeORM, DataSource, schema (papel da infrastructure da Clean)
├── presenters/    payload HTTP
├── base/          UseCase, RouterBase
├── consumers/     Consumer, dispatcher, settings e estado de retry
├── events/        eventos, payloads e contratos de publicação
└── infrastructure/ Redis, RedisConsumer e detalhes técnicos externos
```

Não colocar em `shared/` regra que pertence a uma operação só para reduzir duplicação.

## Responsabilidades

- Use case da operação estende `UseCase` em `shared/base`; API pública é `run`.
- `repositories/` da operação: só implementação. Sem entities TypeORM.
- Controllers da operação estendem `RouterBase`; o agregador usa `.asHandler()`.
- Handlers de eventos pertencem à operação que executam e estendem `EventHandler` em `shared/base`.
- Erros: por operação, não globais (`src/errors/` é proibido).
- Duplicar `CartRepository` entre operações é permitido e esperado.

## Transação

`RouterBase.asHandler` abre transação via `DbManager`. Use cases não importam `router.base` nem `manager/`. Repos usam `DbManager.getManager(dataSource)`.

Efeitos externos que dependem da persistência, como publicar um evento, são registrados no `DbManager` e executados depois do commit. Quando a resposta depende desse efeito, o controller retorna um `RouteResponse` para o `RouterBase` enviá-la somente após o commit e os callbacks registrados.

Handlers de consumers que alteram persistência também abrem uma transação via `DbManager`; o `XACK` ocorre somente depois que o handler e o commit terminam com sucesso.

## Consumers

`financialConsumerApp.ts` é a composition root do consumer financeiro. As classes de consumer, despacho, configuração e estado de retry vivem em `shared/consumers`; as classes de evento vivem em `shared/events`; Redis e `RedisConsumer` vivem diretamente em `shared/infrastructure`. A classe que registra os handlers do contexto vive em `payments/financial.consumer.ts`, e cada handler fica dentro da operação correspondente.

Erros semânticos da regra de negócio continuam dentro da operação. Erros puramente técnicos do adaptador Redis ficam em `shared/infrastructure/errors/`.

`createApp` não inicia consumers. `server.ts` inicia e encerra o consumer financeiro separadamente da aplicação HTTP.

## Proibido

Camadas globais `src/controllers`, `src/usecases`, `src/repositories`, `src/entities`, `src/presenters`, `src/base`, `src/errors`.

`src/ordering/ports`, `src/ordering/infrastructure`, `src/ordering/presenters`.

## Isolamento

Um contexto não acessa a implementação interna de outro. Integração explícita.

## Testes desta abordagem

- Unitários **somente de use cases** (`run`), com dependências mockadas em `test/mocks/`.
- Não criar testes de controller/handler HTTP, testes com `createApp` ou `supertest`, nem testes end-to-end.
- Cada arquivo unitário usa um `describe` externo com o nome da operação e agrupa os casos aplicáveis em `describe('success', ...)` e `describe('errors', ...)`.
- `success` contém somente caminhos de sucesso. `errors` contém somente casos que lançam classes de erro da aplicação.
