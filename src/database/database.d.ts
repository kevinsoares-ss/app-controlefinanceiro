import type { SQLiteDatabase } from 'expo-sqlite';

export type TransactionType = 'receita' | 'despesa';

export interface Category {
  id: number;
  nome: string;
  tipo: TransactionType;
}

export interface Transaction {
  id: number;
  categoriaId: number;
  categoriaNome: string;
  descricao: string;
  valorCentavos: number;
  tipo: TransactionType;
  data: string;
  criadoEm: string;
}

export interface NewTransaction {
  categoriaId: number;
  descricao: string;
  valorCentavos: number;
  tipo: TransactionType;
  data: string;
}

export interface TransactionFilters {
  search?: string;
  tipo?: TransactionType;
  categoriaId?: number;
  mes?: number;
  ano?: number;
  limit?: number;
}

export interface MonthlySummary {
  receitasCentavos: number;
  despesasCentavos: number;
  saldoCentavos: number;
}

export interface CategorySpending {
  categoriaId: number;
  categoriaNome: string;
  valorCentavos: number;
}

export function getDatabase(): Promise<SQLiteDatabase>;
export function getCategories(tipo?: TransactionType): Promise<Category[]>;
export function getTransactions(filters?: TransactionFilters): Promise<Transaction[]>;
export function getTransactionById(id: number): Promise<Transaction | null>;
export function createTransaction(transaction: NewTransaction): Promise<number>;
export function updateTransaction(id: number, transaction: NewTransaction): Promise<boolean>;
export function deleteTransaction(id: number): Promise<boolean>;
export function getMonthlySummary(mes: number, ano: number): Promise<MonthlySummary>;
export function getCategorySpending(mes: number, ano: number): Promise<CategorySpending[]>;
export function getOverallBalance(): Promise<number>;
