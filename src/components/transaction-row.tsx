import { Pressable, StyleSheet, View } from 'react-native';

import type { Transaction } from '@/database/database';
import { formatCurrency, formatDate } from '@/utils/finance';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const INCOME = '#16834A';
const EXPENSE = '#C0393B';

type Props = {
  transaction: Transaction;
  onPress?: () => void;
};

export function TransactionRow({ transaction, onPress }: Props) {
  const theme = useTheme();
  const isIncome = transaction.tipo === 'receita';

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: isIncome ? 'rgba(22, 131, 74, 0.12)' : 'rgba(192, 57, 59, 0.12)' },
        ]}
      >
        <ThemedText style={{ color: isIncome ? INCOME : EXPENSE, fontSize: 18 }}>
          {isIncome ? '↙' : '↗'}
        </ThemedText>
      </View>
      <View style={styles.details}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {transaction.descricao}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {transaction.categoriaNome} · {formatDate(transaction.data)}
        </ThemedText>
      </View>
      <ThemedText
        type="smallBold"
        style={{ color: isIncome ? INCOME : EXPENSE, textAlign: 'right' }}
      >
        {isIncome ? '+' : '−'} {formatCurrency(transaction.valorCentavos)}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    gap: 3,
  },
});
