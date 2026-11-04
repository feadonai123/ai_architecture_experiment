# Pedidos e pagamentos — RF05, RF06 e RF08

## POST `/orders`

Requer `x-api-key`. Corpo: `userId` e lista não vazia de `items`, cada item com `productId` e `quantity` inteira positiva.

O servidor valida usuário, produtos ativos e estoque agregado por produto; consulta e bloqueia os produtos na transação em ordem crescente de ID; reduz o estoque disponível e grava pedido e itens atomicamente, com `OrderStatus.PENDING = 0`, preço unitário atual e total calculado no servidor. Depois do commit, publica `OrderCreated` no stream `orders` com os campos `event`, `eventId`, `timestamp` e `payload`. A resposta de sucesso é `201` e contém `id`, `userId`, `status`, `total`, `createdAt` e `items` (`productId`, `quantity`, `unitPrice`).

Erros da aplicação: `EmptyOrderItemsError` (400), `InvalidQuantityError` (400), `UserNotFoundError` (404), `ProductNotFoundError` (404), `InsufficientStockError` (409) e `ForbiddenError` (403). O corpo de erro contém `error`, `message` e `statusCode`.

O processamento financeiro de `OrderCreated` é idempotente: cria `OrderPayment` com `OrderPaymentStatus.PENDING = 0` e altera o pedido para `OrderStatus.PAYMENT_PENDING = 1` em uma única transação. O `XACK` pertence ao consumidor e só pode ocorrer após o commit. Nas quatro abordagens, `financialConsumerApp.ts` compõe o consumidor financeiro e `server.ts` controla seu ciclo de vida separadamente de HTTP.

Sem outbox, uma falha entre o commit e a publicação pode deixar um pedido persistido sem evento; uma falha de publicação após o commit não desfaz o pedido.

## POST `/orders/:orderId/payment` — RF06

Requer `x-api-key`. `orderId` deve ser UUID válido. Requer o header `Idempotency-Key` com um UUID; ausente ou inválido é erro. Body: `paymentToken` igual a `sim-approved` ou `sim-declined`. Valores ausentes, nulos ou diferentes são inválidos. O valor vem do total persistido no pedido; ignorar valor enviado pelo cliente.

### Política de segunda chance

Cada pedido admite até **duas tentativas** de pagamento. A rota bloqueia o pedido e exige pagamento existente (`PENDING = 0`, criado pelo processamento financeiro de `OrderCreated`).

Cada tentativa é identificada pela sua `Idempotency-Key`, única por pedido:

- Repetir a mesma `Idempotency-Key` com o mesmo `paymentToken` retorna o resultado já persistido daquela tentativa, sem nova simulação, alteração de dados ou publicação.
- Repetir a mesma `Idempotency-Key` com um `paymentToken` diferente é um conflito: `IdempotencyKeyConflictError` (409), sem alterar dados.
- Uma `Idempotency-Key` nova consome uma tentativa nova, numerada sequencialmente (1ª, depois 2ª) por pedido.

A 1ª recusa (`sim-declined`) não é definitiva: persiste a tentativa com o pagamento ainda em `DECLINED = 2`, mas **não altera o pedido, nem publica evento**, e retorna 422 — o pedido permanece `PAYMENT_PENDING = 1`, pronto para uma nova tentativa com outra `Idempotency-Key` (a "segunda chance"). Uma aprovação (`sim-approved`), em qualquer tentativa, é sempre definitiva. A 2ª tentativa também é sempre definitiva, aprovada ou recusada.

Uma tentativa definitiva persiste o pagamento como `PAID = 1` ou `DECLINED = 2`, registra `paymentDetails` com `provider: simulated`, `transactionId` UUID e `amount`. Preenche `paidAt` somente na aprovação e conserva `createdAt`. Após commit, publica `PaymentApproved` ou `PaymentDeclinedError` no stream `payments`, com envelope `event`, `eventId`, `timestamp` e `payload`. Payload contém `orderId`, `transactionId`, `amount` e, na aprovação, `paidAt`. Token não é publicado. O pedido permanece pendente até o consumo do evento.

Uma `Idempotency-Key` nova enviada depois que as duas tentativas já se esgotaram (a 2ª já é definitiva) não cria uma 3ª tentativa: retorna o resultado definitivo já persistido, como qualquer outra repetição após o pagamento se tornar `PAID` ou `DECLINED`.

Aprovação definitiva retorna 200 com `orderId`, `status`, `paymentDetails`, `paidAt` e `createdAt`; datas ISO-8601 UTC. Recusa (1ª tentativa retryable ou 2ª definitiva) retorna 422 com `error: PaymentDeclinedError`, `message: Payment declined for order: {orderId}` e `statusCode: 422`. Aprovação aceita pedido ainda pendente ou pago; recusa definitiva aceita pedido ainda pendente ou cancelado. Outras combinações são incompatíveis. Solicitações simultâneas são serializadas pelo bloqueio do pedido; com a mesma `Idempotency-Key`, a segunda apenas repete o resultado da primeira; com chaves distintas, cada uma consome sua própria tentativa.

Erros: `InvalidOrderIdError` (400, `Invalid order id: {orderId}`), `InvalidPaymentTokenError` (400, `Invalid payment token`), `InvalidIdempotencyKeyError` (400, `Invalid idempotency key`), `OrderNotFoundError` (404, `Order not found: {orderId}`), `PaymentNotReadyError` (409, `Payment not ready for order: {orderId}`), `InvalidOrderPaymentStateError` (409, `Invalid payment state for order: {orderId}`), `IdempotencyKeyConflictError` (409, `Idempotency key already used with a different request: {idempotencyKey}`), `PaymentDeclinedError` (422) e `ForbiddenError` (403). Corpo de erro: `error`, `message` e `statusCode`.

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
