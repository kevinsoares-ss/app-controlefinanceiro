import * as SQLite from 'expo-sqlite';

let database;
let databasePromise;

const TRANSACTION_TYPES = ['receita', 'despesa'];

export async function getDatabase() {
  if (database) return database;

  if (!databasePromise) {
    databasePromise = initializeDatabase();
  }

  try {
    database = await databasePromise;
    return database;
  } catch (error) {
    databasePromise = undefined;
    throw error;
  }
}

export async function getCategories(tipo) {
  if (tipo !== undefined && !TRANSACTION_TYPES.includes(tipo)) {
    throw new Error("O tipo deve ser 'receita' ou 'despesa'.");
  }

  const db = await getDatabase();
  const query = tipo
    ? 'SELECT id, nome, tipo FROM categorias WHERE tipo = ? ORDER BY nome COLLATE NOCASE'
    : 'SELECT id, nome, tipo FROM categorias ORDER BY tipo, nome COLLATE NOCASE';

  return db.getAllAsync(query, ...(tipo ? [tipo] : []));
}

export async function getTransactions({
  search,
  tipo,
  categoriaId,
  mes,
  ano,
  limit,
} = {}) {
  if (tipo !== undefined && !TRANSACTION_TYPES.includes(tipo)) {
    throw new Error("O tipo deve ser 'receita' ou 'despesa'.");
  }
  if (search !== undefined && typeof search !== 'string') {
    throw new Error('A busca deve ser um texto.');
  }
  if (categoriaId !== undefined) assertPositiveInteger(categoriaId, 'categoriaId');
  if (limit !== undefined) assertPositiveInteger(limit, 'limit');
  if ((mes === undefined) !== (ano === undefined)) {
    throw new Error('Informe mês e ano juntos para filtrar as transações.');
  }
  if (mes !== undefined) assertMonthAndYear(mes, ano);

  const conditions = [];
  const params = [];

  if (search?.trim()) {
    conditions.push("instr(lower(t.descricao), lower(?)) > 0");
    params.push(search.trim());
  }
  if (tipo) {
    conditions.push('t.tipo = ?');
    params.push(tipo);
  }
  if (categoriaId !== undefined) {
    conditions.push('t.categoria_id = ?');
    params.push(categoriaId);
  }
  if (mes !== undefined) {
    conditions.push("strftime('%Y-%m', t.data) = ?");
    params.push(`${ano}-${String(mes).padStart(2, '0')}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = limit === undefined ? '' : 'LIMIT ?';
  if (limit !== undefined) params.push(limit);

  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT
       t.id,
       t.categoria_id AS categoriaId,
       c.nome AS categoriaNome,
       t.descricao,
       t.valor_centavos AS valorCentavos,
       t.tipo,
       t.data,
       t.criado_em AS criadoEm
     FROM transacoes t
     JOIN categorias c ON c.id = t.categoria_id
     ${whereClause}
     ORDER BY t.data DESC, t.id DESC
     ${limitClause}`,
    ...params
  );
}

export async function getTransactionById(id) {
  assertPositiveInteger(id, 'id');
  const db = await getDatabase();
  return db.getFirstAsync(
    `SELECT
       t.id,
       t.categoria_id AS categoriaId,
       c.nome AS categoriaNome,
       t.descricao,
       t.valor_centavos AS valorCentavos,
       t.tipo,
       t.data,
       t.criado_em AS criadoEm
     FROM transacoes t
     JOIN categorias c ON c.id = t.categoria_id
     WHERE t.id = ?`,
    id
  );
}

export async function createTransaction(transaction) {
  assertTransaction(transaction);
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO transacoes (categoria_id, descricao, valor_centavos, tipo, data)
     VALUES (?, ?, ?, ?, ?)`,
    transaction.categoriaId,
    transaction.descricao.trim(),
    transaction.valorCentavos,
    transaction.tipo,
    transaction.data
  );

  return result.lastInsertRowId;
}

export async function updateTransaction(id, transaction) {
  assertPositiveInteger(id, 'id');
  assertTransaction(transaction);
  const db = await getDatabase();
  const result = await db.runAsync(
    `UPDATE transacoes
     SET categoria_id = ?, descricao = ?, valor_centavos = ?, tipo = ?, data = ?
     WHERE id = ?`,
    transaction.categoriaId,
    transaction.descricao.trim(),
    transaction.valorCentavos,
    transaction.tipo,
    transaction.data,
    id
  );

  return result.changes > 0;
}

export async function deleteTransaction(id) {
  assertPositiveInteger(id, 'id');
  const db = await getDatabase();
  const result = await db.runAsync('DELETE FROM transacoes WHERE id = ?', id);

  return result.changes > 0;
}

export async function getMonthlySummary(mes, ano) {
  assertMonthAndYear(mes, ano);
  const db = await getDatabase();
  const summary = await db.getFirstAsync(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor_centavos ELSE 0 END), 0)
         AS receitasCentavos,
       COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor_centavos ELSE 0 END), 0)
         AS despesasCentavos
     FROM transacoes
     WHERE strftime('%Y-%m', data) = ?`,
    `${ano}-${String(mes).padStart(2, '0')}`
  );

  return {
    ...summary,
    saldoCentavos: summary.receitasCentavos - summary.despesasCentavos,
  };
}

export async function getCategorySpending(mes, ano) {
  assertMonthAndYear(mes, ano);
  const db = await getDatabase();
  return db.getAllAsync(
    `SELECT
       c.id AS categoriaId,
       c.nome AS categoriaNome,
       SUM(t.valor_centavos) AS valorCentavos
     FROM transacoes t
     JOIN categorias c ON c.id = t.categoria_id
     WHERE t.tipo = 'despesa'
       AND strftime('%Y-%m', t.data) = ?
     GROUP BY c.id, c.nome
     ORDER BY valorCentavos DESC, c.nome COLLATE NOCASE`,
    `${ano}-${String(mes).padStart(2, '0')}`
  );
}

export async function getOverallBalance() {
  const db = await getDatabase();
  const summary = await db.getFirstAsync(
    `SELECT
       COALESCE(SUM(CASE WHEN tipo = 'receita' THEN valor_centavos ELSE 0 END), 0)
         AS receitasCentavos,
       COALESCE(SUM(CASE WHEN tipo = 'despesa' THEN valor_centavos ELSE 0 END), 0)
         AS despesasCentavos
     FROM transacoes`
  );

  return summary.receitasCentavos - summary.despesasCentavos;
}

async function initializeDatabase() {
  const db = await SQLite.openDatabaseAsync('meudinheiro.db');

  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL COLLATE NOCASE,
      tipo TEXT NOT NULL
        CHECK (tipo IN ('receita', 'despesa')),
      UNIQUE (nome, tipo),
      UNIQUE (id, tipo)
    );

    CREATE TABLE IF NOT EXISTS transacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria_id INTEGER NOT NULL,
      descricao TEXT NOT NULL
        CHECK (length(trim(descricao)) > 0),
      valor_centavos INTEGER NOT NULL
        CHECK (valor_centavos > 0),
      tipo TEXT NOT NULL
        CHECK (tipo IN ('receita', 'despesa')),
      data TEXT NOT NULL
        CHECK (
          length(data) = 10
          AND data GLOB
            '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        ),
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoria_id, tipo)
        REFERENCES categorias (id, tipo)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_transacoes_data
      ON transacoes (data);

    CREATE INDEX IF NOT EXISTS idx_transacoes_categoria
      ON transacoes (categoria_id);
  `);

  await db.execAsync(`
    INSERT OR IGNORE INTO categorias (nome, tipo)
    VALUES
      ('Salário', 'receita'),
      ('Freelance', 'receita'),
      ('Investimentos', 'receita'),
      ('Outros', 'receita'),
      ('Alimentação', 'despesa'),
      ('Transporte', 'despesa'),
      ('Moradia', 'despesa'),
      ('Saúde', 'despesa'),
      ('Educação', 'despesa'),
      ('Lazer', 'despesa'),
      ('Outros', 'despesa');
  `);

  return db;
}

function assertPositiveInteger(value, fieldName) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${fieldName} deve ser um número inteiro positivo.`);
  }
}

function assertMonthAndYear(mes, ano) {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error('O mês deve ser um número entre 1 e 12.');
  }
  if (!Number.isInteger(ano) || ano < 1 || ano > 9999) {
    throw new Error('O ano informado é inválido.');
  }
}

function assertTransaction(transaction) {
  if (!transaction || typeof transaction !== 'object') {
    throw new Error('Informe os dados da transação.');
  }
  assertPositiveInteger(transaction.categoriaId, 'categoriaId');
  assertPositiveInteger(transaction.valorCentavos, 'valorCentavos');
  if (!TRANSACTION_TYPES.includes(transaction.tipo)) {
    throw new Error("O tipo deve ser 'receita' ou 'despesa'.");
  }
  if (typeof transaction.descricao !== 'string' || !transaction.descricao.trim()) {
    throw new Error('A descrição não pode ficar vazia.');
  }
  if (typeof transaction.data !== 'string' || !isValidDate(transaction.data)) {
    throw new Error('A data deve ser uma data válida no formato AAAA-MM-DD.');
  }
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12) return false;

  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day >= 1 && day <= daysInMonth[month - 1];
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
