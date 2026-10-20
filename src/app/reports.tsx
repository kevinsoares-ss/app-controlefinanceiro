import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MonthSelector } from '@/components/month-selector';
import { ThemedText } from '@/components/themed-text';
import type { CategorySpending, MonthlySummary } from '@/database/database';
import { getCategorySpending, getMonthlySummary } from '@/database/database';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrency, getCurrentMonthAndYear } from '@/utils/finance';

const INCOME = '#16834A';
const EXPENSE = '#C0393B';
const CHART_COLORS = ['#4169C1', '#E59B32', '#8B5CF6', '#16A085', '#D35472', '#567D46'];

export default function ReportsScreen() {
  const theme = useTheme();
  const [period, setPeriod] = useState(getCurrentMonthAndYear);
  const [summary, setSummary] = useState<MonthlySummary>({
    receitasCentavos: 0,
    despesasCentavos: 0,
    saldoCentavos: 0,
  });
  const [spending, setSpending] = useState<CategorySpending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function loadReport() {
        setLoading(true);
        setError(null);
        try {
          const [monthlySummary, categorySpending] = await Promise.all([
            getMonthlySummary(period.mes, period.ano),
            getCategorySpending(period.mes, period.ano),
          ]);
          if (active) {
            setSummary(monthlySummary);
            setSpending(categorySpending);
          }
        } catch (loadError) {
          if (active) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o relatório.');
          }
        } finally {
          if (active) setLoading(false);
        }
      }
      loadReport();
      return () => {
        active = false;
      };
    }, [period])
  );

  const totalSpent = summary.despesasCentavos;

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>Relatórios</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Acompanhe receitas e despesas por período.
          </ThemedText>
        </View>

        <MonthSelector
          mes={period.mes}
          ano={period.ano}
          onChange={(mes, ano) => setPeriod({ mes, ano })}
        />

        {loading ? (
          <ActivityIndicator style={styles.loading} />
        ) : error ? (
          <ThemedText style={styles.error}>{error}</ThemedText>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">Recebido</ThemedText>
                <ThemedText style={[styles.summaryValue, { color: INCOME }]}>
                  {formatCurrency(summary.receitasCentavos)}
                </ThemedText>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small" themeColor="textSecondary">Gasto</ThemedText>
                <ThemedText style={[styles.summaryValue, { color: EXPENSE }]}>
                  {formatCurrency(summary.despesasCentavos)}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.balance, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">Resultado do mês</ThemedText>
              <ThemedText style={[styles.balanceValue, { color: summary.saldoCentavos >= 0 ? INCOME : EXPENSE }]}>
                {formatCurrency(summary.saldoCentavos)}
              </ThemedText>
            </View>

            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>Despesas por categoria</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatCurrency(totalSpent)}
              </ThemedText>
            </View>

            {totalSpent > 0 && spending.length > 0 && (
              <View style={[styles.stackedBar, { backgroundColor: theme.backgroundSelected }]}>
                {spending.map((item, index) => (
                  <View
                    key={item.categoriaId}
                    style={{
                      flex: item.valorCentavos,
                      height: 12,
                      backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                ))}
              </View>
            )}

            <View style={[styles.categoryList, { backgroundColor: theme.backgroundElement }]}>
              {spending.length ? spending.map((item, index) => {
                const percent = totalSpent > 0 ? (item.valorCentavos / totalSpent) * 100 : 0;
                return (
                  <View key={item.categoriaId} style={styles.categoryItem}>
                    <View style={styles.categoryTop}>
                      <View style={styles.categoryName}>
                        <View style={[styles.legend, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }]} />
                        <ThemedText type="smallBold" numberOfLines={1} style={styles.categoryLabel}>
                          {item.categoriaNome}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {percent.toFixed(0)}%
                        </ThemedText>
                      </View>
                      <ThemedText type="smallBold">{formatCurrency(item.valorCentavos)}</ThemedText>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
                      <View
                        style={[
                          styles.progress,
                          {
                            width: `${percent}%`,
                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              }) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                  Ainda não há despesas registradas neste mês.
                </ThemedText>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 36, gap: 20 },
  header: { gap: 6 },
  title: { fontSize: 28, lineHeight: 34 },
  loading: { marginTop: 60 },
  error: { color: EXPENSE },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, minHeight: 94, justifyContent: 'center', padding: 15, gap: 8, borderRadius: 18 },
  summaryValue: { fontSize: 18, lineHeight: 23, fontWeight: '800' },
  balance: { padding: 18, borderRadius: 18, gap: 6 },
  balanceValue: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  sectionTitle: { fontSize: 18 },
  stackedBar: { flexDirection: 'row', overflow: 'hidden', height: 12, borderRadius: 8 },
  categoryList: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4 },
  categoryItem: { paddingVertical: 15, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(127, 127, 127, 0.25)' },
  categoryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  categoryName: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryLabel: { flexShrink: 1 },
  legend: { width: 10, height: 10, borderRadius: 5 },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progress: { height: '100%', borderRadius: 4 },
  empty: { textAlign: 'center', paddingVertical: 24 },
});
