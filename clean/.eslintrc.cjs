module.exports = {
  root: true,
  extends: ['../.eslintrc.cjs'],
  overrides: [
    {
      files: ['src/entities/**/*.ts', 'src/usecases/**/*.ts'],
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
                group: [
                  '**/infrastructure/**',
                  '**/infrastructure',
                  '**/repositories/**',
                  '**/manager/**',
                ],
                message: 'Domain/application layers cannot import infrastructure, repositories or manager.',
              },
            ],
          },
        ],
      },
    },
  ],
};
