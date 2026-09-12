module.exports = {
  root: true,
  extends: ['../.eslintrc.cjs'],
  overrides: [
    {
      files: ['src/shared/entities/**/*.ts', 'src/**/usecases/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              { name: 'express', message: 'Domain/application layers cannot import Express.' },
              { name: 'typeorm', message: 'Domain/application layers cannot import TypeORM.' },
              { name: 'ioredis', message: 'Domain/application layers cannot import Redis.' },
            ],
            patterns: [
              {
                group: ['**/shared/database/**', '**/shared/database', '**/manager/**'],
                message: 'Use cases and entities cannot import persistence records or DbManager.',
              },
            ],
          },
        ],
      },
    },
  ],
};
