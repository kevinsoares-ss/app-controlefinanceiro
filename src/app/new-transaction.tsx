import { StyleSheet, View } from 'react-native';

import { TransactionForm } from '@/components/transaction-form';
import { useTheme } from '@/hooks/use-theme';

export default function NewTransactionScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TransactionForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
