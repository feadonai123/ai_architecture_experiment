# Experimento 3 · Segunda chance após recusa de pagamento

## Objetivo

Permita até duas tentativas de pagamento por pedido. A primeira recusa mantém o pedido aberto e o estoque reservado. A segunda tentativa pode aprovar o pagamento ou, se também for recusada, encerrar o pedido e liberar o estoque.

## Critérios de aceitação

- Em `POST /orders/:orderId/payment`, exija o cabeçalho `Idempotency-Key` com um UUID válido. Retorne `400` com `InvalidIdempotencyKeyError` quando estiver ausente ou inválido. A chave identifica uma tentativa dentro do pedido. Reenviar a mesma chave e o mesmo token válido devolve o resultado original, mesmo após o pedido avançar de estado. A mesma chave com outro token válido retorna `409` com `PaymentAttemptConflictError`. Use o formato de erro existente.
- Após a primeira recusa, retorne o `422` existente e mantenha o pedido apto a receber outra tentativa. Preserve o estoque reservado. A recusa inicial não deve publicar o evento que provoca cancelamento e devolução de estoque.
- Uma nova chave após a primeira recusa inicia a segunda tentativa. Se aprovada, mantenha a resposta de aprovação e o fluxo atual que conclui o pedido sem devolver estoque. Se recusada, retorne o `422` existente e publique o evento de recusa definitiva. O consumidor deve cancelar o pedido e devolver o estoque uma única vez, inclusive se o evento for reentregue.
- Uma nova chave após aprovação ou segunda recusa retorna `409` com `InvalidOrderPaymentStateError`, inclusive enquanto o consumidor ainda processa o resultado definitivo. A repetição de uma tentativa registrada continua devolvendo seu resultado original.
- Persista o resultado de cada tentativa. Repetições não podem simular novamente, consumir outra tentativa nem publicar outro evento. Solicitações concorrentes devem respeitar essas garantias e o limite de duas tentativas. Erros de validação ou falhas antes da persistência do resultado não consomem uma tentativa.
- Pedidos e pagamentos já persistidos em estado definitivo devem continuar definitivos após a mudança.

## Restrições

Preserve a chave de API, os tokens simulados existentes, o valor cobrado com base no total persistido e o formato das respostas de aprovação e recusa. Preserve o envelope dos eventos definitivos e siga as regras arquiteturais do projeto.

## Entrega

Implemente a política e informe as verificações executadas. Demonstre recusa seguida de aprovação, duas recusas seguidas, repetição da primeira chave após a segunda tentativa, conflito de chave e requisições concorrentes. Verifique o estado do pedido e o estoque após a primeira recusa, após o resultado definitivo e após a reentrega do evento de cancelamento.
