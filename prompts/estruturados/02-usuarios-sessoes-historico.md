# Experimento 2 · Cadastro, sessões e histórico de compras

## Objetivo

Implementar cadastro, autenticação com JWT, gerenciamento de sessões e acesso aos pedidos da própria conta.

## Critérios de aceitação

- `POST /users` recebe `email` e `password`. Normalize o e-mail removendo espaços nas extremidades e convertendo para minúsculas. Valide o formato e exija pelo menos oito caracteres na senha. Armazene a senha como hash. Retorne `201` com `userId` e `email`, `400` para dados inválidos e `409` para e-mail duplicado.
- `POST /sessions` recebe e-mail e senha. Retorne `201` com `accessToken` e `expiresIn` em segundos. O JWT assinado identifica conta e sessão e expira em uma hora. Use o mesmo `401` para e-mail desconhecido e senha incorreta.
- `DELETE /sessions/current` revoga a sessão do JWT enviado em `Authorization: Bearer` e retorna `204`. Outras sessões da conta continuam válidas.
- `POST /orders` recebe `items` e associa o pedido à conta autenticada, inclusive quando o corpo contém outro `userId`. Preserve a resposta de sucesso existente.
- `GET /orders` retorna `200` e uma lista dos pedidos da conta em todos os estados, com `orderId`, `status`, `total` e `createdAt`. Ordene do mais recente ao mais antigo e desempate por `orderId` crescente. Para uma conta sem pedidos, retorne `[]`.
- Exija JWT para criar, listar, consultar o status e pagar pedidos, bem como para encerrar a sessão. Retorne `401` se estiver ausente, inválido, expirado ou revogado. Na consulta de status e no pagamento, trate um pedido de outra conta como inexistente e retorne o mesmo `404`. Uma tentativa de pagamento sem autorização deve preservar o pedido e o pagamento.
- Aplique a chave de API às rotas novas, preserve sua validação nas existentes e valide-a antes do JWT.

## Restrições

Preserve as associações dos pedidos existentes e as regras de estoque, pagamento e eventos. Mantenha o segredo de assinatura na configuração do ambiente. Siga as regras arquiteturais do projeto.

## Entrega

Implemente a funcionalidade. Descreva as rotas e o ciclo de vida da sessão. Informe as verificações realizadas e demonstre o isolamento do histórico, do status e do pagamento com duas contas.
