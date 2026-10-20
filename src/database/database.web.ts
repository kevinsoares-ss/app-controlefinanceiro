import type {
  Category,
  CategorySpending,
  MonthlySummary,
  NewTransaction,
  Transaction,
  TransactionFilters,
  TransactionType,
} from './database';

interface WebDatabaseState {
  categories: Category[];
  transactions: Transaction[];
  nextCategoryId: number;
  nextTransactionId: number;
}

const STORAGE_KEY = 'meudinheiro.web.database.v1';
const TRANSACTION_TYPES: TransactionType[] = ['receita', 'despesa'];
const INITIAL_CATEGORIES: Omit<Category, 'id'>[] = [
  { nome: 'Salário', tipo: 'receita' },
  { nome: 'Freelance', tipo: 'receita' },
  { nome: 'Investimentos', tipo: 'receita' },
  { nome: 'Outros', tipo: 'receita' },
  { nome: 'Alimentação', tipo: 'despesa' },
  { nome: 'Transporte', tipo: 'despesa' },
  { nome: 'Moradia', tipo: 'despesa' },
  { nome: 'Saúde', tipo: 'despesa' },
  { nome: 'Educação', tipo: 'despesa' },
  { nome: 'Lazer', tipo: 'despesa' },
  { nome: 'Outros', tipo: 'despesa' },
];

let state: WebDatabaseState | undefined;

export async function getDatabase(): Promise<never> {
  throw new Error('A conexão SQL direta não está disponível na web. Use as funções de dados do aplicativo.');
}

export async function getCategories(tipo?: TransactionType): Promise<Category[]> {
  assertTransactionType(tipo);
  const database = loadState();
  return database.categories
    .filter((category) => tipo === undefined || category.tipo === tipo)
    .sort((left, right) => left.tipo.localeCompare(right.tipo) || left.nome.localeCompare(right.nome));
}

export async function getTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  const { search, tipo, categoriaId, mes, ano, limit } = filters;
  assertTransactionType(tipo);
  if (search !== undefined && typeof search !== 'string') {
    throw new Error('A busca deve ser um texto.');
  }
  if (categoriaId !== undefined) assertPositiveInteger(categoriaId, 'categoriaId');
  if (limit !== undefined) assertPositiveInteger(limit, 'limit');
  if (mes !== undefined || ano !== undefined) {
    if (mes === undefined || ano === undefined) {
      throw new Error('Informe mês e ano juntos para filtrar as transações.');
    }
    assertMonthAndYear(mes, ano);
  }

  const database = loadState();
  const categoryNames = new Map(database.categories.map((category) => [category.id, category.nome]));
  let transactions = database.transactions.filter((transaction) => {
    if (search?.trim() && !transaction.descricao.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) {
      return false;
    }
    if (tipo !== undefined && transaction.tipo !== tipo) return false;
    if (categoriaId !== undefined && transaction.categoriaId !== categoriaId) return false;
    if (
      mes !== undefined &&
      ano !== undefined &&
      !transaction.data.startsWith(`${ano}-${String(mes).padStart(2, '0')}-`)
    ) {
      return false;
    }
    return true;
  });

  transactions = transactions
    .map((transaction) => ({
      ...transaction,
      categoriaNome: categoryNames.get(transaction.categoriaId) ?? '',
    }))
    .sort((left, right) => right.data.localeCompare(left.data) || right.id - left.id);

  return limit === undefined ? transactions : transactions.slice(0, limit);
}

export async function getTransactionById(id: number): Promise<Transaction | null> {
  assertPositiveInteger(id, 'id');
  const database = loadState();
  const transaction = database.transactions.find((item) => item.id === id);
  if (!transaction) return null;

  const category = database.categories.find((item) => item.id === transaction.categoriaId);
  return { ...transaction, categoriaNome: category?.nome ?? '' };
}

export async function createTransaction(transaction: NewTransaction): Promise<number> {
  assertTransaction(transaction);
  const current = loadState();
  assertCategoryMatches(current, transaction);

  const id = current.nextTransactionId;
  const now = new Date();
  const next: WebDatabaseState = {
    ...current,
    nextTransactionId: id + 1,
    transactions: [
      ...current.transactions,
      {
        ...transaction,
        descricao: transaction.descricao.trim(),
        id,
        categoriaNome: current.categories.find((item) => item.id === transaction.categoriaId)!.nome,
        criadoEm: now.toISOString().slice(0, 19).replace('T', ' '),
      },
    ],
  };
  saveState(next);
  return id;
}

export async function updateTransaction(id: number, transaction: NewTransaction): Promise<boolean> {
  assertPositiveInteger(id, 'id');
  assertTransaction(transaction);
  const current = loadState();
  assertCategoryMatches(current, transaction);
  const existing = current.transactions.find((item) => item.id === id);
  if (!existing) return false;

  const next: WebDatabaseState = {
    ...current,
    transactions: current.transactions.map((item) =>
      item.id === id
        ? {
            ...item,
            ...transaction,
            descricao: transaction.descricao.trim(),
            categoriaNome: current.categories.find((category) => category.id === transaction.categoriaId)!.nome,
          }
        : item
    ),
  };
  saveState(next);
  return true;
}

export async function deleteTransaction(id: number): Promise<boolean> {
  assertPositiveInteger(id, 'id');
  const current = loadState();
  const transactions = current.transactions.filter((item) => item.id !== id);
  if (transactions.length === current.transactions.length) return false;

  saveState({ ...current, transactions });
  return true;
}

export async function getMonthlySummary(mes: number, ano: number): Promise<MonthlySummary> {
  assertMonthAndYear(mes, ano);
  const prefix = `${ano}-${String(mes).padStart(2, '0')}-`;
  const transactions = loadState().transactions.filter((item) => item.data.startsWith(prefix));
  const receitasCentavos = transactions
    .filter((item) => item.tipo === 'receita')
    .reduce((total, item) => total + item.valorCentavos, 0);
  const despesasCentavos = transactions
    .filter((item) => item.tipo === 'despesa')
    .reduce((total, item) => total + item.valorCentavos, 0);

  return {
    receitasCentavos,
    despesasCentavos,
    saldoCentavos: receitasCentavos - despesasCentavos,
  };
}

export async function getCategorySpending(mes: number, ano: number): Promise<CategorySpending[]> {
  assertMonthAndYear(mes, ano);
  const database = loadState();
  const prefix = `${ano}-${String(mes).padStart(2, '0')}-`;
  const totals = new Map<number, number>();

  for (const transaction of database.transactions) {
    if (transaction.tipo === 'despesa' && transaction.data.startsWith(prefix)) {
      totals.set(
        transaction.categoriaId,
        (totals.get(transaction.categoriaId) ?? 0) + transaction.valorCentavos
      );
    }
  }

  const categoryNames = new Map(database.categories.map((category) => [category.id, category.nome]));
  return [...totals.entries()]
    .map(([categoriaId, valorCentavos]) => ({
      categoriaId,
      categoriaNome: categoryNames.get(categoriaId) ?? '',
      valorCentavos,
    }))
    .sort((left, right) => right.valorCentavos - left.valorCentavos || left.categoriaNome.localeCompare(right.categoriaNome));
}

export async function getOverallBalance(): Promise<number> {
  return loadState().transactions.reduce(
    (balance, transaction) =>
      balance + (transaction.tipo === 'receita' ? transaction.valorCentavos : -transaction.valorCentavos),
    0
  );
}

function loadState(): WebDatabaseState {
  if (state) return state;
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('O armazenamento local do navegador não está disponível neste ambiente.');
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    const initialState: WebDatabaseState = {
      categories: INITIAL_CATEGORIES.map((category, index) => ({ ...category, id: index + 1 })),
      transactions: [],
      nextCategoryId: INITIAL_CATEGORIES.length + 1,
      nextTransactionId: 1,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initialState));
    state = initialState;
    return initialState;
  }

  const parsed: unknown = JSON.parse(stored);
  if (!isWebDatabaseState(parsed)) {
    throw new Error('Os dados financeiros salvos neste navegador estão em formato inválido.');
  }
  state = parsed;
  return parsed;
}

function isWebDatabaseState(value: unknown): value is WebDatabaseState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WebDatabaseState>;
  return (
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.transactions) &&
    Number.isSafeInteger(candidate.nextCategoryId) &&
    Number.isSafeInteger(candidate.nextTransactionId)
  );
}

function saveState(next: WebDatabaseState): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('O armazenamento local do navegador não está disponível neste ambiente.');
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  state = next;
}

function assertTransactionType(tipo?: TransactionType): void {
  if (tipo !== undefined && !TRANSACTION_TYPES.includes(tipo)) {
    throw new Error("O tipo deve ser 'receita' ou 'despesa'.");
  }
}

function assertPositiveInteger(value: number, fieldName: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${fieldName} deve ser um número inteiro positivo.`);
  }
}

function assertMonthAndYear(mes: number, ano: number): void {
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error('O mês deve ser um número entre 1 e 12.');
  }
  if (!Number.isInteger(ano) || ano < 1 || ano > 9999) {
    throw new Error('O ano informado é inválido.');
  }
}

function assertTransaction(transaction: NewTransaction): void {
  if (!transaction || typeof transaction !== 'object') {
    throw new Error('Informe os dados da transação.');
  }
  assertPositiveInteger(transaction.categoriaId, 'categoriaId');
  assertPositiveInteger(transaction.valorCentavos, 'valorCentavos');
  assertTransactionType(transaction.tipo);
  if (typeof transaction.descricao !== 'string' || !transaction.descricao.trim()) {
    throw new Error('A descrição não pode ficar vazia.');
  }
  if (typeof transaction.data !== 'string' || !isValidDate(transaction.data)) {
    throw new Error('A data deve ser uma data válida no formato AAAA-MM-DD.');
  }
}

function assertCategoryMatches(database: WebDatabaseState, transaction: NewTransaction): void {
  const category = database.categories.find((item) => item.id === transaction.categoriaId);
  if (!category || category.tipo !== transaction.tipo) {
    throw new Error('A categoria escolhida não corresponde ao tipo da movimentação.');
  }
}

function isValidDate(value: string): boolean {
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

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
