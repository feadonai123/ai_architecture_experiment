# Plano Detalhado de Implementação e Execução do Experimento — Monólito Acoplado

> Esta branch mantém apenas a implementação **Monólito Acoplado** do experimento de TCC. O experimento original compara quatro organizações de código equivalentes (Monólito Acoplado, MVC Técnico, Clean Architecture e Domain-Oriented Modular Monolith); as demais variantes são mantidas em branches próprias. Este documento preserva o contexto geral do experimento e os detalhes específicos da variante desta branch.

## 1. Objetivo do experimento

O experimento é construído a partir de quatro implementações funcionalmente equivalentes de um sistema backend de e-commerce, cada uma organizada segundo uma estratégia arquitetural diferente. Esta branch representa a variante **Monólito Acoplado**.

Todas as implementações do experimento utilizam:

* Node.js;
* TypeScript;
* Express;
* TypeORM;
* PostgreSQL;
* Redis.

O objetivo é analisar como diferentes estratégias de organização arquitetural da codebase influenciam a capacidade de agentes de IA de compreender, navegar, modificar e evoluir um sistema de software.

A hipótese experimental é:

> **Quanto maior a co-localização semântica das informações relacionadas a uma funcionalidade, menor tende a ser o esforço de navegação necessário para que um agente de IA compreenda e modifique essa funcionalidade.**

A pesquisa não trata as arquiteturas como uma hierarquia de "melhor" e "pior". O objetivo é avaliar empiricamente diferentes formas de organização da informação presentes na codebase.

---

# 2. Princípio fundamental do experimento

As quatro implementações devem ser equivalentes em todos os aspectos que não correspondam diretamente à estrutura arquitetural.

Devem permanecer constantes:

```text
Domínio da aplicação
Requisitos
Regras de negócio
Modelo de dados
Banco de dados
Mensageria
Tecnologias
Contratos HTTP
Endpoints
Formato das requisições
Formato das respostas
Códigos HTTP
Casos de erro
Comportamentos observáveis
Dados utilizados pelos testes
Infraestrutura experimental
```

Deve variar principalmente:

```text
Organização dos diretórios
Localização das responsabilidades
Fronteiras entre módulos
Direção das dependências
Compartilhamento de componentes
Co-localização semântica
Nível de isolamento entre partes do sistema
```

Essa separação é necessária para que eventuais diferenças observadas no desempenho dos agentes possam ser relacionadas à organização arquitetural, e não a diferenças funcionais ou tecnológicas.

---

# 3. Domínio da aplicação

O sistema experimental é um backend de e-commerce.

O domínio inicial contempla:

```text
Catálogo
Produtos
Estoque
Carrinho
Pedidos
Pagamentos
```

O TCC define como escopo inicial funcionalidades de catálogo, carrinho, pedidos e pagamentos, com posterior introdução de funcionalidades de usuários e autenticação.

A primeira versão do sistema é deliberadamente simples o suficiente para permitir que agentes possam posteriormente realizar tarefas de evolução e manutenção.

---

# 4. Modelagem de dados

A modelagem de dados é idêntica entre as implementações do experimento.

Exemplo conceitual:

```text
Product
----------------
id
name
price
stock

Cart
----------------
id
createdAt

CartItem
----------------
id
cartId
productId
quantity

Order
----------------
id
cartId
status
total
createdAt
```

A implementação concreta utilizando TypeORM é equivalente entre as variantes do experimento.

Diferenças arquiteturais podem alterar a localização ou a forma de organização das classes no código, mas não alteram o modelo persistido.

---

# 5. Infraestrutura compartilhada

A infraestrutura do experimento é centralizada e compartilhada.

Fornece:

```text
PostgreSQL
Redis
```

Um único `docker-compose.yml` é utilizado como infraestrutura de desenvolvimento e testes.

```yaml
services:

  postgres:
    image: postgres
    ...

  redis:
    image: redis
    ...
```

Esta aplicação se conecta a essa infraestrutura.

---

# 6. PostgreSQL

O PostgreSQL é utilizado como banco de dados principal.

A implementação utiliza:

```text
PostgreSQL
TypeORM
```

A infraestrutura disponibiliza um banco para execução da aplicação.

Os testes não utilizam diretamente o banco principal da aplicação.

---

# 7. Banco temporário para testes

Os testes utilizam uma base de dados isolada da base utilizada pela aplicação.

Sempre que possível, é utilizado PostgreSQL real em ambiente temporário, em vez de um banco "fake" ou puramente em memória.

A motivação é preservar o comportamento real do banco para situações relacionadas a:

* transações;
* constraints;
* consultas SQL;
* tipos de dados;
* relações;
* comportamento do TypeORM;
* concorrência;
* consistência.

O banco de testes é criado, limpo ou isolado automaticamente durante a execução da suíte.

---

# 8. Redis

Redis é utilizado para representar a infraestrutura de mensageria do sistema.

Exemplos de eventos:

```text
OrderCreated
OrderPaid
StockUpdated
PaymentProcessed
```

O comportamento funcional associado à mensageria permanece equivalente entre as variantes do experimento.

A arquitetura pode alterar:

```text
onde o produtor é definido;
onde o consumidor é definido;
onde as interfaces são colocadas;
como a dependência é injetada;
como os módulos acessam a mensageria;
```

mas não deve alterar deliberadamente o comportamento funcional apenas para favorecer uma implementação.

---

# 9. Prefabs para testes

Os testes utilizam uma infraestrutura externa de criação de dados, denominada `prefabs`.

```ts
const product = await ProductPrefab.create({
    stock: 10,
    price: 100
});
```

A principal regra é:

> **Os prefabs não podem depender da arquitetura da aplicação.**

Devem conhecer apenas a modelagem de persistência e a infraestrutura de teste.

```text
test/
└── prefabs/
    ├── product.prefab.ts
    ├── cart.prefab.ts
    ├── cart-item.prefab.ts
    ├── order.prefab.ts
    └── payment.prefab.ts
```

Isso garante que as implementações do experimento recebam exatamente as mesmas condições iniciais.

---

# 10. Contrato da API

Todas as implementações do experimento utilizam exatamente os mesmos endpoints.

```text
GET    /products
GET    /products/:id

GET    /cart
POST   /cart/items
DELETE /cart/items/:productId

POST   /orders
GET    /orders/:id
```

O contrato define:

```text
Método HTTP
Endpoint
Parâmetros
Query parameters
Request body
Response body
Status code
Casos de sucesso
Casos de erro
```

Nenhuma implementação adiciona ou remove endpoints por decisão arquitetural.

---

# 11. Casos de erro

Exemplo para `POST /cart/items`:

| Condição             | Erro                     | HTTP |
| -------------------- | ------------------------ | ---: |
| quantidade inválida  | `InvalidQuantityError`   |  400 |
| produto inexistente  | `ProductNotFoundError`   |  404 |
| carrinho inexistente | `CartNotFoundError`      |  404 |
| estoque insuficiente | `InsufficientStockError` |  409 |

A aplicação possui erros semanticamente identificáveis:

```ts
throw new ProductNotFoundError(productId);
```

em vez de:

```ts
throw new Error("Product not found");
```

---

# 12. Mapeamento entre erros internos e HTTP

Os erros de domínio/aplicação possuem representação própria e são convertidos para respostas HTTP.

```text
ProductNotFoundError → HTTP 404
InvalidQuantityError → HTTP 400
InsufficientStockError → HTTP 409
```

No Monólito, o mapeamento ocorre em `errors.ts` + `middleware/errorHandler.ts` + `routes/`. A localização muda entre as variantes do experimento, mas o comportamento externo permanece igual.

---

# 13. TDD

O desenvolvimento segue Test-Driven Development.

```text
1. Definir contrato da API
2. Definir casos de sucesso e erro
3. Criar testes de integração
4. Estruturar a arquitetura
5. Definir regras arquiteturais
6. Criar testes unitários
7. Implementar utilizando TDD
8. Executar testes
9. Validar regras arquiteturais
10. Validar comportamento completo
```

Os testes existem antes da implementação da funcionalidade correspondente.

---

# 14. Testes de integração

Os testes de integração são a principal forma de garantir que as implementações do experimento possuem o mesmo comportamento observável.

A mesma suíte de integração é executada contra cada variante (nesta branch, `APP_TARGET=monolith`).

Os testes não conhecem os detalhes internos da arquitetura. Trabalham exclusivamente com:

```text
HTTP
Database
Redis
Comportamento observável
```

---

# 15. Organização dos testes de integração

```text
test/
└── integration/
    ├── products/
    ├── cart/
    ├── orders/
    └── payments/
```

Cada operação possui testes de caminho feliz e caminhos de erro.

---

# 16. Exemplo de teste de integração

Para adicionar um produto ao carrinho:

```text
given:
    cart exists
    product exists
    product has stock

when:
    POST /cart/items

then:
    HTTP 201

and:
    response contains cart

and:
    cart contains requested product

and:
    quantity is correct
```

---

# 17. Testes de erro de integração

Para produto inexistente:

```text
given:
    cart exists
    product does not exist

when:
    POST /cart/items

then:
    HTTP 404

and:
    error type corresponds to ProductNotFound
```

Para quantidade inválida:

```text
given:
    cart exists
    product exists

when:
    POST /cart/items
    quantity = 0

then:
    HTTP 400
```

Para estoque insuficiente:

```text
given:
    product stock = 2

when:
    request quantity = 5

then:
    HTTP 409
```

---

# 18. Testes unitários

A finalidade é testar as principais unidades responsáveis pela lógica de negócio desta arquitetura.

```text
Jest
```

No Monólito Acoplado, o teste respeita a estrutura efetivamente construída (rota/handler), sem criar artificialmente abstrações apenas para possibilitar testes.

---

# 19. Padrão dos testes unitários

```text
describe("success")
describe("errors")
```

Exemplo:

```text
AddCartItem
├── success
│   ├── creates item
│   └── increments existing quantity
│
└── errors
    ├── ProductNotFound
    ├── CartNotFound
    ├── InvalidQuantity
    └── InsufficientStock
```

---

# 20. Exemplo de teste unitário

```ts
describe("AddCartItem", () => {

    describe("success", () => {

        it("creates a new cart item", async () => {
            // Arrange
            // Act
            // Assert
        });

        it("increments existing item quantity", async () => {
            // Arrange
            // Act
            // Assert
        });
    });

    describe("errors", () => {

        it("throws ProductNotFoundError", async () => {
            // Arrange
            // Act
            // Assert
        });

        it("throws CartNotFoundError", async () => {
            // Arrange
            // Act
            // Assert
        });

        it("throws InvalidQuantityError", async () => {
            // Arrange
            // Act
            // Assert
        });
    });
});
```

O teste de erro verifica o tipo semântico do erro:

```ts
expect(error)
    .toBeInstanceOf(ProductNotFoundError);
```

e não depende exclusivamente da mensagem textual.

---

# 21. Arquitetura desta branch: Monólito Acoplado

## Objetivo

Representar uma codebase com baixo grau de organização arquitetural interna.

O sistema deve continuar funcional, mas não possui fronteiras fortes entre responsabilidades.

```text
src/
├── app.ts
├── database.ts
└── entities/
    ├── Product.ts
    ├── Cart.ts
    └── CartItem.ts
```

Parte significativa da lógica fica diretamente nas rotas:

```text
POST /cart/items
    ↓
validação
    ↓
regra de negócio
    ↓
TypeORM
    ↓
resposta
```

## Adicionar produto

Pseudocódigo:

```text
POST /cart/items

    receber cartId
    receber productId
    receber quantity

    validar quantity

    consultar Product via TypeORM

    se produto não existir:
        lançar ProductNotFoundError

    consultar Cart via TypeORM

    se carrinho não existir:
        lançar CartNotFoundError

    consultar CartItem

    se item existir:
        incrementar quantity
        salvar
    senão:
        criar item
        salvar

    carregar carrinho atualizado

    retornar resposta
```

Não são criados artificialmente:

```text
UseCase
Repository
Service
Interface
Factory
```

quando esses componentes não forem necessários à representação da arquitetura.

---

# 22. Regras arquiteturais

A implementação possui regras explícitas que definem quais dependências são permitidas, verificadas automaticamente. A análise arquitetural distingue:

```text
qualidade geral do código
```

de:

```text
conformidade arquitetural
```

---

# 23. Ferramentas de análise estática

## Prettier

Responsabilidade: formatação. Não é utilizado como mecanismo de validação arquitetural.

## ESLint

Responsabilidades: qualidade estática, padrões de código, imports proibidos, restrições simples.

## Dependency Cruiser

Principal mecanismo de análise das dependências arquiteturais, com regras específicas para esta arquitetura (`.dependency-cruiser.cjs`).

---

# 24. Scripts de validação

```text
npm test
npm run test:integration
npm run test:unit
npm run lint
npm run architecture
npm run typecheck
```

---

# 25. Estrutura geral do repositório desta branch

```text
experiment/
│
├── docker-compose.yml
│
├── test/
│   ├── integration/
│   ├── prefabs/
│   ├── fixtures/
│   ├── contracts/
│   └── helpers/
│
└── monolith/
    ├── src/
    ├── test/
    ├── package.json
    └── tsconfig.json
```

Os testes de integração compartilhados são mantidos fora da aplicação; os testes unitários permanecem junto da implementação.

---

# 26. Processo completo de desenvolvimento

## Fase 1: definição do domínio

Entidades, relacionamentos, regras de negócio, eventos, operações.

## Fase 2: definição do contrato

Para cada endpoint: request, response, status code, happy path, error paths.

## Fase 3: definição dos erros

Matriz: Operação, Condição, Erro, HTTP status — comum a todas as variantes do experimento.

## Fase 4: testes de integração

Testes comuns cobrindo happy paths, error paths, estado do banco, respostas HTTP, efeitos sobre o sistema, mensageria quando aplicável.

## Fase 5: estrutura arquitetural

Estrutura desta codebase: Monólito Acoplado.

## Fase 6: regras arquiteturais

Imports permitidos, imports proibidos, dependências entre camadas, componentes compartilhados.

## Fase 7: testes unitários

`success` / `errors`, de acordo com as unidades reais desta arquitetura (rota/handler).

---

# 27. Implementação usando TDD

Para cada funcionalidade:

```text
RED
    escrever teste
    executar teste
    confirmar falha

GREEN
    implementar menor solução necessária
    executar teste
    confirmar sucesso

REFACTOR
    melhorar implementação
    manter testes passando
    verificar regras arquiteturais
```

Os testes comuns não devem ser modificados pelo agente para simplesmente fazer o sistema passar. Alterações no contrato funcional são tratadas como mudanças de especificação e não como parte da implementação normal.

---

# 28. Primeira funcionalidade: carrinho

```text
Adicionar produto ao carrinho
Remover produto do carrinho
```

Essas funcionalidades envolvem HTTP, persistência, regras de negócio, erros e relacionamento entre entidades.

---

# 29. Fluxo de adicionar produto

Contrato:

```text
POST /cart/items
```

Input:

```json
{
  "cartId": "uuid",
  "productId": "uuid",
  "quantity": 2
}
```

Fluxo:

```text
receber request
        ↓
validar quantity
        ↓
verificar Product
        ↓
verificar Cart
        ↓
buscar CartItem
        ↓
criar ou atualizar item
        ↓
persistir
        ↓
retornar carrinho
```

Erros:

```text
InvalidQuantity
ProductNotFound
CartNotFound
InsufficientStock
```

---

# 30. Fluxo de remover produto

Contrato:

```text
DELETE /cart/items/:productId
```

Fluxo:

```text
receber cartId
        ↓
verificar Cart
        ↓
verificar CartItem
        ↓
remover item
        ↓
persistir
        ↓
retornar carrinho atualizado
```

Erros:

```text
CartNotFound
CartItemNotFound
```

---

# 31. Garantia de qualidade da implementação

Antes que esta codebase seja utilizada nos experimentos com agentes, ela deve cumprir:

```text
todos os testes de integração
+
todos os testes unitários
+
typecheck
+
lint
+
regras arquiteturais
```

A execução deve produzir um estado inicial conhecido e funcional. Nenhuma implementação deve entrar no experimento contendo bugs conhecidos não relacionados à tarefa experimental.

---

# 32. Estado inicial do experimento

Esta aplicação começa com:

```text
funcionalidades definidas
mesmos dados de referência
mesmas regras
mesmos testes
mesma infraestrutura
```

que as demais variantes do experimento. Não possui inicialmente:

```text
autenticação
gerenciamento completo de usuários
outras funcionalidades introduzidas posteriormente pelo experimento
```

Isso está alinhado ao desenho do TCC, no qual o sistema inicial possui um escopo reduzido para posteriormente submetê-lo a tarefas de evolução.

---

# 33. Evolução posterior

Após a construção das versões iniciais do experimento, elas são submetidas às tarefas experimentais previstas no trabalho:

```text
Experimento 1
Compreensão e navegação do sistema base

Experimento 2
Evolução funcional

Experimento 3
Modificação de regras de negócio

Experimento 4
Refatoração arquitetural
```

---

# 34. Métricas a serem coletadas

```text
taxa de sucesso
tempo de execução
consumo de tokens
quantidade de iterações
arquivos acessados
arquivos modificados
quantidade de buscas
quantidade de comandos/ferramentas utilizados
```

---

# 35. Esforço de navegação

```text
número de arquivos lidos
número de arquivos modificados
quantidade de buscas
quantidade de iterações
arquivos relevantes encontrados
arquivos irrelevantes explorados
```

---

# 36. Qualidade funcional e qualidade arquitetural

## Correção funcional

```text
compila
testes passam
endpoint funciona
regra de negócio está correta
```

## Conformidade arquitetural

```text
dependências respeitadas
boundaries preservadas
camadas respeitadas
ausência de dependências proibidas
```

Uma implementação pode ser funcionalmente correta e arquiteturalmente inadequada. Esse caso deve ser registrado separadamente.

---

# 37. Pipeline geral de validação

```text
1. Jest Unit Tests
        ↓
2. Integration Tests
        ↓
3. TypeScript Typecheck
        ↓
4. ESLint
        ↓
5. Architecture Rules
        ↓
6. Full Test Suite
```

---

# 38. Regra principal para geração assistida por IA

Os agentes utilizados posteriormente no experimento recebem:

```text
o mesmo requisito
o mesmo ambiente inicial
o mesmo contrato
o mesmo conjunto de testes
o mesmo conjunto de ferramentas disponíveis
```

As diferenças entre as execuções decorrem principalmente da arquitetura da codebase. O agente não deve receber instruções que revelem qual arquitetura é supostamente "melhor".

---

# 39. Princípio final

> **A funcionalidade é constante; a organização é a variável.**

A investigação observa se a organização da codebase modifica a maneira como agentes de IA exploram, compreendem e evoluem a aplicação. O objetivo não é provar que uma arquitetura é universalmente superior, mas identificar quais características estruturais da organização de uma codebase favorecem ou dificultam o trabalho realizado por agentes de IA.
