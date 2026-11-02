# Diretrizes dos agentes

## O que é este repositório

Experimento de TCC: o **mesmo** recorte de carrinho de e-commerce implementado em quatro organizações de código possíveis. Esta branch contém apenas a implementação **Domain-Oriented Modular Monolith** (`domain/`) — contexto → operação → responsabilidade técnica. Contextos atuais: `ordering/` (carrinho e pedidos), `payments/` (pagamentos), `inventory/` (estoque, RF03) e `catalog/` (produtos, RF01/RF02). Funcionalidade, contrato HTTP, modelo de dados e tecnologias são constantes entre as abordagens do experimento original; aqui documentamos somente a variante mantida nesta branch.

Stack: Node.js, TypeScript, Express, TypeORM, PostgreSQL, Redis. Contratos: `test/contracts/cart.md`, `test/contracts/stock.md`, `test/contracts/product.md`, `test/contracts/order.md` e `docs/openapi.yaml`.

Workspace: `domain/`. Testes de integração compartilhados em `test/integration/`.

## Sempre ler e seguir as rules

Antes de alterar código:

1. Ler `/rules.md`.
2. Ler `domain/rules.md`.
3. Se a mudança for estrutural, conferir também `architecture-rules.md`.

Seguir essas regras **fielmente**. Não criar pasta, classe ou wrapper fora do que as rules permitem.

O arquivo `domain/rules.md` deve ser autocontido e tratar a abordagem como um projeto independente. Ele não pode citar caminhos, arquivos ou estruturas do repositório agregador. Regras sobre recursos compartilhados, como `test/integration/`, pertencem somente ao `/rules.md` e a este `AGENTS.md`.

## Pasta = responsabilidade

Todo arquivo deve ter a responsabilidade da pasta em que está. Exemplo obrigatório: em `mocks/`, **toda** função/objeto exportado é mock. `invokeHandler`, helpers HTTP reais e asserts não entram em `mocks/`.

O mesmo vale para `presenters/`, `middleware/`, `utils/`, `prefabs/`, `manager/`, etc.

## Testes

- `authenticate` só nas rotas da API (registrado em cada `router.METHOD` / `app.METHOD`). `/docs` (Swagger) é público.
- Integração (`test/integration/`) funciona para esta abordagem. Sempre sucesso **e** erro. Erro = somente erros lançados pela aplicação (nome da classe + status do contrato), nunca falha genérica de infra.
- Em `test/integration/<recurso>/`, cada rota/operação possui seu próprio arquivo `*.test.ts`. Cenários transversais, como autenticação, ficam em arquivo próprio. Não agrupar todas as rotas de um recurso em um único teste.
- Em `test/contracts/`, cada recurso possui seu próprio contrato Markdown. Não misturar o contrato de estoque em `cart.md`; estoque pertence a `stock.md` e catálogo a `product.md`.
- Prefabs em `test/prefabs/` para dados no Postgres de teste. Header `x-api-key` via `test/helpers/` (não via mocks).
- Unitários: **apenas use cases**, com mocks da pasta `test/mocks/`.

## Quando surgir regra não documentada

Durante a interação, se o usuário estabelecer (ou o código/review revelar) uma regra que **ainda não está** em `rules.md` / `domain/rules.md`:

1. Aplicar a regra no código.
2. **Atualizar proativamente** o arquivo de rules correspondente (raiz se for geral; da abordagem se for local).
3. Se a regra for estrutural normativa, espelhar também em `architecture-rules.md`.

Não esperar o usuário pedir para documentar.

## Outras diretrizes

- Campos de status e outros campos com um conjunto limitado de valores devem ser representados por `enum` na aplicação. Usar os membros do enum, sem strings ou números mágicos para esses valores.
- Responder em PT-BR.
- `requireEnv` sem fallback.
- Não commitar a menos que o usuário peça.
- Transação HTTP vive no `RouterBase` + `DbManager`, não no use case.
