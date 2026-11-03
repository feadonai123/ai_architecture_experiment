# Experimento 5 · Outbox transacional

## Objetivo

Refatorar a publicação de `OrderCreated` para recuperar a entrega após indisponibilidade do Redis.

## Critérios de aceitação

Persista pedido, itens, baixa de estoque e registro da outbox na mesma transação PostgreSQL. Um rollback deve desfazer tudo. Após o commit, retorne `201` com o corpo atual mesmo com Redis indisponível. Publique os registros pendentes no stream existente fora da requisição HTTP e retome o processamento após falha ou reinício. Marque a publicação somente após confirmação do Redis. Preserve o envelope e reutilize o `eventId` nas republicações. Uma entrega repetida deve manter um único pagamento e o estado financeiro correto.

## Restrições

Limite a refatoração a `OrderCreated`. Preserve os contratos HTTP e de eventos e siga as regras arquiteturais do projeto.

## Entrega

Implemente a refatoração, descreva o fluxo de publicação e informe as verificações de rollback, recuperação do Redis e entrega repetida.
