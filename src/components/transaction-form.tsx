import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { Category, NewTransaction, TransactionType } from '@/database/database';
import {
  createTransaction,
  deleteTransaction,
  getCategories,
  getTransactionById,
  updateTransaction,
} from '@/database/database';
import { useTheme } from '@/hooks/use-theme';
import { formatCurrencyInput, getTodayDate } from '@/utils/finance';

const INCOME = '#16834A';
const EXPENSE = '#C0393B';

export function TransactionForm() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const editing = Boolean(id);
  const theme = useTheme();

  const [tipo, setTipo] = useState<TransactionType>('despesa');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [data, setData] = useState(getTodayDate());
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filteredCategories = useMemo(
    () => categorias.filter((category) => category.tipo === tipo),
    [categorias, tipo]
  );

  useEffect(() => {
    let active = true;

    async function loadForm() {
      try {
        const loadedCategories = await getCategories();
        if (!active) return;
        setCategorias(loadedCategories);

        if (id) {
          const transaction = await getTransactionById(Number(id));
          if (!active) return;
          if (!transaction) {
            setError('Movimentação não encontrada.');
          } else {
            setTipo(transaction.tipo);
            setValor(String(transaction.valorCentavos));
            setDescricao(transaction.descricao);
            setCategoriaId(transaction.categoriaId);
            setData(transaction.data);
          }
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os dados.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadForm();
    return () => {
      active = false;
    };
  }, [id]);

  function changeType(nextType: TransactionType) {
    setTipo(nextType);
    setCategoriaId(null);
  }

  async function saveTransaction() {
    setError(null);
    const valorCentavos = Number(valor);
    if (!descricao.trim()) {
      setError('Informe uma descrição.');
      return;
    }
    if (!Number.isSafeInteger(valorCentavos) || valorCentavos <= 0) {
      setError('Informe um valor maior que zero.');
      return;
    }
    if (!categoriaId) {
      setError('Escolha uma categoria.');
      return;
    }

    const transaction: NewTransaction = {
      categoriaId,
      descricao: descricao.trim(),
      valorCentavos,
      tipo,
      data,
    };

    setSaving(true);
    try {
      if (id) {
        await updateTransaction(Number(id), transaction);
      } else {
        await createTransaction(transaction);
      }
      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Não foi possível salvar a movimentação.');
    } finally {
      setSaving(false);
    }
  }

  async function removeTransaction() {
    if (!id) return;
    setSaving(true);
    try {
      await deleteTransaction(Number(id));
      setConfirmDelete(false);
      router.back();
    } catch (deleteError) {
      setConfirmDelete(false);
      setError(deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir a movimentação.');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundElement,
      borderColor: theme.backgroundSelected,
      color: theme.text,
    },
  ];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Pressable accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.back}>
            <ThemedText style={styles.backText}>‹</ThemedText>
          </Pressable>
          <ThemedText type="subtitle" style={styles.title}>
            {editing ? 'Editar movimentação' : 'Nova movimentação'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Preencha os dados para registrar no seu controle financeiro.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Tipo</ThemedText>
          <View style={[styles.toggle, { backgroundColor: theme.backgroundElement }]}>
            {(['despesa', 'receita'] as const).map((option) => {
              const selected = tipo === option;
              const color = option === 'receita' ? INCOME : EXPENSE;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => changeType(option)}
                  style={[
                    styles.toggleOption,
                    selected && { backgroundColor: theme.background, borderColor: color },
                  ]}
                >
                  <ThemedText style={{ color: selected ? color : theme.textSecondary, fontWeight: '700' }}>
                    {option === 'receita' ? 'Receita' : 'Despesa'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Valor</ThemedText>
          <TextInput
            accessibilityLabel="Valor em reais"
            keyboardType="number-pad"
            onChangeText={(text) => setValor(text.replace(/\D/g, '').slice(0, 12))}
            placeholder="R$ 0,00"
            placeholderTextColor={theme.textSecondary}
            style={[inputStyle, styles.amountInput]}
            value={formatCurrencyInput(valor)}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Descrição</ThemedText>
          <TextInput
            accessibilityLabel="Descrição da movimentação"
            onChangeText={setDescricao}
            placeholder="Ex.: Supermercado"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
            value={descricao}
            maxLength={120}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Categoria</ThemedText>
          <View style={styles.chips}>
            {filteredCategories.map((category) => {
              const selected = categoriaId === category.id;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setCategoriaId(category.id)}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: selected ? (tipo === 'receita' ? 'rgba(22, 131, 74, 0.13)' : 'rgba(192, 57, 59, 0.13)') : theme.backgroundElement,
                      borderColor: selected ? (tipo === 'receita' ? INCOME : EXPENSE) : theme.backgroundSelected,
                    },
                  ]}
                >
                  <ThemedText type="small">{category.nome}</ThemedText>
                </Pressable>
              );
            })}
          </View>
          {filteredCategories.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              Nenhuma categoria disponível para este tipo.
            </ThemedText>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="smallBold">Data</ThemedText>
          <TextInput
            accessibilityLabel="Data no formato ano-mês-dia"
            onChangeText={setData}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
            value={data}
            maxLength={10}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Formato: ano-mês-dia
          </ThemedText>
        </View>

        {error && (
          <ThemedText accessibilityRole="alert" style={styles.error}>
            {error}
          </ThemedText>
        )}

        <Pressable
          disabled={saving}
          onPress={saveTransaction}
          style={[styles.primaryButton, { backgroundColor: tipo === 'receita' ? INCOME : EXPENSE }]}
        >
          {saving ? <ActivityIndicator color="#FFFFFF" /> : (
            <ThemedText style={styles.primaryButtonText}>Salvar movimentação</ThemedText>
          )}
        </Pressable>

        {editing && (
          <Pressable disabled={saving} onPress={() => setConfirmDelete(true)} style={styles.deleteButton}>
            <ThemedText style={styles.deleteText}>Excluir movimentação</ThemedText>
          </Pressable>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setConfirmDelete(false)}
        transparent
        visible={confirmDelete}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.background }]}>
            <ThemedText type="smallBold">Excluir movimentação?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Esta ação não pode ser desfeita.
            </ThemedText>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setConfirmDelete(false)} style={styles.modalButton}>
                <ThemedText type="smallBold">Cancelar</ThemedText>
              </Pressable>
              <Pressable
                disabled={saving}
                onPress={removeTransaction}
                style={[styles.modalButton, styles.confirmButton]}
              >
                <ThemedText style={styles.primaryButtonText}>Excluir</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: 20,
    paddingBottom: 40,
    gap: 22,
  },
  header: { gap: 10 },
  back: { width: 40, height: 36, justifyContent: 'center' },
  backText: { fontSize: 30, lineHeight: 34 },
  title: { fontSize: 28, lineHeight: 34 },
  section: { gap: 10 },
  toggle: { flexDirection: 'row', borderRadius: 14, padding: 4 },
  toggleOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  amountInput: { minHeight: 72, fontSize: 32, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  error: { color: '#C0393B', fontWeight: '600' },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  deleteButton: { alignItems: 'center', padding: 12 },
  deleteText: { color: '#C0393B', fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalCard: { width: '100%', maxWidth: 400, borderRadius: 20, padding: 22, gap: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  modalButton: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12 },
  confirmButton: { backgroundColor: '#C0393B' },
});
