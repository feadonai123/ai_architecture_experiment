# Experimento 3 · Segunda chance após recusa de pagamento

Permita até duas tentativas em `POST /orders/:orderId/payment`. A primeira recusa retorna `422`, mantém o pedido aberto e o estoque reservado, sem emitir o evento de cancelamento. A segunda tentativa pode aprovar o pedido com o fluxo atual ou retornar `422` e disparar o cancelamento com devolução única do estoque.

Exija `Idempotency-Key` com UUID válido por tentativa e pedido. Chave ausente ou inválida retorna `400 InvalidIdempotencyKeyError`. Mesma chave e token devolvem o resultado registrado sem novos efeitos, mesmo após o resultado definitivo. Mesma chave com outro token válido retorna `409 PaymentAttemptConflictError`. Nova chave após aprovação ou segunda recusa retorna `409 InvalidOrderPaymentStateError`, mesmo antes de o consumidor atualizar o pedido.

Persista os resultados e preserve o limite sob concorrência. Erros de validação e falhas antes da persistência não consomem tentativas. Preserve pagamentos e pedidos definitivos já existentes, a autenticação, o valor cobrado e os contratos de aprovação e recusa. Siga as regras arquiteturais do projeto. Informe como verificou as duas saídas após a primeira recusa, a repetição, o conflito de chave, a concorrência e a devolução única de estoque.
