import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthSelector } from '@/components/month-selector';
import { ThemedText } from '@/components/themed-text';
import { TransactionRow } from '@/components/transaction-row';
import {
  getMonthlySummary,
  getOverallBalance,
  getTransactions,
} from '@/database/database';
import type { MonthlySummary, Transaction } from '@/database/database';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency, getCurrentMonthAndYear } from '@/utils/finance';

const INCOME = '#16834A';
const EXPENSE = '#C0393B';

export default function HomeScreen() {
  const theme = useTheme();
  const [period, setPeriod] = useState(getCurrentMonthAndYear);
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState<MonthlySummary>({
    receitasCentavos: 0,
    despesasCentavos: 0,
    saldoCentavos: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadDashboard() {
        setLoading(true);
        setError(null);
        try {
          const [overallBalance, monthlySummary, latestTransactions] = await Promise.all([
            getOverallBalance(),
            getMonthlySummary(period.mes, period.ano),
            getTransactions({ mes: period.mes, ano: period.ano, limit: 5 }),
          ]);
          if (active) {
            setBalance(overallBalance);
            setSummary(monthlySummary);
            setTransactions(latestTransactions);
          }
        } catch (loadError) {
          if (active) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o resumo.');
          }
        } finally {
          if (active) setLoading(false);
        }
      }

      loadDashboard();
      return () => {
        active = false;
      };
    }, [period])
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <ThemedText type="small" themeColor="textSecondary">Bem-vindo de volta</ThemedText>
            <ThemedText type="subtitle" style={styles.heading}>Meu Dinheiro</ThemedText>
          </View>
          <MonthSelector
            mes={period.mes}
            ano={period.ano}
            onChange={(mes, ano) => setPeriod({ mes, ano })}
          />
        </View>

        <View style={[styles.balanceCard, { backgroundColor: '#253A70' }]}>
          <ThemedText style={styles.cardLabel}>Saldo geral</ThemedText>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.balanceValue}>{formatCurrency(balance)}</ThemedText>
          )}
          <ThemedText style={styles.cardFootnote}>Receitas menos despesas registradas</ThemedText>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">Receitas do mês</ThemedText>
            <ThemedText style={[styles.summaryValue, { color: INCOME }]}>
              + {formatCurrency(summary.receitasCentavos)}
            </ThemedText>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary">Despesas do mês</ThemedText>
            <ThemedText style={[styles.summaryValue, { color: EXPENSE }]}>
              − {formatCurrency(summary.despesasCentavos)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>Últimas movimentações</ThemedText>
          <Pressable onPress={() => router.push('/history')}>
            <ThemedText style={{ color: '#4169C1', fontWeight: '700' }}>Ver todas</ThemedText>
          </Pressable>
        </View>

        <View style={[styles.transactionsCard, { backgroundColor: theme.backgroundElement }]}>
          {error ? (
            <ThemedText style={styles.error}>{error}</ThemedText>
          ) : transactions.length ? (
            transactions.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                onPress={() => router.push({ pathname: '/new-transaction', params: { id: String(transaction.id) } })}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <ThemedText type="smallBold">Nenhuma movimentação neste mês</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Toque no botão + para adicionar sua primeira.
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      <Pressable
        accessibilityLabel="Adicionar movimentação"
        accessibilityRole="button"
        onPress={() => router.push('/new-transaction')}
        style={styles.fab}
      >
        <ThemedText style={styles.fabText}>+</ThemedText>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, gap: 20, paddingBottom: 110 },
  header: { gap: 16 },
  heading: { fontSize: 28, lineHeight: 34 },
  balanceCard: { minHeight: 158, borderRadius: 24, padding: 22, justifyContent: 'center', gap: 9 },
  cardLabel: { color: '#D8E1FF', fontSize: 14, fontWeight: '600' },
  balanceValue: { color: '#FFFFFF', fontSize: 34, lineHeight: 42, fontWeight: '800' },
  cardFootnote: { color: '#D8E1FF', fontSize: 12 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, minHeight: 94, justifyContent: 'center', padding: 14, gap: 8, borderRadius: 18 },
  summaryValue: { fontSize: 16, lineHeight: 21, fontWeight: '800' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  sectionTitle: { fontSize: 18 },
  transactionsCard: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 30, gap: 6 },
  error: { color: EXPENSE, padding: 14 },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 22,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4169C1',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { fontSize: 34, lineHeight: 40, fontWeight: '400', color: '#FFFFFF' },
});
