# Contrato HTTP: Carrinho

Documento canônico da fatia vertical de carrinho. Todas as quatro implementações devem respeitar exatamente estes endpoints, payloads, status e erros.

## Representação do carrinho

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "createdAt": "2026-01-15T12:00:00.000Z",
  "items": [
    {
      "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "productId": "0f5ead3a-8c1e-4b2a-9d4c-1a2b3c4d5e6f",
      "quantity": 2
    }
  ]
}
```

`createdAt` é ISO-8601 em UTC. `items` é sempre um array (vazio quando o carrinho não tem itens).

## Representação de erro

```json
{
  "error": "ProductNotFoundError",
  "message": "Product not found: 0f5ead3a-8c1e-4b2a-9d4c-1a2b3c4d5e6f",
  "statusCode": 404
}
```

`error` é o nome semântico da classe de erro. Nenhuma implementação deve responder apenas `{ "message": "..." }`.

---

## Autenticação

Todas as rotas da API de carrinho exigem o header `x-api-key` com o mesmo valor da variável de ambiente `X_API_KEY`. `/docs` (Swagger UI) não exige autenticação.

| Condição                         | Erro              | HTTP |
| -------------------------------- | ----------------- | ---: |
| header ausente ou valor diferente | `ForbiddenError` |  403 |

---

## POST /cart

Cria um carrinho vazio.

### Sucesso

- Request body: vazio ou ignorado
- Status: `201`
- Response: carrinho com `items: []`

---

## GET /cart/:cartId

Retorna o carrinho e seus itens.

### Sucesso

- Status: `200`
- Response: representação do carrinho

### Erros

| Condição            | Erro                | HTTP |
| ------------------- | ------------------- | ---: |
| carrinho inexistente | `CartNotFoundError` |  404 |

---

## POST /cart/items

Adiciona um produto ao carrinho. Se o item já existir, incrementa a quantidade.

### Request body

```json
{
  "cartId": "uuid",
  "productId": "uuid",
  "quantity": 2
}
```

### Sucesso

- Status: `201`
- Response: carrinho atualizado contendo o item com a quantidade correta
- Estoque do produto **não** é decrementado
- Item existente: `novaQuantidade = quantidadeAtual + quantity`
- Item novo: cria `cart_items` com `quantity`

### Erros

| Condição                                                    | Erro                      | HTTP |
| ----------------------------------------------------------- | ------------------------- | ---: |
| `quantity` ausente, não inteiro ou `<= 0`                   | `InvalidQuantityError`    |  400 |
| produto inexistente                                         | `ProductNotFoundError`    |  404 |
| carrinho inexistente                                        | `CartNotFoundError`       |  404 |
| `quantidadeAtual + quantity > product.stock`                | `InsufficientStockError`  |  409 |

A validação de quantidade ocorre antes das consultas. Estoque insuficiente considera a quantidade já presente no item.

---

## DELETE /cart/items/:productId

Remove o item do produto informado no carrinho.

### Query

- `cartId` (uuid, obrigatório)

Exemplo: `DELETE /cart/items/0f5ead3a-8c1e-4b2a-9d4c-1a2b3c4d5e6f?cartId=3fa85f64-5717-4562-b3fc-2c963f66afa6`

### Sucesso

- Status: `200`
- Response: carrinho atualizado sem o item

### Erros

| Condição           | Erro                   | HTTP |
| ------------------ | ---------------------- | ---: |
| carrinho inexistente | `CartNotFoundError`    |  404 |
| item inexistente     | `CartItemNotFoundError` |  404 |

---

## Matriz de erros

| Operação                 | Condição                 | Erro                     | HTTP |
| ------------------------ | ------------------------ | ------------------------ | ---: |
| qualquer rota da API     | header x-api-key inválido | ForbiddenError          |  403 |
| GET /cart/:cartId        | carrinho inexistente     | CartNotFoundError        |  404 |
| POST /cart/items         | quantidade inválida      | InvalidQuantityError     |  400 |
| POST /cart/items         | produto inexistente      | ProductNotFoundError     |  404 |
| POST /cart/items         | carrinho inexistente     | CartNotFoundError        |  404 |
| POST /cart/items         | estoque insuficiente     | InsufficientStockError   |  409 |
| DELETE /cart/items/:id   | carrinho inexistente     | CartNotFoundError        |  404 |
| DELETE /cart/items/:id   | item inexistente         | CartItemNotFoundError    |  404 |
