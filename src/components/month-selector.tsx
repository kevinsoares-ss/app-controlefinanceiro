import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

type Props = {
  mes: number;
  ano: number;
  onChange: (mes: number, ano: number) => void;
};

export function MonthSelector({ mes, ano, onChange }: Props) {
  const theme = useTheme();

  function changeMonth(amount: number) {
    const next = new Date(ano, mes - 1 + amount, 1);
    onChange(next.getMonth() + 1, next.getFullYear());
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Mês anterior"
        onPress={() => changeMonth(-1)}
        style={[styles.arrow, { backgroundColor: theme.backgroundElement }]}
      >
        <ThemedText style={styles.arrowText}>‹</ThemedText>
      </Pressable>
      <ThemedText type="smallBold">
        {MONTHS[mes - 1]} {ano}
      </ThemedText>
      <Pressable
        accessibilityLabel="Próximo mês"
        onPress={() => changeMonth(1)}
        style={[styles.arrow, { backgroundColor: theme.backgroundElement }]}
      >
        <ThemedText style={styles.arrowText}>›</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 26,
    lineHeight: 30,
  },
});
