# Regras gerais

Estas regras valem para **todas** as abordagens (`monolith/`, `mvc/`, `clean/`, `domain/`). Regras específicas de cada arquitetura estão em `<abordagem>/rules.md`. O mapa estrutural normativo continua em `architecture-rules.md`.

## Experimento

As quatro codebases implementam o **mesmo** recorte de catálogo, estoque e carrinho: mesmo contrato HTTP, mesmos status, mesmos erros, mesma modelagem e a mesma infra (Node, TypeScript, Express, TypeORM, PostgreSQL, Redis).

A variável do experimento é **só a organização do código**. Não mude comportamento para “melhorar” uma abordagem.

Contratos canônicos: `test/contracts/cart.md`, `test/contracts/stock.md`, `test/contracts/product.md` e `docs/openapi.yaml`.

## Pasta define responsabilidade

O nome da pasta define o que pode existir nela. Todo arquivo exportado deve ter a responsabilidade da pasta em que está.

Exemplos:

- `mocks/` — somente mocks. Nada de helpers, `invokeHandler`, factories de app ou asserts.
- `prefabs/` — somente montagem de dados de teste no banco.
- `presenters/` — somente transformação do modelo no payload HTTP.
- `middleware/` — somente middlewares HTTP.
- `utils/` — somente utilitários técnicos, sem regra de negócio.

Se uma função não for da pasta, ela não entra nessa pasta. Prefira o arquivo de teste, `helpers/`, ou a pasta cuja responsabilidade corresponde.

## Autenticação, auditoria e env

- Header obrigatório `x-api-key` igual a `X_API_KEY` (sem fallback) nas rotas da API. Ausente ou diferente → `ForbiddenError` (403). O middleware `authenticate` é registrado **em cada rota**, não com `app.use` global. `/docs` (Swagger) fica público.
- `audit` loga chamada (método, path, params, query, body) e resposta JSON. Não loga a API key.
- `requireEnv` não tem valor default. Variáveis novas entram em `.env`, `.env.example` e `.env.test`.

## Testes de integração

Ficam em `test/integration/` na raiz e **devem passar nas quatro abordagens** (`APP_TARGET=monolith|mvc|clean|domain`).

- Os projetos de cada abordagem devem ser tratados como independentes e não devem conhecer nem citar caminhos, arquivos ou estruturas do repositório agregador.
- A localização compartilhada dos testes de integração é uma regra exclusiva deste repositório agregador; ela não deve aparecer em `<abordagem>/rules.md`.
- No monólito, a pasta `monolith/test/` contém somente testes unitários. Testes de controller/handler HTTP, testes com `createApp` ou `supertest` e testes end-to-end não pertencem a essa pasta.

- Sempre cobrir caminho de sucesso **e** caminho de erro.
- Dentro de `test/integration/<recurso>/`, cada rota/operação deve ter um arquivo `*.test.ts` próprio, seguindo o padrão de `test/integration/cart/`. Casos transversais, como autenticação, ficam em arquivo separado. Não concentrar todas as rotas do recurso em um único arquivo.
- Casos de erro testam **apenas** erros lançados pela aplicação (`CartNotFoundError`, `InvalidQuantityError`, `ForbiddenError`, etc.), com o `error`, `message` e `statusCode` do contrato.
- Não testar timeouts de rede, SQL cru, stack de framework, nem mensagens genéricas que a aplicação não emite.
- Dados de persistência via `test/prefabs/`. HTTP autenticado via `test/helpers/api.ts` (não via `mocks/`).
- Novo endpoint, status ou classe de erro no contrato → novo teste de integração compartilhado.

## Contratos HTTP

- Cada recurso possui seu próprio arquivo Markdown em `test/contracts/`.
- Rotas de carrinho pertencem a `test/contracts/cart.md`.
- Rotas de estoque pertencem a `test/contracts/stock.md`.
- Rotas de catálogo pertencem a `test/contracts/product.md`.
- Não misturar contratos de recursos diferentes no mesmo arquivo.

## Testes unitários

- Clean e Domain: unitários **somente de use cases** (`run`), com ports/repositórios mockados.
- MVC: unitários dos handlers de rota, com models mockados. `invokeHandler` vive no arquivo de teste, não em `mocks/`.
- Monólito: unitários das rotas, com TypeORM mockado.
- Mocks em `test/mocks/` de cada abordagem: só funções/objetos mock.

## O que não fazer

- Não criar pasta, wrapper ou padrão só para evitar poucas linhas duplicadas.
- Não introduzir tecnologia diferente numa abordagem (outro ORM, outro HTTP framework, etc.).
- Não copiar estrutura de outra abordagem (ex.: `usecases/` no MVC, `src/controllers/` global no Domain).
- Não enfraquecer `requireEnv` com fallback.
