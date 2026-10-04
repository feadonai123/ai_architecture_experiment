# Diretrizes do agente

## O que é este repositório

Experimento de TCC: o **mesmo** recorte de carrinho de e-commerce implementado em quatro organizações de código. Funcionalidade, contrato HTTP, modelo de dados e tecnologias são constantes. A variável é **como as responsabilidades são organizadas**.

Stack comum: Node.js, TypeScript, Express, TypeORM, PostgreSQL, Redis. Contratos: `test/contracts/cart.md`, `test/contracts/stock.md`, `test/contracts/product.md` e `docs/openapi.yaml`.

Workspaces: `monolith/`, `mvc/`, `clean/`, `domain/`. Testes de integração compartilhados em `test/integration/`.

## As quatro abordagens

- **Monólito acoplado** (`monolith/`) — organização mínima. Rotas com regra de negócio e TypeORM no mesmo arquivo.
- **MVC técnico** (`mvc/`) — primeira dimensão por papel técnico (controller, model, entity, presenter).
- **Clean Architecture** (`clean/`) — camadas técnicas + Dependency Rule (use cases → ports; entities sem infra).
- **Domain-Oriented Modular Monolith** (`domain/`) — contexto → operação → responsabilidade técnica. Contextos atuais: `ordering/` (carrinho), `inventory/` (estoque, RF03) e `catalog/` (produtos, RF01/RF02).

## Sempre ler e seguir as rules

Antes de alterar código:

1. Ler `/rules.md` (regras de todas as abordagens).
2. Ler `<abordagem>/rules.md` da pasta em que está trabalhando.
3. Se a mudança for estrutural, conferir também `architecture-rules.md`.

Seguir essas regras **fielmente**. Não “melhorar” uma abordagem copiando estrutura de outra. Não criar pasta, classe ou wrapper fora do que as rules permitem.

Os arquivos `<abordagem>/rules.md` devem ser autocontidos e tratar cada abordagem como um projeto independente. Eles não podem citar caminhos, arquivos ou estruturas do repositório agregador. Regras sobre recursos compartilhados entre as quatro implementações, como `test/integration/`, pertencem somente ao `/rules.md` e a este `AGENT.md`.

## Pasta = responsabilidade

Todo arquivo deve ter a responsabilidade da pasta em que está. Exemplo obrigatório: em `mocks/`, **toda** função/objeto exportado é mock. `invokeHandler`, helpers HTTP reais e asserts não entram em `mocks/`.

O mesmo vale para `presenters/`, `middleware/`, `utils/`, `prefabs/`, `manager/`, etc.

## Testes

- `authenticate` só nas rotas da API (registrado em cada `router.METHOD` / `app.METHOD`). `/docs` (Swagger) é público.
- Integração (`test/integration/`) funciona para **as quatro** abordagens. Sempre sucesso **e** erro. Erro = somente erros lançados pela aplicação (nome da classe + status do contrato), nunca falha genérica de infra.
- Em `test/integration/<recurso>/`, cada rota/operação possui seu próprio arquivo `*.test.ts`. Cenários transversais, como autenticação, ficam em arquivo próprio. Não agrupar todas as rotas de um recurso em um único teste.
- Em `test/contracts/`, cada recurso possui seu próprio contrato Markdown. Não misturar o contrato de estoque em `cart.md`; estoque pertence a `stock.md` e catálogo a `product.md`.
- `monolith/test/` contém exclusivamente testes unitários das funções de negócio das rotas. Não recebe testes de controller/handler HTTP, testes com `createApp` ou `supertest`, nem testes end-to-end.
- Prefabs em `test/prefabs/` para dados no Postgres de teste. Header `x-api-key` via `test/helpers/` (não via mocks).
- Unitários Clean/Domain: **apenas use cases**. MVC/monólito: a unidade de negócio daquela abordagem (handler/rota), com mocks da pasta `test/mocks/`.

## Quando surgir regra não documentada

Durante a interação, se o usuário estabelecer (ou o código/review revelar) uma regra que **ainda não está** em `rules.md` / `<abordagem>/rules.md`:

1. Aplicar a regra no código.
2. **Atualizar proativamente** o arquivo de rules correspondente (raiz se for geral; da abordagem se for local).
3. Se a regra for estrutural normativa, espelhar também em `architecture-rules.md`.

Não esperar o usuário pedir para documentar.

## Outras diretrizes

- Responder em PT-BR.
- `requireEnv` sem fallback.
- Não commitar a menos que o usuário peça.
- Equivalência funcional: mesmo endpoint, payload, status e erro nas quatro apps.
- Transação HTTP (Clean/Domain) vive no `RouterBase` + `DbManager`, não no use case.
