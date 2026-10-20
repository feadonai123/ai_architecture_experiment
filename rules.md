# Regras gerais

Estas regras valem para **todas** as abordagens (`monolith/`, `mvc/`, `clean/`, `domain/`). Regras específicas de cada arquitetura estão em `<abordagem>/rules.md`. O mapa estrutural normativo continua em `architecture-rules.md`.

## Experimento

As quatro codebases implementam o **mesmo** recorte de catálogo, estoque, carrinho, pedidos e pagamentos: mesmo contrato HTTP, mesmos status, mesmos erros, mesma modelagem e a mesma infra (Node, TypeScript, Express, TypeORM, PostgreSQL, Redis).

A variável do experimento é **só a organização do código**. Não mude comportamento para “melhorar” uma abordagem.

Contratos canônicos: `test/contracts/cart.md`, `test/contracts/stock.md`, `test/contracts/product.md`, `test/contracts/order.md` e `docs/openapi.yaml`.

## Pasta define responsabilidade

O nome da pasta define o que pode existir nela. Todo arquivo exportado deve ter a responsabilidade da pasta em que está.

Exemplos:

- `mocks/` — somente mocks. Nada de helpers, `invokeHandler`, factories de app ou asserts.
- `prefabs/` — somente montagem de dados de teste no banco.
- `presenters/` — somente transformação do modelo no payload HTTP.
- `middleware/` — somente middlewares HTTP.
- `utils/` — somente utilitários técnicos, sem regra de negócio.

Se uma função não for da pasta, ela não entra nessa pasta. Prefira o arquivo de teste, `helpers/`, ou a pasta cuja responsabilidade corresponde.

## Autenticação, auditoria e env

- Header obrigatório `x-api-key` igual a `X_API_KEY` (sem fallback) nas rotas da API. Ausente ou diferente → `ForbiddenError` (403). O middleware `authenticate` é registrado **em cada rota**, não com `app.use` global. `/docs` (Swagger) fica público.
- `audit` loga chamada (método, path, params, query, body) e resposta JSON. Não loga a API key.
- O processamento financeiro de `OrderCreated` registra sucesso via `Logger.info` somente após o commit, com `eventId`, `orderId`, `userId` e `items`, em todas as abordagens.
- Consumers emitem logs somente no sucesso do handler, na primeira falha do evento e na falha de uma tentativa de retry, usando exatamente as estruturas definidas em `flows/RedisConsumer.md`. Falhas auxiliares de leitura, confirmação, agendamento, reconciliação, Dead Letter ou do ciclo não geram logs adicionais.
- `requireEnv` não tem valor default. Variáveis novas entram em `.env`, `.env.example` e `.env.test`.
- `createApp` monta somente a aplicação HTTP e não cria nem inicia consumers. Nos projetos que possuem consumers, `financialConsumerApp.ts` e `orderConsumerApp.ts` criam os consumers financeiro e de pedidos; `server.ts` controla sua inicialização e encerramento separadamente.

## Testes de integração

Ficam em `test/integration/` na raiz e **devem passar nas quatro abordagens** (`APP_TARGET=monolith|mvc|clean|domain`).

- Os projetos de cada abordagem devem ser tratados como independentes e não devem conhecer nem citar caminhos, arquivos ou estruturas do repositório agregador.
- A localização compartilhada dos testes de integração é uma regra exclusiva deste repositório agregador; ela não deve aparecer em `<abordagem>/rules.md`.
- No monólito, a pasta `monolith/test/` contém somente testes unitários. Testes de controller/handler HTTP, testes com `createApp` ou `supertest` e testes end-to-end não pertencem a essa pasta.

- Sempre cobrir caminho de sucesso **e** caminho de erro.
- Dentro de `test/integration/<recurso>/`, cada rota/operação deve ter um arquivo `*.test.ts` próprio, seguindo o padrão de `test/integration/cart/`. Casos transversais, como autenticação, ficam em arquivo separado. Não concentrar todas as rotas do recurso em um único arquivo.
- Casos de erro testam **apenas** erros lançados pela aplicação (`CartNotFoundError`, `InvalidQuantityError`, `ForbiddenError`, etc.), com o `error`, `message` e `statusCode` do contrato.
- Não testar timeouts de rede, SQL cru, stack de framework, nem mensagens genéricas que a aplicação não emite.
- Dados de persistência via `test/prefabs/`. HTTP autenticado via `test/helpers/api.ts` (não via `mocks/`).
- Novo endpoint, status ou classe de erro no contrato → novo teste de integração compartilhado.
- Testes de integração de consumers sem endpoint HTTP iniciam o consumer pela respectiva composition root, publicam o evento real no Redis e aguardam os efeitos observáveis no PostgreSQL e no Redis.
- O setup compartilhado expõe as conexões de teste necessárias e limpa, antes de cada caso, tanto as tabelas do PostgreSQL quanto streams, agenda, metadados de retry e Dead Letter conhecidos do Redis.

## Contratos HTTP

- Campos de status e outros campos com um conjunto limitado de valores são representados por `enum` na aplicação. O contrato HTTP define se o valor serializado é texto ou número.
- Cada recurso possui seu próprio arquivo Markdown em `test/contracts/`.
- Rotas de carrinho pertencem a `test/contracts/cart.md`.
- Rotas de estoque pertencem a `test/contracts/stock.md`.
- Rotas de pedidos pertencem a `test/contracts/order.md`.
- Rotas de catálogo pertencem a `test/contracts/product.md`.
- Não misturar contratos de recursos diferentes no mesmo arquivo.

## Testes unitários

- Clean e Domain: unitários **somente de use cases** (`run`), com ports/repositórios mockados.
- MVC: unitários dos handlers de rota, com models mockados, e dos consumers, com Redis e models mockados. `invokeHandler` vive no arquivo de teste, não em `mocks/`.
- Monólito: unitários das rotas e dos handlers de consumidores, com TypeORM e Redis mockados.
- Mocks em `test/mocks/` de cada abordagem: só funções/objetos mock.

## O que não fazer

- Não criar pasta, wrapper ou padrão só para evitar poucas linhas duplicadas.
- Não introduzir tecnologia diferente numa abordagem (outro ORM, outro HTTP framework, etc.).
- Não copiar estrutura de outra abordagem (ex.: `usecases/` no MVC, `src/controllers/` global no Domain).
- Não enfraquecer `requireEnv` com fallback.

## RF06 — Pagamento simulado

- Implementar o comportamento de `flows/RF06.md` de forma equivalente nas quatro aplicações. A rota persiste o pagamento e publica `PaymentApproved` ou `PaymentDeclinedError` no stream `payments` após commit. A recusa é persistida antes da resposta 422, sem rollback do resultado de negócio.
- O consumidor de pedidos altera o pedido para `PAID` na aprovação e `CANCELED` na recusa, com transação, bloqueio de escrita e `XACK` após commit. Rota e consumo são idempotentes; repetições da rota não publicam outro evento.
- Os unitários usam os mesmos valores de cenário, IDs, relógio e resultados simulados nas quatro aplicações. As dependências mockadas respeitam a API de cada abordagem, sem importar código de outros projetos.
- Os dados mockados de `payment-approved`, `payment-declined` e `process-order-payment` pertencem a `test/mocks/`, um arquivo por operação. Helpers HTTP, execução de handlers e asserts continuam fora de `mocks/`.

## Estoque de pedidos

- `stock` representa a quantidade disponível para novas compras.
- Criar pedido reduz o estoque agregado por produto na mesma transação que grava pedido e itens. Consultar e bloquear produtos ativos em ordem crescente de ID antes de validar disponibilidade. Falha desfaz toda a operação.
- Aprovação e preparação financeira não alteram estoque. `OrderCreated` não provoca outra baixa.
- Recusa definitiva devolve as quantidades dos itens persistidos na mesma transação que muda o pedido de `PAYMENT_PENDING` para `CANCELED`. Bloquear primeiro o pedido e depois os produtos em ordem de ID. Pedido já cancelado não devolve novamente.
- A devolução inclui produtos excluídos logicamente, sem reativá-los. Falta de produto gera `ProductNotFoundError` e rollback; o evento segue retry, sem confirmação.
- Operações de estoque e alterações de catálogo que salvam produtos usam leitura com bloqueio de escrita e persistência na mesma transação, evitando sobrescrever baixas e devoluções concorrentes. A definição absoluta de estoque continua sendo uma substituição explícita da quantidade disponível.
- Erros de validação ou infraestrutura do pagamento não representam recusa definitiva e não liberam estoque automaticamente.

## RF08 — Consulta de status dos pedidos

- `GET /orders/:orderId/status` segue `flows/RF08.md` nas quatro aplicações: autenticação, validação de UUID e consulta do pedido, nessa ordem; resposta com `orderId` e `status` numérico.
- Consultar o status persistido no pedido, inclusive antes da criação do pagamento e após cancelamento. Não inferir status pelo pagamento, alterar dados, adquirir bloqueio de escrita ou publicar eventos.
- As atualizações dos consumers permanecem assíncronas. A consulta não aguarda nem executa o processamento de eventos.
