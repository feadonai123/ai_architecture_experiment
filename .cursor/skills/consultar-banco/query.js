"use strict";

const fs = require("fs");
const path = require("path");

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;
const STATEMENT_TIMEOUT_MS = 15000;
const TRANSACTION_TIMEOUT_MS = 20000;

const ALLOWED_START =
  /^(WITH|SELECT|VALUES|TABLE|EXPLAIN)\b/i;

const FORBIDDEN_KEYWORDS = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "MERGE",
  "UPSERT",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "GRANT",
  "REVOKE",
  "COPY",
  "CALL",
  "DO",
  "SET",
  "LOCK",
  "VACUUM",
  "REFRESH",
  "LISTEN",
  "NOTIFY",
  "EXECUTE",
  "PREPARE",
  "DEALLOCATE",
  "DISCARD",
  "REINDEX",
  "CLUSTER",
  "COMMENT",
  "INTO",
  "IMPORT",
  "EXPORT",
  "LOAD",
  "UNLOAD",
  "REPLACE",
  "RENAME",
  "ATTACH",
  "DETACH",
  "SECURITY",
  "OWNER",
  "ANALYZE",
  "COMMIT",
  "ROLLBACK",
  "BEGIN",
  "SAVEPOINT",
  "RELEASE",
];

const FORBIDDEN_TOKEN_RE = new RegExp(
  `\\b(?:${FORBIDDEN_KEYWORDS.join("|")})\\b`,
  "i",
);

const FOR_UPDATE_RE =
  /\bFOR\s+(UPDATE|SHARE|NO\s+KEY\s+UPDATE|KEY\s+SHARE)\b/i;

function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    const hasCompose = fs.existsSync(path.join(dir, "docker-compose.yml"));
    const hasPackage = fs.existsSync(path.join(dir, "package.json"));
    if (hasCompose && hasPackage) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return process.cwd();
    }
    dir = parent;
  }
}

function scanSql(sql) {
  let i = 0;
  const n = sql.length;
  let code = "";
  let comments = "";

  const unterminated = (what) => {
    throw new Error(`SQL inválido: ${what} sem fechamento`);
  };

  while (i < n) {
    const c = sql[i];
    const next = i + 1 < n ? sql[i + 1] : "";

    if (c === "-" && next === "-") {
      i += 2;
      while (i < n && sql[i] !== "\n") {
        comments += sql[i];
        i += 1;
      }
      comments += "\n";
      code += " ";
      continue;
    }

    if (c === "/" && next === "*") {
      i += 2;
      let closed = false;
      while (i < n) {
        if (sql[i] === "*" && i + 1 < n && sql[i + 1] === "/") {
          i += 2;
          closed = true;
          break;
        }
        comments += sql[i];
        i += 1;
      }
      if (!closed) unterminated("comentário /* */");
      comments += "\n";
      code += " ";
      continue;
    }

    if (c === "'") {
      i += 1;
      let closed = false;
      while (i < n) {
        if (sql[i] === "'" && i + 1 < n && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i += 1;
          closed = true;
          break;
        }
        i += 1;
      }
      if (!closed) unterminated("string");
      code += " '' ";
      continue;
    }

    if (c === "$") {
      const match = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        const tag = match[0];
        const end = sql.indexOf(tag, i + tag.length);
        if (end === -1) unterminated("dollar-quote");
        i = end + tag.length;
        code += " '' ";
        continue;
      }
    }

    if (c === '"') {
      i += 1;
      let closed = false;
      while (i < n) {
        if (sql[i] === '"' && i + 1 < n && sql[i + 1] === '"') {
          i += 2;
          continue;
        }
        if (sql[i] === '"') {
          i += 1;
          closed = true;
          break;
        }
        i += 1;
      }
      if (!closed) unterminated("identificador");
      code += ' "id" ';
      continue;
    }

    code += c;
    i += 1;
  }

  return { code, comments };
}

function splitStatements(code) {
  return code
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function assertNoForbiddenTokens(text, where) {
  const match = text.match(FORBIDDEN_TOKEN_RE);
  if (match) {
    throw new Error(
      `Comando recusado (${where}): token de escrita "${match[0]}"`,
    );
  }
  if (FOR_UPDATE_RE.test(text)) {
    throw new Error(`Comando recusado (${where}): FOR UPDATE/SHARE`);
  }
}

function assertReadOnlySql(sql) {
  if (typeof sql !== "string" || sql.trim().length === 0) {
    throw new Error("SQL vazio");
  }

  const { code, comments } = scanSql(sql);
  assertNoForbiddenTokens(comments, "comentário");

  const statements = splitStatements(code);
  if (statements.length === 0) {
    throw new Error("SQL vazio");
  }
  if (statements.length > 1) {
    throw new Error(
      "Comando recusado: apenas um statement de leitura é permitido",
    );
  }

  const statement = statements[0].replace(/\s+/g, " ").trim();
  if (!ALLOWED_START.test(statement)) {
    throw new Error(
      "Comando recusado: permitido apenas SELECT, WITH, VALUES, TABLE ou EXPLAIN (sem ANALYZE)",
    );
  }

  assertNoForbiddenTokens(statement, "SQL");
  return statement;
}

function parseLimit(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`--limit inválido: ${value}`);
  }
  return Math.min(n, MAX_LIMIT);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    selfTest: false,
    limit: DEFAULT_LIMIT,
    file: null,
    sql: null,
    help: false,
  };

  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--self-test") {
      result.selfTest = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      result.help = true;
      continue;
    }
    if (arg === "--limit") {
      result.limit = parseLimit(args[i + 1]);
      i += 1;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      result.limit = parseLimit(arg.slice("--limit=".length));
      continue;
    }
    if (arg === "--file") {
      result.file = args[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("--file=")) {
      result.file = arg.slice("--file=".length);
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Flag desconhecida: ${arg}`);
    }
    positional.push(arg);
  }

  if (positional.length > 0) {
    result.sql = positional.join(" ");
  }

  return result;
}

function printHelp() {
  process.stdout.write(`Uso:
  node query.js "SELECT ... LIMIT 20"
  node query.js --file query.sql
  echo "SELECT 1" | node query.js
  node query.js --self-test

Flags:
  --limit N     máximo de linhas no JSON (padrão ${DEFAULT_LIMIT}, máx ${MAX_LIMIT})
  --file PATH   lê o SQL de um arquivo
  --self-test   valida o parser sem conectar no banco
`);
}

function jsonReplacer(_key, value) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (
    value &&
    typeof value === "object" &&
    typeof value.toJSON !== "function" &&
    typeof value.toString === "function" &&
    value.constructor &&
    value.constructor.name === "Decimal"
  ) {
    return value.toString();
  }
  return value;
}

function runSelfTest() {
  const allow = [
    "SELECT 1",
    'SELECT "numero", "empresaId" FROM pneu WHERE "deletedAt" IS NULL LIMIT 20',
    "SELECT count(*) FROM empresa",
    "WITH t AS (SELECT 1 AS x) SELECT * FROM t",
    "VALUES (1), (2)",
    'TABLE "tipoPneu"',
    "EXPLAIN SELECT 1",
    "EXPLAIN (FORMAT JSON) SELECT 1",
    "SELECT 'INSERT INTO pneu' AS txt",
    'SELECT "id" FROM usuario WHERE nome = $$DELETE$$',
  ];

  const deny = [
    "INSERT INTO pneu (numero) VALUES ('x')",
    "UPDATE pneu SET numero = 'x'",
    "DELETE FROM pneu",
    "DROP TABLE pneu",
    "SELECT 1; DROP TABLE x",
    "WITH t AS (DELETE FROM pneu RETURNING *) SELECT * FROM t",
    "EXPLAIN ANALYZE UPDATE pneu SET numero = 'x'",
    "SELECT 1 /* INSERT INTO pneu VALUES (1) */",
    "SELECT 1 -- DROP TABLE pneu",
    "SELECT * FROM pneu FOR UPDATE",
    "CREATE TABLE x (id int)",
    "SELECT * INTO tmp FROM pneu",
    "TRUNCATE pneu",
    "ALTER TABLE pneu ADD COLUMN x int",
    "SET statement_timeout = 0",
    "",
  ];

  let failed = 0;

  for (const sql of allow) {
    try {
      assertReadOnlySql(sql);
    } catch (error) {
      process.stderr.write(`FAIL allow: ${JSON.stringify(sql)}\n  ${error.message}\n`);
      failed += 1;
    }
  }

  for (const sql of deny) {
    try {
      assertReadOnlySql(sql);
      process.stderr.write(`FAIL deny (deveria recusar): ${JSON.stringify(sql)}\n`);
      failed += 1;
    } catch {
      // esperado
    }
  }

  if (failed > 0) {
    process.stderr.write(`self-test: ${failed} falha(s)\n`);
    process.exit(1);
  }

  process.stdout.write("self-test: ok\n");
}

function readStdinSync() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function runQuery(sql, limit) {
  const repoRoot = findRepoRoot(__dirname);
  require("dotenv").config({ path: path.join(repoRoot, ".env") });

  const { Client } = require("pg");
  const client = new Client({
    host: requireEnv("POSTGRES_HOST"),
    port: Number(requireEnv("POSTGRES_PORT")),
    user: requireEnv("POSTGRES_USER"),
    password: requireEnv("POSTGRES_PASSWORD"),
    database: requireEnv("POSTGRES_DB"),
  });

  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
    const result = await client.query(sql);
    await client.query("COMMIT");

    const rows = Array.isArray(result.rows) ? result.rows : [result.rows];
    const truncated = rows.length > limit;
    const payload = {
      rowCount: Math.min(rows.length, limit),
      truncated,
      rows: rows.slice(0, limit),
    };
    process.stdout.write(`${JSON.stringify(payload, jsonReplacer, 2)}\n`);
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    printHelp();
    return;
  }

  if (options.selfTest) {
    runSelfTest();
    return;
  }

  let sql = options.sql;
  if (options.file) {
    sql = fs.readFileSync(options.file, "utf8");
  } else if (!sql && !process.stdin.isTTY) {
    sql = readStdinSync();
  }

  if (!sql || !sql.trim()) {
    printHelp();
    throw new Error("Informe um SQL (argumento, --file ou stdin)");
  }

  assertReadOnlySql(sql);
  await runQuery(sql.trim(), options.limit);
}

module.exports = {
  assertReadOnlySql,
  parseArgs,
  scanSql,
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
