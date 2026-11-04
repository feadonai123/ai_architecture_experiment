# Pedidos e pagamentos — RF05, RF06 e RF08

## POST `/orders`

Requer `x-api-key`. Corpo: `userId` e lista não vazia de `items`, cada item com `productId` e `quantity` inteira positiva.

O servidor valida usuário, produtos ativos e estoque agregado por produto; consulta e bloqueia os produtos na transação em ordem crescente de ID; reduz o estoque disponível e grava pedido e itens atomicamente, com `OrderStatus.PENDING = 0`, preço unitário atual e total calculado no servidor. Depois do commit, publica `OrderCreated` no stream `orders` com os campos `event`, `eventId`, `timestamp` e `payload`. A resposta de sucesso é `201` e contém `id`, `userId`, `status`, `total`, `createdAt` e `items` (`productId`, `quantity`, `unitPrice`).

Erros da aplicação: `EmptyOrderItemsError` (400), `InvalidQuantityError` (400), `UserNotFoundError` (404), `ProductNotFoundError` (404), `InsufficientStockError` (409) e `ForbiddenError` (403). O corpo de erro contém `error`, `message` e `statusCode`.

O processamento financeiro de `OrderCreated` é idempotente: cria `OrderPayment` com `OrderPaymentStatus.PENDING = 0` e altera o pedido para `OrderStatus.PAYMENT_PENDING = 1` em uma única transação. O `XACK` pertence ao consumidor e só pode ocorrer após o commit. Nas quatro abordagens, `financialConsumerApp.ts` compõe o consumidor financeiro e `server.ts` controla seu ciclo de vida separadamente de HTTP.

Sem outbox, uma falha entre o commit e a publicação pode deixar um pedido persistido sem evento; uma falha de publicação após o commit não desfaz o pedido.

## POST `/orders/:orderId/payment` — RF06

Requer `x-api-key`. `orderId` deve ser UUID válido. Requer o cabeçalho `Idempotency-Key` com um UUID válido, identificando esta tentativa de pagamento dentro do pedido; ausente ou inválido gera `InvalidIdempotencyKeyError` (400) antes de qualquer consulta. Body: `paymentToken` igual a `sim-approved` ou `sim-declined`. Valores ausentes, nulos ou diferentes são inválidos. O valor vem do total persistido no pedido; ignorar valor enviado pelo cliente.

O pedido permite até duas tentativas de pagamento. A rota bloqueia o pedido e exige pagamento existente.

- **Repetição de uma chave já registrada**: se `Idempotency-Key` já corresponde a uma tentativa persistida deste pedido, retorna o resultado original dessa tentativa (200 ou 422) sem simular de novo, sem alterar dados e sem publicar outro evento — mesmo depois de o pedido avançar de estado. A mesma chave com um `paymentToken` diferente do registrado retorna `PaymentAttemptConflictError` (409).
- **Nova chave para um novo processamento**: exige pagamento `PENDING = 0`, pedido `PAYMENT_PENDING = 1` e menos de duas tentativas já registradas para o pedido. Qualquer outra combinação — incluindo uma chave nova após o pagamento alcançar `PAID` ou `DECLINED`, mesmo que o `OrderConsumer` ainda não tenha processado o resultado — gera `InvalidOrderPaymentStateError` (409).

Para um novo processamento, persiste a tentativa (chave, token, resultado, `paymentDetails`, `paidAt`) e incrementa o contador de tentativas do pagamento:

- **Aprovação, em qualquer tentativa**: persiste o pagamento como `PAID = 1`, com `paymentDetails` (`provider: simulated`, `transactionId` UUID e `amount`) e `paidAt` preenchido; publica `PaymentApproved` no stream `payments`; responde `200`. É sempre definitiva.
- **Recusa na primeira tentativa**: responde `422` com o erro de recusa, mas **não** altera `order_payments.status` (permanece `PENDING`) nem publica evento. O pedido permanece `PAYMENT_PENDING` e o estoque permanece reservado, habilitando uma segunda tentativa com outra chave.
- **Recusa na segunda tentativa**: é definitiva. Persiste o pagamento como `DECLINED = 2` (com `paymentDetails` da última tentativa e `paidAt` nulo), publica `PaymentDeclinedError` no stream `payments` e responde `422`.

Em qualquer caso, a tentativa persistida conserva seu próprio resultado (token usado, aprovação/recusa, `paymentDetails`, `paidAt`), para que a repetição dessa mesma chave devolva exatamente esse resultado depois, independente do que uma tentativa posterior tenha decidido. `createdAt` do pagamento é sempre o da criação pelo RF05.

Após commit, uma tentativa definitiva (aprovação em qualquer tentativa, ou segunda recusa) publica `PaymentApproved` ou `PaymentDeclinedError` no stream `payments`, com envelope `event`, `eventId`, `timestamp` e `payload`. Payload contém `orderId`, `transactionId`, `amount` e, na aprovação, `paidAt`. Token não é publicado. Uma primeira recusa não publica evento.

Aprovação retorna 200 com `orderId`, `status`, `paymentDetails`, `paidAt` e `createdAt`; datas ISO-8601 UTC. Recusa (primeira ou segunda) retorna 422 com `error: PaymentDeclinedError`, `message: Payment declined for order: {orderId}` e `statusCode: 422`.

Solicitações simultâneas são serializadas pelo bloqueio do pedido: no máximo uma tentativa nova é persistida e, quando aplicável, um único evento definitivo é publicado por tentativa; uma segunda chave concorrente com a mesma tentativa ainda não registrada aguarda o bloqueio e, ao prosseguir, encontra o estado já avançado pela primeira (repetição, conflito, ou `InvalidOrderPaymentStateError` se as duas tentativas já tiverem sido usadas).

Erros: `InvalidOrderIdError` (400, `Invalid order id: {orderId}`), `InvalidIdempotencyKeyError` (400, `Invalid idempotency key`), `InvalidPaymentTokenError` (400, `Invalid payment token`), `OrderNotFoundError` (404, `Order not found: {orderId}`), `PaymentNotReadyError` (409, `Payment not ready for order: {orderId}`), `PaymentAttemptConflictError` (409, `Payment attempt conflict for order: {orderId}`), `InvalidOrderPaymentStateError` (409, `Invalid payment state for order: {orderId}`), `PaymentDeclinedError` (422) e `ForbiddenError` (403). Corpo de erro: `error`, `message` e `statusCode`.

## Consumo dos pagamentos — RF06

O `OrderConsumer` consome `PaymentApproved` e `PaymentDeclinedError` no stream `payments`, em group próprio. O primeiro altera pedido de `PAYMENT_PENDING = 1` para `PAID = 2`; o segundo para `CANCELED = 3`. Cada handler bloqueia o pedido em uma transação. Pedido já no destino é idempotente. Pedido inexistente gera `OrderNotFoundError`; status incompatível gera `InvalidOrderPaymentStateError`, sem sobrescrever o estado terminal. `XACK` somente após commit. O consumidor não altera o pagamento. Na aprovação, mantém o estoque já reduzido. Na recusa, agrega as quantidades dos itens persistidos e as devolve ao estoque na mesma transação que cancela o pedido, bloqueando os produtos em ordem crescente de ID. A devolução inclui produtos excluídos logicamente e não os reativa. Pedido já cancelado não devolve novamente. Produto inexistente gera `ProductNotFoundError`, rollback e retry.

Payload exige UUIDs válidos para `orderId` e `transactionId`, `amount` numérico finito não negativo e, na aprovação, `paidAt` ISO-8601 UTC válido. Payload inválido gera `InvalidPaymentApprovedPayloadError` ou `InvalidPaymentDeclinedPayloadError`, derivados de `InvalidPayloadError`, e segue Dead Letter. Demais erros seguem retry. Evento e exceção HTTP `PaymentDeclinedError` são representações distintas.

Sem outbox, uma falha entre commit e publicação pode manter o pedido pendente apesar do pagamento concluído. Repetições da rota não republicam o evento.

## GET `/orders/:orderId/status` — RF08

Requer `x-api-key`. Autenticar antes de validar o UUID de `orderId`. Não requer body nem query.

Retorna `200` com somente `orderId` (UUID persistido) e `status` numérico do pedido: `OrderStatus.PENDING = 0`, `PAYMENT_PENDING = 1`, `PAID = 2` ou `CANCELED = 3`. Todos os estados são consultáveis, mesmo antes da criação do pagamento. Exemplo:

```json
{
  "orderId": "0f5ead3a-8c1e-4b2a-9d4c-1a2b3c4d5e6f",
  "status": 2
}
```

A consulta lê o status persistido em `orders`, sem deduzir o resultado pelo pagamento. As transições dos consumers são assíncronas: um pedido pode permanecer `PENDING` até a preparação financeira ou `PAYMENT_PENDING` até o consumo do resultado do pagamento. Pedido cancelado retorna `200`. Não altera dados, adquire bloqueio de escrita nem publica eventos.

Erros: `ForbiddenError` (403, `Forbidden`), `InvalidOrderIdError` (400, `Invalid order id: {orderId}`) e `OrderNotFoundError` (404, `Order not found: {orderId}`). Corpo de erro: `error`, `message` e `statusCode`. A validação do UUID segue o RF06 e ocorre antes da consulta ao banco.
