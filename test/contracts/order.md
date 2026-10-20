# Pedidos e pagamentos — RF05 e RF06

## POST `/orders`

Requer `x-api-key`. Corpo: `userId` e lista não vazia de `items`, cada item com `productId` e `quantity` inteira positiva.

O servidor valida usuário, produtos e estoque agregado por produto; grava pedido e itens atomicamente, com `OrderStatus.PENDING = 0`, preço unitário atual e total calculado no servidor. Depois do commit, publica `OrderCreated` no stream `orders` com os campos `event`, `eventId`, `timestamp` e `payload`. A resposta de sucesso é `201` e contém `id`, `userId`, `status`, `total`, `createdAt` e `items` (`productId`, `quantity`, `unitPrice`).

Erros da aplicação: `EmptyOrderItemsError` (400), `InvalidQuantityError` (400), `UserNotFoundError` (404), `ProductNotFoundError` (404), `InsufficientStockError` (409) e `ForbiddenError` (403). O corpo de erro contém `error`, `message` e `statusCode`.

O processamento financeiro de `OrderCreated` é idempotente: cria `OrderPayment` com `OrderPaymentStatus.PENDING = 0` e altera o pedido para `OrderStatus.PAYMENT_PENDING = 1` em uma única transação. O `XACK` pertence ao consumidor e só pode ocorrer após o commit. Nas quatro abordagens, `financialConsumerApp.ts` compõe o consumidor financeiro e `server.ts` controla seu ciclo de vida separadamente de HTTP.

Sem outbox, uma falha entre o commit e a publicação pode deixar um pedido persistido sem evento; uma falha de publicação após o commit não desfaz o pedido.

## POST `/orders/:orderId/payment` — RF06

Requer `x-api-key`. `orderId` deve ser UUID válido. Body: `paymentToken` igual a `sim-approved` ou `sim-declined`. Valores ausentes, nulos ou diferentes são inválidos. O valor vem do total persistido no pedido; ignorar valor enviado pelo cliente.

A rota bloqueia o pedido e exige pagamento existente. Um novo processamento requer pedido `PAYMENT_PENDING = 1` e pagamento `PENDING = 0`. Persiste pagamento como `PAID = 1` ou `DECLINED = 2`, registra `paymentDetails` com `provider: simulated`, `transactionId` UUID e `amount`. Preenche `paidAt` somente na aprovação e conserva `createdAt`. O pedido permanece pendente até o consumo do evento.

Após commit, publica `PaymentApproved` ou `PaymentDeclinedError` no stream `payments`, com envelope `event`, `eventId`, `timestamp` e `payload`. Payload contém `orderId`, `transactionId`, `amount` e, na aprovação, `paidAt`. Token não é publicado. A recusa é definitiva para o pedido e persistida antes da resposta 422.

Aprovação retorna 200 com `orderId`, `status`, `paymentDetails`, `paidAt` e `createdAt`; datas ISO-8601 UTC. Recusa retorna 422 com `error: PaymentDeclinedError`, `message: Payment declined for order: {orderId}` e `statusCode: 422`.

Repetições com qualquer token válido retornam o resultado existente, sem nova simulação, alteração de dados ou publicação. Aprovação aceita pedido ainda pendente ou pago; recusa aceita pedido ainda pendente ou cancelado. Outras combinações são incompatíveis. Solicitações simultâneas são serializadas pelo bloqueio do pedido.

Erros: `InvalidOrderIdError` (400, `Invalid order id: {orderId}`), `InvalidPaymentTokenError` (400, `Invalid payment token`), `OrderNotFoundError` (404, `Order not found: {orderId}`), `PaymentNotReadyError` (409, `Payment not ready for order: {orderId}`), `InvalidOrderPaymentStateError` (409, `Invalid payment state for order: {orderId}`), `PaymentDeclinedError` (422) e `ForbiddenError` (403). Corpo de erro: `error`, `message` e `statusCode`.

## Consumo dos pagamentos — RF06

O `OrderConsumer` consome `PaymentApproved` e `PaymentDeclinedError` no stream `payments`, em group próprio. O primeiro altera pedido de `PAYMENT_PENDING = 1` para `PAID = 2`; o segundo para `CANCELED = 3`. Cada handler bloqueia o pedido em uma transação. Pedido já no destino é idempotente. Pedido inexistente gera `OrderNotFoundError`; status incompatível gera `InvalidOrderPaymentStateError`, sem sobrescrever o estado terminal. `XACK` somente após commit. O consumidor não altera o pagamento.

Payload exige UUIDs válidos para `orderId` e `transactionId`, `amount` numérico finito não negativo e, na aprovação, `paidAt` ISO-8601 UTC válido. Payload inválido gera `InvalidPaymentApprovedPayloadError` ou `InvalidPaymentDeclinedPayloadError`, derivados de `InvalidPayloadError`, e segue Dead Letter. Demais erros seguem retry. Evento e exceção HTTP `PaymentDeclinedError` são representações distintas.

Sem outbox, uma falha entre commit e publicação pode manter o pedido pendente apesar do pagamento concluído. Repetições da rota não republicam o evento.
