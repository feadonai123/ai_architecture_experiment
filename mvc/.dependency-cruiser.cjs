/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-other-apps',
      comment: 'Each architecture must remain an independent codebase',
      severity: 'error',
      from: {},
      to: { path: '(^|/)(monolith|clean|domain)(/|$)' },
    },
    {
      name: 'no-forbidden-layers',
      comment:
        'MVC organizes by technical role and cannot have Clean/Domain structures or extra http/',
      severity: 'error',
      from: {},
      to: {
        path: '(^|/)(usecases|repositories|ports|adapters|domain|contexts|bounded-contexts|http)(/|$)',
      },
    },
    {
      name: 'no-src-routes-folder',
      comment: 'MVC registers HTTP routes in controllers/<resource>/, not in a top-level routes/',
      severity: 'error',
      from: {},
      to: { path: '^src/routes(/|$)' },
    },
    {
      name: 'no-database-folder',
      comment: 'MVC uses a single database.ts file, not a database/ folder',
      severity: 'error',
      from: {},
      to: { path: '^src/database(/|$)' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
