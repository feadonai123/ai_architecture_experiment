/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-other-apps',
      comment: 'Each architecture must remain an independent codebase',
      severity: 'error',
      from: {},
      to: { path: '(^|/)(mvc|clean|domain)(/|$)' },
    },
    {
      name: 'no-forbidden-layers',
      comment:
        'Coupled monolith cannot have controllers, usecases, repositories, http, ports',
      severity: 'error',
      from: {},
      to: {
        path: '(^|/)(controllers|usecases|repositories|interfaces|dtos|handlers|factories|ports|http)(/|$)',
      },
    },
    {
      name: 'no-errors-folder',
      comment: 'Monolith errors must live in a single errors.ts file, not an errors/ folder',
      severity: 'error',
      from: {},
      to: { path: '(^|/)errors/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
