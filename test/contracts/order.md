# Pedidos e pagamentos — RF05, RF06 e RF08

## POST `/orders`

Requer `x-api-key`. Corpo: `userId` e lista não vazia de `items`, cada item com `productId` e `quantity` inteira positiva.

O servidor valida usuário, produtos ativos e estoque agregado por produto; consulta e bloqueia os produtos na transação em ordem crescente de ID; reduz o estoque disponível e grava pedido e itens atomicamente, com `OrderStatus.PENDING = 0`, preço unitário atual e total calculado no servidor. Depois do commit, publica `OrderCreated` no stream `orders` com os campos `event`, `eventId`, `timestamp` e `payload`. A resposta de sucesso é `201` e contém `id`, `userId`, `status`, `total`, `createdAt` e `items` (`productId`, `quantity`, `unitPrice`).

Erros da aplicação: `EmptyOrderItemsError` (400), `InvalidQuantityError` (400), `UserNotFoundError` (404), `ProductNotFoundError` (404), `InsufficientStockError` (409) e `ForbiddenError` (403). O corpo de erro contém `error`, `message` e `statusCode`.

O processamento financeiro de `OrderCreated` é idempotente: cria `OrderPayment` com `OrderPaymentStatus.PENDING = 0` e altera o pedido para `OrderStatus.PAYMENT_PENDING = 1` em uma única transação. O `XACK` pertence ao consumidor e só pode ocorrer após o commit. Nas quatro abordagens, `financialConsumerApp.ts` compõe o consumidor financeiro e `server.ts` controla seu ciclo de vida separadamente de HTTP.

Sem outbox, uma falha entre o commit e a publicação pode deixar um pedido persistido sem evento; uma falha de publicação após o commit não desfaz o pedido.

## POST `/orders/:orderId/payment` — RF06

Requer `x-api-key` e o cabeçalho `Idempotency-Key` com um UUID válido, identificando uma tentativa de pagamento dentro do pedido. `orderId` deve ser UUID válido. Body: `paymentToken` igual a `sim-approved` ou `sim-declined`. Valores ausentes, nulos ou diferentes são inválidos. O valor vem do total persistido no pedido; ignorar valor enviado pelo cliente.

Cada pedido admite até duas tentativas de pagamento. A rota bloqueia o pedido e exige pagamento existente (`PENDING = 0` em `order_payments`), além do pedido em `PAYMENT_PENDING = 1`.

- `Idempotency-Key` ausente ou inválido: `InvalidIdempotencyKeyError` (400), antes de qualquer consulta.
- Chave já registrada para esse pedido: reenviar o mesmo token válido devolve o resultado original daquela tentativa, mesmo que o pedido já tenha avançado de estado; não simula de novo, não grava outro resultado e não publica outro evento. A mesma chave com outro token válido retorna `PaymentAttemptConflictError` (409).
- Chave nova: exige que ainda não existam duas tentativas registradas, pagamento `PENDING` e pedido `PAYMENT_PENDING`; qualquer outra combinação retorna `InvalidOrderPaymentStateError` (409), inclusive quando o pagamento já tem resultado definitivo mas o pedido ainda não foi atualizado pelo consumidor.

Primeira tentativa aprovada: persiste o pagamento como `PAID = 1` em `order_payments`, com `paymentDetails` (`provider: simulated`, `transactionId` UUID, `amount`) e `paidAt`; publica `PaymentApproved` após commit. Primeira tentativa recusada: grava a tentativa (status `DECLINED`, `paidAt` nulo) **sem** alterar `order_payments` (que continua `PENDING`) e **sem** publicar evento; o pedido permanece `PAYMENT_PENDING` com o estoque reservado, apto a uma segunda tentativa. Segunda tentativa aprovada: mesmo efeito da aprovação acima. Segunda tentativa recusada: persiste `order_payments` como `DECLINED = 2` e publica `PaymentDeclinedError`, recusa definitiva.

Cada tentativa (chave, pedido, número da tentativa, token, resultado, `paymentDetails`, `paidAt`) é persistida de forma durável antes da resposta correspondente.

Após commit, publica `PaymentApproved` ou `PaymentDeclinedError` no stream `payments`, com envelope `event`, `eventId`, `timestamp` e `payload`. Payload contém `orderId`, `transactionId`, `amount` e, na aprovação, `paidAt`. Token e chave de idempotência não são publicados.

Aprovação retorna 200 com `orderId`, `status`, `paymentDetails`, `paidAt` e `createdAt`; datas ISO-8601 UTC. Recusa (primeira ou segunda tentativa) retorna 422 com `error: PaymentDeclinedError`, `message: Payment declined for order: {orderId}` e `statusCode: 422`.

Uma nova chave após aprovação ou segunda recusa retorna `InvalidOrderPaymentStateError` (409), inclusive enquanto o consumidor ainda processa o resultado definitivo de forma assíncrona. Solicitações concorrentes são serializadas pelo bloqueio do pedido e respeitam o limite de duas tentativas; a mesma chave enviada simultaneamente produz um único resultado persistido.

Erros: `InvalidOrderIdError` (400, `Invalid order id: {orderId}`), `InvalidPaymentTokenError` (400, `Invalid payment token`), `InvalidIdempotencyKeyError` (400, `Invalid idempotency key`), `OrderNotFoundError` (404, `Order not found: {orderId}`), `PaymentNotReadyError` (409, `Payment not ready for order: {orderId}`), `InvalidOrderPaymentStateError` (409, `Invalid payment state for order: {orderId}`), `PaymentAttemptConflictError` (409, `Payment attempt conflict for order: {orderId}`), `PaymentDeclinedError` (422) e `ForbiddenError` (403). Corpo de erro: `error`, `message` e `statusCode`.

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
