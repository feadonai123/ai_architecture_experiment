# Plano Detalhado de Implementação e Execução do Experimento

## 1. Objetivo do experimento

O experimento será construído a partir de quatro implementações funcionalmente equivalentes de um sistema backend de e-commerce:

1. Monólito Acoplado;
2. MVC Técnico;
3. Clean Architecture;
4. Domain-Oriented Modular Monolith.

Todas as implementações deverão representar o mesmo sistema, utilizando:

* Node.js;
* TypeScript;
* Express;
* TypeORM;
* PostgreSQL;
* Redis.

O objetivo é analisar como diferentes estratégias de organização arquitetural da codebase influenciam a capacidade de agentes de IA de compreender, navegar, modificar e evoluir um sistema de software.

A hipótese experimental é:

> **Quanto maior a co-localização semântica das informações relacionadas a uma funcionalidade, menor tende a ser o esforço de navegação necessário para que um agente de IA compreenda e modifique essa funcionalidade.**

A pesquisa não deverá tratar as arquiteturas como uma hierarquia de "melhor" e "pior". O objetivo é avaliar empiricamente diferentes formas de organização da informação presentes na codebase.

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

Portanto, o experimento deve comparar:

```text
MESMO SISTEMA
+
MESMO COMPORTAMENTO
+
MESMA INFRAESTRUTURA
+
MESMAS TECNOLOGIAS
+
DIFERENTE ORGANIZAÇÃO DA CODEBASE
```

Essa separação é necessária para que eventuais diferenças observadas no desempenho dos agentes possam ser relacionadas à organização arquitetural, e não a diferenças funcionais ou tecnológicas.

---

# 3. Domínio da aplicação

O sistema experimental será um backend de e-commerce.

O domínio inicial deve contemplar:

```text
Catálogo
Produtos
Estoque
Carrinho
Pedidos
Pagamentos
```

O TCC já define como escopo inicial funcionalidades de catálogo, carrinho, pedidos e pagamentos, com posterior introdução de funcionalidades de usuários e autenticação.

A primeira versão do sistema deverá ser deliberadamente simples o suficiente para permitir que agentes possam posteriormente realizar tarefas de evolução e manutenção.

---

# 4. Modelagem de dados

A modelagem de dados deve ser idêntica nas quatro implementações.

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

A implementação concreta utilizando TypeORM deve ser equivalente nas quatro versões.

Diferenças arquiteturais podem alterar a localização ou a forma de organização das classes no código, mas não devem alterar o modelo persistido.

Por exemplo, a mesma tabela `products` deve existir independentemente da arquitetura utilizada.

---

# 5. Infraestrutura compartilhada

A infraestrutura do experimento deverá ser centralizada e compartilhada.

Ela deverá fornecer:

```text
PostgreSQL
Redis
```

Um único `docker-compose.yml` deverá ser utilizado como infraestrutura de desenvolvimento e testes.

Estrutura conceitual:

```text
experiment/
└── docker-compose.yml
```

Exemplo:

```yaml
services:

  postgres:
    image: postgres
    ...

  redis:
    image: redis
    ...
```

As quatro aplicações deverão conectar-se a essa mesma infraestrutura.

Não devem existir versões arquiteturalmente diferentes do banco ou do Redis.

---

# 6. PostgreSQL

O PostgreSQL será utilizado como banco de dados principal das quatro aplicações.

Todas as implementações deverão utilizar:

```text
PostgreSQL
TypeORM
```

A infraestrutura deverá disponibilizar um banco para execução da aplicação.

Os testes, entretanto, não deverão utilizar diretamente o banco principal da aplicação.

---

# 7. Banco temporário para testes

Os testes deverão utilizar uma base de dados isolada da base utilizada pela aplicação.

Sempre que possível, deve ser utilizado PostgreSQL real em ambiente temporário, em vez de um banco "fake" ou puramente em memória.

A motivação é preservar o comportamento real do banco para situações relacionadas a:

* transações;
* constraints;
* consultas SQL;
* tipos de dados;
* relações;
* comportamento do TypeORM;
* concorrência;
* consistência.

Assim, o ambiente experimental poderá utilizar:

```text
PostgreSQL da aplicação
```

e:

```text
PostgreSQL temporário/isolado para testes
```

O banco de testes deve ser criado, limpo ou isolado automaticamente durante a execução da suíte.

O mecanismo concreto de isolamento poderá utilizar banco separado, schema separado ou estratégia equivalente, desde que uma execução de teste não contamine os dados de outra.

---

# 8. Redis

Redis será utilizado para representar a infraestrutura de mensageria do sistema.

A intenção é manter uma infraestrutura de mensageria comum entre as quatro implementações.

Exemplos de eventos:

```text
OrderCreated
OrderPaid
StockUpdated
PaymentProcessed
```

O comportamento funcional associado à mensageria deve permanecer equivalente entre as versões.

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

Os testes utilizarão uma infraestrutura externa de criação de dados, denominada `prefabs`.

Os prefabs serão responsáveis por criar estados conhecidos no banco para facilitar a preparação dos testes.

Exemplo:

```ts
const product = await ProductPrefab.create({
    stock: 10,
    price: 100
});
```

ou:

```ts
const cart = await CartPrefab.create();

const product = await ProductPrefab.create({
    stock: 10
});

await CartItemPrefab.create({
    cartId: cart.id,
    productId: product.id,
    quantity: 2
});
```

A principal regra será:

> **Os prefabs não podem depender da arquitetura da aplicação.**

Eles não devem importar:

```text
MVC controllers
Clean use cases
Domain repositories
Application services
```

Devem conhecer apenas a modelagem de persistência e a infraestrutura de teste.

Estrutura aproximada:

```text
test/
└── prefabs/
    ├── product.prefab.ts
    ├── cart.prefab.ts
    ├── cart-item.prefab.ts
    ├── order.prefab.ts
    └── payment.prefab.ts
```

Isso garante que os quatro sistemas recebam exatamente as mesmas condições iniciais.

---

# 10. Contrato da API

Antes da implementação, deverá ser definido o contrato completo da API.

Todos os sistemas deverão utilizar exatamente os mesmos endpoints.

Exemplo:

```text
GET    /products
GET    /products/:id

GET    /cart
POST   /cart/items
DELETE /cart/items/:productId

POST   /orders
GET    /orders/:id
```

O contrato deverá definir:

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

Nenhuma implementação deve adicionar ou remover endpoints por decisão arquitetural.

---

# 11. Casos de erro

Durante a definição do contrato da API, todos os cenários relevantes de erro deverão ser identificados.

Exemplo para `POST /cart/items`:

| Condição             | Erro                     | HTTP |
| -------------------- | ------------------------ | ---: |
| quantidade inválida  | `InvalidQuantityError`   |  400 |
| produto inexistente  | `ProductNotFoundError`   |  404 |
| carrinho inexistente | `CartNotFoundError`      |  404 |
| estoque insuficiente | `InsufficientStockError` |  409 |

A lista completa de erros deverá ser definida antes do início da implementação.

A aplicação deverá possuir erros semanticamente identificáveis.

Exemplo:

```ts
throw new ProductNotFoundError(productId);
```

em vez de:

```ts
throw new Error("Product not found");
```

Isso permitirá testar explicitamente os diferentes cenários.

---

# 12. Mapeamento entre erros internos e HTTP

Os erros de domínio/aplicação deverão possuir representação própria e posteriormente ser convertidos para respostas HTTP.

Conceitualmente:

```text
ProductNotFoundError
        ↓
HTTP 404
```

```text
InvalidQuantityError
        ↓
HTTP 400
```

```text
InsufficientStockError
        ↓
HTTP 409
```

Cada arquitetura deverá realizar esse mapeamento dentro de sua própria organização estrutural.

Por exemplo:

```text
MVC:
errors/
controllers/
```

```text
Clean:
errors/
usecases/
controllers/
```

```text
Domain:
ordering/errors/
ordering/usecases/
ordering/controllers/
```

A localização muda, mas o comportamento externo permanece igual.

---

# 13. TDD

O desenvolvimento seguirá Test-Driven Development.

A ordem geral será:

```text
1. Definir contrato da API
2. Definir casos de sucesso e erro
3. Criar testes de integração
4. Estruturar cada arquitetura
5. Definir regras arquiteturais
6. Criar testes unitários
7. Implementar utilizando TDD
8. Executar testes
9. Validar regras arquiteturais
10. Validar comportamento completo
```

Os testes deverão existir antes da implementação da funcionalidade correspondente.

---

# 14. Testes de integração

Os testes de integração serão a principal forma de garantir que as quatro implementações possuem o mesmo comportamento observável.

A mesma suíte de integração deverá ser executada contra:

```text
Monólito Acoplado
MVC
Clean
Domain-Oriented
```

Os testes não deverão conhecer os detalhes internos das arquiteturas.

Não devem existir assertions como:

```text
expect(OrderController).toBeDefined()
```

ou:

```text
expect(AddOrderUseCase).toBeCalled()
```

nos testes de integração.

Os testes deverão trabalhar exclusivamente com:

```text
HTTP
Database
Redis
Comportamento observável
```

---

# 15. Organização dos testes de integração

Estrutura:

```text
test/
└── integration/
    ├── products/
    ├── cart/
    ├── orders/
    └── payments/
```

Exemplo:

```text
test/integration/cart/add-item.test.ts
test/integration/cart/remove-item.test.ts
test/integration/cart/get-cart.test.ts
```

Cada operação deverá possuir testes de:

```text
caminho feliz
caminhos de erro
```

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

O mesmo teste deverá passar em todas as quatro implementações.

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

and:
    error corresponds to InvalidQuantity
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

Os testes unitários serão específicos de cada implementação.

A finalidade é testar as principais unidades responsáveis pela lógica de negócio de cada arquitetura.

Os testes poderão utilizar mocks das dependências externas.

A ferramenta principal será:

```text
Jest
```

No caso de Clean Architecture e Domain-Oriented, os principais alvos serão os Use Cases.

No MVC, o teste deverá ser direcionado à unidade que concentra a regra de negócio, normalmente o Controller.

No Monólito Acoplado, o teste deverá respeitar a estrutura efetivamente construída, sem criar artificialmente abstrações apenas para possibilitar testes.

---

# 19. Padrão dos testes unitários

Os testes unitários deverão seguir uma organização consistente:

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

Isso permite que diferentes implementações sejam avaliadas através de uma matriz de cenários comparável, ainda que as unidades internas testadas sejam diferentes.

---

# 20. Exemplo de teste unitário

Conceitualmente:

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

O teste de erro deverá verificar o tipo semântico do erro:

```ts
expect(error)
    .toBeInstanceOf(ProductNotFoundError);
```

e não depender exclusivamente da mensagem textual.

---

# 21. Arquitetura 1: Monólito Acoplado

## Objetivo

Representar uma codebase com baixo grau de organização arquitetural interna.

O sistema deve continuar funcional, mas não deverá possuir fronteiras fortes entre responsabilidades.

Exemplo:

```text
src/
├── app.ts
├── database.ts
└── entities/
    ├── Product.ts
    ├── Cart.ts
    └── CartItem.ts
```

Parte significativa da lógica poderá ficar diretamente nas rotas:

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

---

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

Não deverão ser criados artificialmente:

```text
UseCase
Repository
Service
Interface
Factory
```

quando esses componentes não forem necessários à representação da arquitetura.

---

# 22. Arquitetura 2: MVC Técnico

## Objetivo

Organizar a aplicação principalmente por responsabilidades técnicas.

Estrutura:

```text
src/
├── controllers/
├── models/
├── services/
├── routes/
└── errors/
```

O agrupamento principal é técnico.

Exemplo:

```text
controllers/
    ProductController
    CartController
    OrderController

models/
    Product
    Cart
    CartItem
    Order
```

Portanto, os domínios permanecem distribuídos entre as mesmas camadas.

---

## AddCartItem

Fluxo:

```text
HTTP
 ↓
CartController
 ↓
Model
 ↓
Database
```

Pseudocódigo:

```text
CartController.addItem(request):

    obter cartId
    obter productId
    obter quantity

    validar quantity

    product = Product.findById(productId)

    se não existir:
        throw ProductNotFoundError

    cart = Cart.findById(cartId)

    se não existir:
        throw CartNotFoundError

    item = CartItem.findByCartAndProduct(
        cartId,
        productId
    )

    se item existir:
        item.quantity += quantity
        item.save()
    senão:
        criar CartItem
        salvar

    buscar carrinho atualizado

    retornar resposta
```

A regra de negócio permanece no Controller ou em serviços estreitamente associados à organização MVC.

---

# 23. Arquitetura 3: Clean Architecture

## Objetivo

Manter a organização por responsabilidades técnicas, adicionando:

```text
Use Cases
Entities
Repository abstractions
Dependency Rule
Inversão de dependência
```

Estrutura:

```text
src/
├── controllers/
├── usecases/
├── entities/
├── repositories/
├── services/
├── errors/
├── infrastructure/
└── routes/
```

A separação é transversal ao domínio.

Exemplo:

```text
controllers/
usecases/
repositories/
entities/
```

contêm componentes de vários domínios.

---

## AddCartItem

```text
HTTP
 ↓
Controller
 ↓
Use Case
 ↓
Repository Interface
 ↓
Repository Implementation
 ↓
TypeORM
 ↓
PostgreSQL
```

Controller:

```text
AddCartItemController.handle(request):

    extrair input

    result = AddCartItem.execute(input)

    retornar result
```

Use Case:

```text
AddCartItem.execute(input):

    validar quantity

    product =
        productRepository.findById(productId)

    se produto não existir:
        throw ProductNotFoundError

    cart =
        cartRepository.findById(cartId)

    se carrinho não existir:
        throw CartNotFoundError

    item =
        cartItemRepository.findByCartAndProduct(
            cartId,
            productId
        )

    se item existir:

        item.quantity += quantity

        cartItemRepository.save(item)

    senão:

        item = CartItem.create(...)

        cartItemRepository.save(item)

    retornar carrinho atualizado
```

O Use Case não deverá conhecer Express nem TypeORM diretamente.

---

# 24. Arquitetura 4: Domain-Oriented Modular Monolith

## Objetivo

Manter as propriedades da Clean Architecture, mas adicionar uma primeira dimensão organizacional baseada em domínio.

A organização será:

```text
DOMÍNIO
    ↓
RESPONSABILIDADE TÉCNICA
```

Estrutura:

```text
src/
├── catalog/
│   ├── controllers/
│   ├── usecases/
│   ├── repositories/
│   ├── entities/
│   └── errors/
│
├── ordering/
│   ├── controllers/
│   ├── usecases/
│   ├── repositories/
│   ├── entities/
│   └── errors/
│
├── payments/
│   ├── controllers/
│   ├── usecases/
│   ├── repositories/
│   ├── entities/
│   └── errors/
│
├── inventory/
│   ├── controllers/
│   ├── usecases/
│   ├── repositories/
│   ├── entities/
│   └── errors/
│
└── shared/
```

A principal diferença em relação à Clean Architecture será a co-localização das informações semanticamente relacionadas.

---

# 25. AddCartItem no Domain-Oriented

O carrinho pertence ao contexto de `ordering`.

Portanto:

```text
ordering/
├── controllers/
│   └── AddCartItemController.ts
│
├── usecases/
│   └── AddCartItem.ts
│
├── repositories/
│   ├── CartRepository.ts
│   └── CartItemRepository.ts
│
├── entities/
│   ├── Cart.ts
│   └── CartItem.ts
│
└── errors/
    └── CartNotFoundError.ts
```

O fluxo permanece:

```text
HTTP
 ↓
ordering Controller
 ↓
ordering Use Case
 ↓
ordering Repository
 ↓
TypeORM
 ↓
PostgreSQL
```

A diferença está principalmente na topologia da codebase.

---

# 26. Isolamento entre contextos

Os contextos devem possuir fronteiras explícitas.

Por exemplo:

```text
ordering
```

não deve importar diretamente estruturas internas de:

```text
payments
inventory
```

como:

```text
payments/repositories/InternalPaymentRepository
```

A comunicação deve utilizar uma interface ou mecanismo explícito de integração.

O objetivo é evitar que a simples organização por pastas seja apenas cosmética.

A fronteira semântica precisa ser refletida na estrutura de dependências.

---

# 27. Duplicação de código

A arquitetura Domain-Oriented deverá permitir duplicação quando essa duplicação contribuir para o isolamento semântico.

Por exemplo:

```text
ordering/repositories/ProductRepository
catalog/repositories/ProductRepository
```

podem coexistir mesmo que ambos consultem a tabela:

```text
products
```

Não deverá ser criada uma abstração global apenas para eliminar toda repetição.

O princípio experimental será:

```text
co-localização e isolamento semântico
>
reutilização técnica
```

quando houver conflito entre as duas características.

---

# 28. Componentes compartilhados

Componentes estritamente técnicos podem permanecer compartilhados.

Exemplo:

```text
shared/
├── database/
├── messaging/
├── integrations/
└── infrastructure/
```

Exemplos:

```text
Redis connection
PostgreSQL connection
Payment Gateway client
Email provider
```

Entretanto, regras específicas de domínio não deverão ser movidas para `shared` apenas para evitar duplicação.

---

# 29. Regras arquiteturais

Cada implementação deverá possuir regras explícitas que definem quais dependências são permitidas.

Essas regras deverão ser verificadas automaticamente.

A análise arquitetural deverá distinguir:

```text
qualidade geral do código
```

de:

```text
conformidade arquitetural
```

---

# 30. Ferramentas de análise estática

A infraestrutura estática deverá utilizar ferramentas diferentes para responsabilidades diferentes.

## Prettier

Responsabilidade:

```text
formatação
```

Não será utilizado como mecanismo de validação arquitetural.

---

## ESLint

Responsabilidades:

```text
qualidade estática
padrões de código
imports proibidos
restrições simples
```

Por exemplo:

```text
entities
    não podem importar Express

entities
    não podem importar infrastructure
```

ou:

```text
domain
    não pode importar módulo interno de outro domínio
```

---

## Dependency Cruiser

Será utilizado como principal mecanismo de análise das dependências arquiteturais.

Ele permitirá representar regras como:

```text
entities
    não pode depender de infrastructure

usecases
    não pode depender de controllers

ordering
    não pode depender diretamente de payments/internals
```

As regras devem ser específicas para cada arquitetura.

---

# 31. Exemplo de regra da Clean Architecture

Conceitualmente:

```text
entities
    ✓ podem ser importadas por usecases

entities
    ✗ não podem importar infrastructure

usecases
    ✓ podem utilizar repository interfaces

usecases
    ✗ não podem importar TypeORM

controllers
    ✓ podem utilizar usecases

infrastructure
    ✓ pode implementar repositories
```

---

# 32. Exemplo de regra do Domain-Oriented

```text
ordering
    ✗ não pode importar payments/internal/*

ordering
    ✗ não pode importar inventory/internal/*

catalog
    ✗ não pode importar ordering/internal/*

ordering/usecases
    ✗ não pode importar Express diretamente

ordering/entities
    ✗ não pode importar TypeORM diretamente
```

As regras concretas deverão refletir a arquitetura escolhida e ser validadas antes dos experimentos.

---

# 33. Scripts de validação

Cada implementação deverá disponibilizar scripts equivalentes, por exemplo:

```text
npm test
npm run test:integration
npm run test:unit
npm run lint
npm run architecture
npm run typecheck
```

O objetivo é padronizar a forma de validação entre os projetos.

---

# 34. Estrutura geral do repositório experimental

Uma estrutura possível:

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
├── monolith/
│   ├── src/
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
│
├── mvc/
│   ├── src/
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
│
├── clean/
│   ├── src/
│   ├── test/
│   ├── package.json
│   └── tsconfig.json
│
└── domain/
    ├── src/
    ├── test/
    ├── package.json
    └── tsconfig.json
```

Os testes de integração compartilhados podem ser mantidos fora das aplicações, enquanto os testes unitários permanecerão junto da implementação correspondente.

---

# 35. Processo completo de desenvolvimento

## Fase 1: definição do domínio

Definir:

```text
entidades
relacionamentos
regras de negócio
eventos
operações
```

---

## Fase 2: definição do contrato

Para cada endpoint:

```text
request
response
status code
happy path
error paths
```

---

## Fase 3: definição dos erros

Criar a matriz:

```text
Operação
Condição
Erro
HTTP status
```

Essa matriz será comum às quatro implementações.

---

## Fase 4: testes de integração

Criar todos os testes comuns.

Eles devem abranger:

```text
happy paths
error paths
estado do banco
respostas HTTP
efeitos sobre o sistema
mensageria quando aplicável
```

Nesse momento ainda não deve existir a implementação das funcionalidades.

---

## Fase 5: estrutura arquitetural

Definir a estrutura de cada codebase:

```text
Monólito
MVC
Clean
Domain-Oriented
```

---

## Fase 6: regras arquiteturais

Definir:

```text
imports permitidos
imports proibidos
dependências entre camadas
dependências entre contextos
componentes compartilhados
```

Essas regras deverão ser representadas automaticamente sempre que possível.

---

## Fase 7: testes unitários

Para cada implementação:

```text
success
errors
```

Os testes deverão ser escritos de acordo com as unidades reais daquela arquitetura.

---

# 36. Implementação usando TDD

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

O agente deverá trabalhar dentro desse ciclo.

Os testes comuns não devem ser modificados pelo agente para simplesmente fazer o sistema passar.

Alterações no contrato funcional devem ser tratadas como mudanças de especificação e não como parte da implementação normal.

---

# 37. Primeira funcionalidade: carrinho

A primeira funcionalidade utilizada como modelo de implementação deverá ser:

```text
Adicionar produto ao carrinho
Remover produto do carrinho
```

Essas funcionalidades são adequadas para estabelecer o padrão experimental porque envolvem:

```text
HTTP
persistência
regras de negócio
erros
relacionamento entre entidades
```

---

# 38. Fluxo de adicionar produto

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

# 39. Fluxo de remover produto

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

# 40. Estratégia de equivalência

A seguinte matriz deverá ser utilizada para verificar se as quatro versões permanecem equivalentes:

| Característica        |    Monólito |         MVC |       Clean |      Domain |
| --------------------- | ----------: | ----------: | ----------: | ----------: |
| Node.js               |           ✓ |           ✓ |           ✓ |           ✓ |
| TypeScript            |           ✓ |           ✓ |           ✓ |           ✓ |
| Express               |           ✓ |           ✓ |           ✓ |           ✓ |
| TypeORM               |           ✓ |           ✓ |           ✓ |           ✓ |
| PostgreSQL            |           ✓ |           ✓ |           ✓ |           ✓ |
| Redis                 |           ✓ |           ✓ |           ✓ |           ✓ |
| Schema de banco       |       igual |       igual |       igual |       igual |
| API                   |       igual |       igual |       igual |       igual |
| Erros                 |      iguais |      iguais |      iguais |      iguais |
| Integration tests     |      iguais |      iguais |      iguais |      iguais |
| Unit tests            | específicos | específicos | específicos | específicos |
| Arquitetura           |   diferente |   diferente |   diferente |   diferente |
| Organização semântica |       baixa |       baixa |       baixa |        alta |

---

# 41. O que não deve variar

Não será permitido introduzir diferenças como:

```text
MVC usa Redis Streams
Clean usa Pub/Sub
Domain não usa Redis
```

ou:

```text
MVC possui 8 entidades
Clean possui 10
```

ou:

```text
Domain utiliza banco diferente
```

sem justificativa experimental explícita.

Também não devem ser utilizadas bibliotecas diferentes para representar funcionalidades equivalentes.

A arquitetura deve ser a variável predominante.

---

# 42. O que deve variar

As diferenças deverão estar principalmente em:

```text
quantidade de componentes
localização dos componentes
organização dos diretórios
fronteiras semânticas
direção das dependências
nível de compartilhamento
nível de duplicação
co-localização das informações
```

Essas características constituem o objeto estrutural da investigação.

---

# 43. Caracterização das quatro arquiteturas

## Monólito Acoplado

```text
Organização mínima

Baixa separação
Alto acoplamento
Dependências diretas
Poucas abstrações
Alta centralização
Baixa co-localização semântica
```

---

## MVC Técnico

```text
Separação por responsabilidade técnica

controllers/
models/
services/

Domínios distribuídos entre camadas
Co-localização semântica baixa
```

---

## Clean Architecture

```text
Separação técnica mais refinada

controllers/
usecases/
entities/
repositories/
services/

Dependency Rule
Inversão de dependência
Isolamento do domínio

Domínios ainda distribuídos pelas camadas
```

---

## Domain-Oriented Modular Monolith

```text
Primeira divisão por domínio

catalog/
ordering/
payments/
inventory/

Segunda divisão por responsabilidade técnica

controllers/
usecases/
repositories/
entities/
errors/

Alta co-localização semântica
Maior isolamento
Maior possibilidade de duplicação
```

---

# 44. Princípio da co-localização

O principal conceito estrutural a ser observado será a distância entre informações semanticamente relacionadas.

Exemplo:

```text
Clean:

controllers/
    OrderController

usecases/
    CreateOrder

repositories/
    OrderRepository

entities/
    Order
```

versus:

```text
Domain:

ordering/
    controllers/
        OrderController

    usecases/
        CreateOrder

    repositories/
        OrderRepository

    entities/
        Order
```

As implementações podem conter componentes equivalentes.

A diferença está na sua localização dentro da estrutura da codebase.

Esse fenômeno deve ser considerado uma das principais características observadas durante os experimentos.

---

# 45. Garantia de qualidade das implementações

Antes que qualquer codebase seja utilizada nos experimentos com agentes, ela deverá cumprir:

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

A execução deverá produzir um estado inicial conhecido e funcional.

Nenhuma implementação deve entrar no experimento contendo bugs conhecidos não relacionados à tarefa experimental.

---

# 46. Estado inicial do experimento

As quatro aplicações devem começar com:

```text
mesmas funcionalidades
mesmos dados de referência
mesmas regras
mesmos testes
mesma infraestrutura
```

Não deverão possuir inicialmente:

```text
autenticação
gerenciamento completo de usuários
outras funcionalidades introduzidas posteriormente pelo experimento
```

Isso está alinhado ao desenho do TCC, no qual o sistema inicial possui um escopo reduzido para posteriormente submetê-lo a tarefas de evolução.

---

# 47. Evolução posterior

Após a construção das quatro versões iniciais, elas serão submetidas às tarefas experimentais previstas no trabalho:

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

Essas categorias já fazem parte da metodologia proposta no TCC.

A primeira etapa de implementação deverá, portanto, produzir uma base suficientemente estável para que essas tarefas posteriores sejam executadas de forma comparável.

---

# 48. Métricas a serem coletadas

Para cada execução dos agentes, deverão ser registrados:

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

As métricas já previstas no TCC incluem tokens, tempo e taxa de sucesso.

Para a hipótese específica de navegação, deverão ser especialmente observadas métricas relacionadas ao esforço de exploração da codebase.

---

# 49. Esforço de navegação

Devem ser observados indicadores como:

```text
número de arquivos lidos
número de arquivos modificados
quantidade de buscas
quantidade de iterações
arquivos relevantes encontrados
arquivos irrelevantes explorados
```

Quando possível, deverá ser analisada também a diferença entre:

```text
arquivos semanticamente relacionados à tarefa
```

e:

```text
arquivos que efetivamente precisaram ser explorados pelo agente.
```

Esse conjunto de métricas permitirá relacionar o resultado do agente à hipótese de co-localização semântica.

---

# 50. Qualidade funcional e qualidade arquitetural

A avaliação deverá separar dois conceitos.

## Correção funcional

Verificar:

```text
compila
testes passam
endpoint funciona
regra de negócio está correta
```

## Conformidade arquitetural

Verificar:

```text
dependências respeitadas
boundaries preservadas
camadas respeitadas
contextos isolados
ausência de dependências proibidas
```

Uma implementação poderá ser funcionalmente correta e arquiteturalmente inadequada.

Esse caso deve ser registrado separadamente.

---

# 51. Pipeline geral de validação

Cada alteração significativa deverá passar por:

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

A codebase somente será considerada válida quando todos os níveis estiverem aprovados.

---

# 52. Regra principal para geração assistida por IA

Os agentes utilizados posteriormente no experimento deverão receber:

```text
o mesmo requisito
o mesmo ambiente inicial
o mesmo contrato
o mesmo conjunto de testes
o mesmo conjunto de ferramentas disponíveis
```

As diferenças entre as execuções deverão decorrer principalmente da arquitetura da codebase.

O agente não deverá receber instruções que revelem qual arquitetura é supostamente "melhor".

A tarefa deve descrever o resultado esperado e não induzir a estratégia de navegação.

---

# 53. Resultado esperado da etapa de implementação

Ao final dessa etapa deverão existir quatro aplicações:

```text
monolith/
mvc/
clean/
domain/
```

Todas deverão:

```text
compilar
iniciar
conectar ao PostgreSQL
conectar ao Redis
responder aos mesmos endpoints
seguir o mesmo contrato
passar nos mesmos testes de integração
passar nos testes unitários específicos
obedecer às suas regras arquiteturais
```

A diferença relevante deverá estar na estrutura interna da codebase.

---

# 54. Princípio final

A construção das aplicações deverá seguir a seguinte regra:

> **A funcionalidade é constante; a organização é a variável.**

Ou, de maneira mais precisa:

```text
                 MESMO SISTEMA
                       │
          ┌────────────┴────────────┐
          │                         │
      comportamento             infraestrutura
          │                         │
          └────────────┬────────────┘
                       │
                 VARIAÇÃO
                       │
              ORGANIZAÇÃO DA
                 CODEBASE
                       │
       ┌───────────────┼────────────────┐
       │               │                │
    Monólito          MVC             Clean
       │                                │
       └────────────────────────────────┘
                       │
                Domain-Oriented
```

A investigação deverá então observar se a alteração dessa organização modifica a maneira como agentes de IA exploram, compreendem e evoluem a aplicação.

O objetivo não é provar que uma arquitetura é universalmente superior, mas identificar **quais características estruturais da organização de uma codebase favorecem ou dificultam o trabalho realizado por agentes de IA**.
