# Regras Estruturais da Arquitetura Experimental — MVC Técnico

## 1. Objetivo

Este arquivo define as regras estruturais que devem ser utilizadas para validar a codebase desta branch do experimento: **MVC Técnico**.

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

# 3. MVC Técnico

## 3.1 Objetivo arquitetural

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

## 3.2 Estruturas arquiteturais permitidas

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

## 3.3 Responsabilidade de cada estrutura

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

`ConfigConsumer` valida os parâmetros de ambiente. `RedisConsumer` implementa o ciclo de leitura, retry, reconciliação da PEL e Dead Letter. Cada consumer concreto implementa `processEvent` e os handlers dos tipos aceitos. Comandos Redis ficam em `services/redis.ts`; persistência fica nos models. `financialConsumerApp.ts` instancia o consumer financeiro e `server.ts` o inicia e encerra fora de `createApp`.

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

## 3.4 Organização obrigatória

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

## 3.5 Estruturas proibidas

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

## 3.6 Regras de dependência

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

## 3.7 Testes unitários

No MVC, `test/mocks/` separa mocks de persistência por Model, um arquivo por classe, mantém mocks de Redis em arquivo próprio e usa um arquivo de dados de cenário por rota ou handler de consumer testado.

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

Exceção normativa deste experimento: `utils/` existe para `Logger` e `env.ts`.

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

Uma codebase não é considerada MVC apenas porque possui `controllers/`, `models/`. Ela precisa respeitar as regras de dependência e organização horizontal por responsabilidade técnica definidas acima.

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

Deve ser aprovada quando a primeira dimensão estrutural for responsabilidade técnica e os domínios permanecerem distribuídos entre as estruturas técnicas.

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

`consumers/RedisConsumer.ts` é a base Redis existente; `ConsumerFinancial` e `OrderConsumer` herdam dela, com handlers no consumidor concreto.

Dados mockados de `payment-approved`, `payment-declined` e `process-order-payment` pertencem a `test/mocks/`, um arquivo por operação; não criar `test/data/` para esses mocks.

## Estoque na criação e no cancelamento por recusa

Rota e handler coordenam regra e transação; models recebem o EntityManager e executam acesso e persistência, inclusive consultas com bloqueio.

Baixa, pedido e itens são atômicos; devolução e cancelamento também. Bloquear produtos em ordem de ID e, no cancelamento, bloquear primeiro o pedido. Reentregas não repetem a devolução. Escritas concorrentes de estoque e catálogo protegem leitura e persistência na mesma transação.
