# Contrato HTTP: Produtos

Documento canônico da API de catálogo. Todas as quatro implementações devem respeitar exatamente estes endpoints, payloads, status e erros.

## Representação de produto

```json
{
  "id": "0f5ead3a-8c1e-4b2a-9d4c-1a2b3c4d5e6f",
  "name": "Produto",
  "description": "Chá verde",
  "price": 100,
  "stock": 0
}
```

`deletedAt` não aparece no payload. Produto recém-criado tem `stock` igual a `0`.

## Representação de erro

```json
{
  "error": "ProductNotFoundError",
  "message": "Product not found: 0f5ead3a-8c1e-4b2a-9d4c-1a2b3c4d5e6f",
  "statusCode": 404
}
```

`error` é o nome semântico da classe de erro.

---

## Autenticação

Todas as rotas da API de produtos exigem o header `x-api-key` com o mesmo valor da variável de ambiente `X_API_KEY`.

| Condição                          | Erro             | HTTP |
| --------------------------------- | ---------------- | ---: |
| header ausente ou valor diferente | `ForbiddenError` |  403 |

---

## GET /products

Lista produtos não deletados, ordenados por `id`. Query opcional:

- `name` — contém, case-insensitive
- `minPrice` / `maxPrice` — número ≥ 0; `minPrice > maxPrice` é inválido
- `available` — `true` (`stock > 0`) ou `false` (`stock = 0`)

### Sucesso

- Status: `200`
- Response: array; vazio quando não houver produtos

### Erros

| Condição                                      | Erro                 | HTTP |
| --------------------------------------------- | -------------------- | ---: |
| `minPrice`/`maxPrice` inválido ou min > max   | `InvalidPriceError`  |  400 |
| `available` presente e diferente de true/false | `InvalidFilterError` |  400 |

---

## GET /products/:productId

### Sucesso

- Status: `200`

### Erros

| Condição                         | Erro                   | HTTP |
| -------------------------------- | ---------------------- | ---: |
| inexistente ou soft-deletado     | `ProductNotFoundError` |  404 |

---

## POST /products

Cria um produto. `stock` inicia em `0`. Body:

```json
{
  "name": "Produto",
  "description": "Opcional",
  "price": 10
}
```

`description` omitido vira `""`. Estoque não é aceito neste body.

### Sucesso

- Status: `201`

### Erros

| Condição                         | Erro               | HTTP |
| -------------------------------- | ------------------ | ---: |
| `name` ausente ou vazio          | `InvalidNameError` |  400 |
| `price` ausente, não número ou < 0 | `InvalidPriceError` |  400 |

---

## PUT /products/:productId

Atualiza `name`, `description` e `price`. Não altera `stock`.

### Sucesso

- Status: `200`

### Erros

| Condição                         | Erro                   | HTTP |
| -------------------------------- | ---------------------- | ---: |
| `name` inválido                  | `InvalidNameError`     |  400 |
| `price` inválido                 | `InvalidPriceError`    |  400 |
| produto inexistente ou deletado  | `ProductNotFoundError` |  404 |

---

## DELETE /products/:productId

Soft delete (`deleted_at`). Não remove `cart_items`.

### Sucesso

- Status: `200`
- Response: representação do produto no momento da exclusão

### Erros

| Condição                         | Erro                   | HTTP |
| -------------------------------- | ---------------------- | ---: |
| inexistente ou já deletado       | `ProductNotFoundError` |  404 |

---

## Matriz de erros

| Operação                 | Condição                | Erro                   | HTTP |
| ------------------------ | ----------------------- | ---------------------- | ---: |
| qualquer rota da API     | header x-api-key inválido | ForbiddenError       |  403 |
| GET /products            | preço/filtro inválido   | InvalidPriceError / InvalidFilterError | 400 |
| GET /products/:id        | inexistente ou deletado | ProductNotFoundError   |  404 |
| POST /products           | name inválido           | InvalidNameError       |  400 |
| POST /products           | price inválido          | InvalidPriceError      |  400 |
| PUT /products/:id        | name inválido           | InvalidNameError       |  400 |
| PUT /products/:id        | price inválido          | InvalidPriceError      |  400 |
| PUT /products/:id        | inexistente ou deletado | ProductNotFoundError   |  404 |
| DELETE /products/:id     | inexistente ou deletado | ProductNotFoundError   |  404 |
