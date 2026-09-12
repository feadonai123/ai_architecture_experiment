import fs from 'node:fs';
import path from 'node:path';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse } from 'yaml';

export function mountSwagger(app: Express): void {
  const specPath = path.resolve(__dirname, '../../../docs/openapi.yaml');
  const spec = parse(fs.readFileSync(specPath, 'utf8'));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
}
