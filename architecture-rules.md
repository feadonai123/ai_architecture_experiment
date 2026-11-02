# Regras Estruturais da Arquitetura Experimental — Monólito Acoplado

## 1. Objetivo

Este arquivo define as regras estruturais que devem ser utilizadas para validar a codebase desta branch do experimento: **Monólito Acoplado**.

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
- `utils/Logger.ts`: `Logger.info`, `Logger.warn` e `Logger.error`. `requireEnv` permanece em `helpers.ts`.

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

A pasta `events/` contém a representação dos eventos destinados a Redis Streams: a classe abstrata comum, que exige um método de conversão, os eventos concretos com suas classes de payload, a classe que centraliza os nomes dos streams e o enum que centraliza os tipos de evento. Ela não encapsula o cliente Redis nem a publicação; a rota continua responsável por chamar o serviço Redis.

A pasta `consumers/` contém os processos consumidores de Redis Streams organizados por setor do e-commerce. Cada consumidor declara as listas de streams observados e eventos suportados, lê lotes de até dez mensagens e concentra o despacho e os handlers dos eventos daquele setor.

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

`test/mocks/` separa os mocks dos repositórios TypeORM por classe de entidade, mantém mocks de Redis em arquivo próprio e usa um arquivo de dados de cenário por rota ou handler de consumer testado.

---

# 4. Regra de decisão: quando criar uma estrutura

Antes de criar qualquer arquivo ou diretório, deve-se responder:

1. Qual responsabilidade arquitetural ele possui?
2. Essa responsabilidade pertence a uma estrutura permitida pela arquitetura?
3. A estrutura já existente deveria conter essa responsabilidade?
4. Criar a nova estrutura altera a dimensão organizacional da arquitetura?
5. A nova estrutura introduz uma abstração desnecessária?

Se a resposta à pergunta 2 for "não", a estrutura não deve ser criada.

Se a nova estrutura existir somente para evitar poucas linhas de duplicação, ela deve ser evitada.

---

# 5. Regras de nomenclatura arquitetural

Os nomes devem revelar a responsabilidade do componente.

Exemplos:

```text
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

Exceção normativa deste experimento: `helpers.ts` existe para `requireEnv` / `loadAppEnv` (e wrap/Swagger). `utils/` existe somente para `Logger`. Não criar `utils/` para regras de negócio.

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

Não basta criar diretórios com nomes arquiteturais. A organização precisa respeitar as regras de dependência e simplicidade definidas acima para ser considerada aderente.

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

Deve ser aprovada quando apresentar organização mínima e ausência de camadas arquiteturais artificiais.

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

`consumers/consumerOrder.ts` copia o algoritmo completo do financeiro e concentra despacho e handlers com TypeORM direto.

Dados mockados de `payment-approved`, `payment-declined` e `process-order-payment` pertencem a `test/mocks/`, um arquivo por operação; não criar `test/data/` para esses mocks.

## Estoque na criação e no cancelamento por recusa

Regra na função da rota de criação e no handler de recusa, com TypeORM direto e transação local.

Baixa, pedido e itens são atômicos; devolução e cancelamento também. Bloquear produtos em ordem de ID e, no cancelamento, bloquear primeiro o pedido. Reentregas não repetem a devolução. Escritas concorrentes de estoque e catálogo protegem leitura e persistência na mesma transação.
