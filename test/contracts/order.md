# Pedidos — RF05

## POST `/orders`

Requer `x-api-key`. Corpo: `userId` e lista não vazia de `items`, cada item com `productId` e `quantity` inteira positiva.

O servidor valida usuário, produtos e estoque agregado por produto; grava pedido e itens atomicamente, com `OrderStatus.PENDING = 0`, preço unitário atual e total calculado no servidor. Depois do commit, publica `OrderCreated` no stream `orders` com os campos `event`, `eventId`, `timestamp` e `payload`. A resposta de sucesso é `201` e contém `id`, `userId`, `status`, `total`, `createdAt` e `items` (`productId`, `quantity`, `unitPrice`).

Erros da aplicação: `EmptyOrderItemsError` (400), `InvalidQuantityError` (400), `UserNotFoundError` (404), `ProductNotFoundError` (404), `InsufficientStockError` (409) e `ForbiddenError` (403). O corpo de erro contém `error`, `message` e `statusCode`.

O processamento financeiro de `OrderCreated` é idempotente: cria `OrderPayment` com `OrderPaymentStatus.PENDING = 0` e altera o pedido para `OrderStatus.PAYMENT_PENDING = 1` em uma única transação. O `XACK` pertence ao consumidor e só pode ocorrer após o commit. O consumidor genérico e o handler transacional existem no Clean; a composição e inicialização do consumidor financeiro ficam para uma etapa posterior.

Sem outbox, uma falha entre o commit e a publicação pode deixar um pedido persistido sem evento; uma falha de publicação após o commit não desfaz o pedido.
