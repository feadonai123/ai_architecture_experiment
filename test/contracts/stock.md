# Contrato HTTP: Estoque

Documento canônico da API de estoque. Todas as quatro implementações devem respeitar exatamente estes endpoints, payloads, status e erros.

## Representação de produto e estoque

```json
{
  "id": "0f5ead3a-8c1e-4b2a-9d4c-1a2b3c4d5e6f",
  "name": "Produto",
  "slug": "produto",
  "description": "",
  "price": 100,
  "stock": 25
}
```

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

Todas as rotas da API de estoque exigem o header `x-api-key` com o mesmo valor da variável de ambiente `X_API_KEY`.

| Condição                          | Erro             | HTTP |
| --------------------------------- | ---------------- | ---: |
| header ausente ou valor diferente | `ForbiddenError` |  403 |

---

## GET /stocks

Lista todos os produtos com suas quantidades atuais em estoque.

### Sucesso

- Status: `200`
- Response: array de produtos ordenado por `id`; vazio quando não houver produtos

---

## GET /stocks/:productId

Consulta a quantidade em estoque de um produto.

### Sucesso

- Status: `200`
- Response: representação de produto e estoque

### Erros

| Condição            | Erro                   | HTTP |
| ------------------- | ---------------------- | ---: |
| produto inexistente ou deletado | `ProductNotFoundError` |  404 |

---

## PUT /stocks/:productId

Define a quantidade absoluta em estoque; não incrementa a quantidade atual.

### Request body

```json
{
  "quantity": 25
}
```

### Sucesso

- Status: `200`
- `quantity` aceita zero ou um inteiro positivo
- Response: representação do produto com o estoque atualizado

### Erros

| Condição                                           | Erro                   | HTTP |
| -------------------------------------------------- | ---------------------- | ---: |
| `quantity` ausente, não inteiro ou menor que zero | `InvalidQuantityError` |  400 |
| produto inexistente ou deletado                                | `ProductNotFoundError` |  404 |

---

## PATCH /stocks/:productId/increase

Adiciona `quantity` unidades ao estoque atual.

### Request body

```json
{
  "quantity": 5
}
```

### Sucesso

- Status: `200`
- `quantity` deve ser um inteiro maior que zero
- Response: representação do produto com o estoque incrementado

### Erros

| Condição                                        | Erro                   | HTTP |
| ----------------------------------------------- | ---------------------- | ---: |
| `quantity` ausente, não inteiro ou menor que um | `InvalidQuantityError` |  400 |
| produto inexistente ou deletado                             | `ProductNotFoundError` |  404 |

---

## PATCH /stocks/:productId/decrease

Remove `quantity` unidades do estoque atual sem permitir estoque negativo.

### Request body

```json
{
  "quantity": 5
}
```

### Sucesso

- Status: `200`
- `quantity` deve ser um inteiro maior que zero
- Response: representação do produto com o estoque reduzido

### Erros

| Condição                                        | Erro                     | HTTP |
| ----------------------------------------------- | ------------------------ | ---: |
| `quantity` ausente, não inteiro ou menor que um | `InvalidQuantityError`   |  400 |
| produto inexistente ou deletado                             | `ProductNotFoundError`   |  404 |
| `quantity` maior que o estoque atual            | `InsufficientStockError` |  409 |

---

## Matriz de erros

| Operação                    | Condição                  | Erro                     | HTTP |
| --------------------------- | ------------------------- | ------------------------ | ---: |
| qualquer rota da API        | header x-api-key inválido | ForbiddenError           |  403 |
| GET /stocks/:productId      | produto inexistente ou deletado       | ProductNotFoundError     |  404 |
| PUT /stocks/:productId      | quantidade inválida      | InvalidQuantityError     |  400 |
| PUT /stocks/:productId      | produto inexistente ou deletado       | ProductNotFoundError     |  404 |
| PATCH /stocks/:id/increase  | quantidade inválida      | InvalidQuantityError     |  400 |
| PATCH /stocks/:id/increase  | produto inexistente ou deletado       | ProductNotFoundError     |  404 |
| PATCH /stocks/:id/decrease  | quantidade inválida      | InvalidQuantityError     |  400 |
| PATCH /stocks/:id/decrease  | produto inexistente ou deletado       | ProductNotFoundError     |  404 |
| PATCH /stocks/:id/decrease  | estoque insuficiente      | InsufficientStockError   |  409 |
