import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TransactionRow } from '@/components/transaction-row';
import type { Category, Transaction, TransactionType } from '@/database/database';
import { getCategories, getTransactions } from '@/database/database';
import { useTheme } from '@/hooks/use-theme';

const FILTERS: { label: string; value: TransactionType | null }[] = [
  { label: 'Todas', value: null },
  { label: 'Receitas', value: 'receita' },
  { label: 'Despesas', value: 'despesa' },
];

export default function HistoryScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [tipo, setTipo] = useState<TransactionType | null>(null);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadHistory() {
        setLoading(true);
        setError(null);
        try {
          const [loadedCategories, loadedTransactions] = await Promise.all([
            getCategories(),
            getTransactions({
              search,
              ...(tipo ? { tipo } : {}),
              ...(categoriaId ? { categoriaId } : {}),
            }),
          ]);
          if (active) {
            setCategories(loadedCategories);
            setTransactions(loadedTransactions);
          }
        } catch (loadError) {
          if (active) {
            setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar o histórico.');
          }
        } finally {
          if (active) setLoading(false);
        }
      }

      loadHistory();
      return () => {
        active = false;
      };
    }, [search, tipo, categoriaId])
  );

  const filteredCategories = categories.filter((category) => !tipo || category.tipo === tipo);

  function changeType(nextType: TransactionType | null) {
    setTipo(nextType);
    setCategoriaId(null);
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>Histórico</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Pesquise, filtre e toque em uma movimentação para editar ou excluir.
          </ThemedText>
        </View>

        <TextInput
          accessibilityLabel="Buscar por descrição"
          onChangeText={setSearch}
          placeholder="Buscar descrição..."
          placeholderTextColor={theme.textSecondary}
          returnKeyType="search"
          style={[
            styles.search,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.backgroundSelected,
              color: theme.text,
            },
          ]}
          value={search}
        />

        <View style={styles.filterSection}>
          <ThemedText type="smallBold">Tipo</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTERS.map((filter) => {
              const selected = tipo === filter.value;
              return (
                <Pressable
                  key={filter.label}
                  onPress={() => changeType(filter.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? '#4169C1' : theme.backgroundElement,
                      borderColor: selected ? '#4169C1' : theme.backgroundSelected,
                    },
                  ]}
                >
                  <ThemedText style={{ color: selected ? '#FFFFFF' : theme.text }} type="small">
                    {filter.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <ThemedText type="smallBold">Categoria</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Pressable
              onPress={() => setCategoriaId(null)}
              style={[
                styles.chip,
                {
                  backgroundColor: categoriaId === null ? '#4169C1' : theme.backgroundElement,
                  borderColor: categoriaId === null ? '#4169C1' : theme.backgroundSelected,
                },
              ]}
            >
              <ThemedText type="small" style={{ color: categoriaId === null ? '#FFFFFF' : theme.text }}>
                Todas
              </ThemedText>
            </Pressable>
            {filteredCategories.map((category) => {
              const selected = categoriaId === category.id;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setCategoriaId(category.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? '#4169C1' : theme.backgroundElement,
                      borderColor: selected ? '#4169C1' : theme.backgroundSelected,
                    },
                  ]}
                >
                  <ThemedText type="small" style={{ color: selected ? '#FFFFFF' : theme.text }}>
                    {category.nome}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.resultsHeading}>
          <ThemedText type="smallBold" style={styles.resultsTitle}>Movimentações</ThemedText>
          {!loading && <ThemedText type="small" themeColor="textSecondary">{transactions.length} registros</ThemedText>}
        </View>
        <View style={[styles.list, { backgroundColor: theme.backgroundElement }]}>
          {loading ? (
            <ActivityIndicator style={styles.loading} />
          ) : error ? (
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
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              Nenhuma movimentação encontrada.
            </ThemedText>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 36, gap: 20 },
  header: { gap: 6 },
  title: { fontSize: 28, lineHeight: 34 },
  search: { minHeight: 50, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 16 },
  filterSection: { gap: 10 },
  chips: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  resultsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  resultsTitle: { fontSize: 18 },
  list: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  loading: { paddingVertical: 28 },
  error: { color: '#C0393B', paddingVertical: 18 },
  empty: { textAlign: 'center', paddingVertical: 28 },
});
