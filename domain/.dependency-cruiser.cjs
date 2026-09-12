/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-other-apps',
      comment: 'Each architecture must remain an independent codebase',
      severity: 'error',
      from: {},
      to: { path: '(^|/)(monolith|mvc|clean)(/|$)' },
    },
    {
      name: 'no-global-technical-layers',
      comment:
        'Domain-oriented code cannot have global controllers/usecases/repositories/entities/presenters/base',
      severity: 'error',
      from: {},
      to: {
        path: '^src/(controllers|usecases|repositories|entities|errors|routes|presenters|base)(/|$)',
      },
    },
    {
      name: 'no-ports-or-context-infrastructure',
      comment: 'Contexts cannot have ports/ or infrastructure/; persistence lives in repositories/',
      severity: 'error',
      from: {},
      to: {
        path: '^src/ordering/(ports|infrastructure|http|routes)(/|$)',
      },
    },
    {
      name: 'no-shared-extras',
      comment: 'shared/ may only contain database, entities, presenters, base, messaging and integrations',
      severity: 'error',
      from: {},
      to: { path: '^src/shared/(http|errors|redis|services|env)(/|$)' },
    },
    {
      name: 'no-context-presenters',
      comment: 'Presenters live in shared/presenters, not inside a bounded context',
      severity: 'error',
      from: {},
      to: { path: '^src/ordering/presenters(/|$)' },
    },
    {
      name: 'no-catalog-context',
      comment: 'This slice only implements cart/ordering; catalog is not a context',
      severity: 'error',
      from: {},
      to: { path: '^src/catalog(/|$)' },
    },
    {
      name: 'entities-no-express',
      comment: 'Entities cannot import Express',
      severity: 'error',
      from: { path: '^src/.*/entities' },
      to: { path: 'express' },
    },
    {
      name: 'entities-no-typeorm',
      comment: 'Domain entities cannot import TypeORM; persistence records live in shared/database',
      severity: 'error',
      from: { path: '^src/.*/entities' },
      to: { path: 'typeorm' },
    },
    {
      name: 'usecases-no-express',
      comment: 'Use cases cannot import Express',
      severity: 'error',
      from: { path: '^src/.*/usecases' },
      to: { path: 'express' },
    },
    {
      name: 'usecases-no-typeorm',
      comment: 'Use cases cannot import TypeORM',
      severity: 'error',
      from: { path: '^src/.*/usecases' },
      to: { path: 'typeorm' },
    },
    {
      name: 'usecases-no-router-base',
      comment: 'Use cases cannot import RouterBase; transactions live on the router',
      severity: 'error',
      from: { path: '^src/.*/usecases' },
      to: { path: 'router\\.base' },
    },
    {
      name: 'usecases-no-manager',
      comment: 'Use cases cannot import DbManager; persistence transactions are started by the router',
      severity: 'error',
      from: { path: '^src/.*/usecases' },
      to: { path: '^src/manager' },
    },
    {
      name: 'usecases-no-persistence-records',
      comment: 'Use cases cannot import TypeORM records or concrete persistence',
      severity: 'error',
      from: { path: '^src/.*/usecases' },
      to: { path: '(Record|shared/database)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
