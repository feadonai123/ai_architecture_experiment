# Experimento 5 · Outbox transacional

Use uma outbox PostgreSQL para persistir `OrderCreated` na mesma transação do pedido, itens e baixa de estoque. Preserve o `201` após o commit, mesmo com Redis indisponível. Publique no stream existente fora da requisição, retome pendências após falha ou reinício e reutilize o `eventId` em republicações. Preserve os contratos e o efeito financeiro em entregas repetidas. Informe as verificações de rollback, recuperação e reentrega.
