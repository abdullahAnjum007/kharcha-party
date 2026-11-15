import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, Field, PrimaryButton, Screen, Title } from '@/components/ui';
import { formatRupees } from '@/data/mockData';
import { useAppState } from '@/state/AppContext';
import { colors, radii, spacing } from '@/theme';

export default function BudgetScreen() {
  const { budgetDecided, setBudgetDecided, individualBudget, setIndividualBudget, members, leader, demoRole } = useAppState();
  const amount = Number(individualBudget.replace(/\D/g, '')) || 0;
  const groupBudget = amount * members.length;
  const isLeader = demoRole === 'leader';

  return (
    <Screen>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>← Wapas</Text></Pressable>
      <View style={styles.heading}>
        <Eyebrow>Ab paisay ki baat</Eyebrow>
        <Title>Budget decided hai?</Title>
        <Text style={styles.subtitle}>Sach sach batana. “Dekh lenge” bhi ek valid financial strategy hai.</Text>
      </View>

      <View style={styles.options}>
        <Pressable onPress={() => setBudgetDecided(true)} style={styles.optionPressable}>
          <Card style={[styles.option, budgetDecided === true && styles.optionSelected]} tone={budgetDecided === true ? 'lime' : 'default'}>
            <Text style={styles.optionEmoji}>✅</Text>
            <Text style={[styles.optionTitle, budgetDecided === true && styles.darkText]}>Haan, decided hai</Text>
            <Text style={[styles.optionText, budgetDecided === true && styles.darkSubtext]}>Responsible log. Nice.</Text>
          </Card>
        </Pressable>
        <Pressable onPress={() => setBudgetDecided(false)} style={styles.optionPressable}>
          <Card style={[styles.option, budgetDecided === false && styles.optionSelected]} tone={budgetDecided === false ? 'purple' : 'default'}>
            <Text style={styles.optionEmoji}>🤷</Text>
            <Text style={[styles.optionTitle, budgetDecided === false && styles.darkText]}>Nahi, dekh lenge</Text>
            <Text style={[styles.optionText, budgetDecided === false && styles.darkSubtext]}>Classic trip planning.</Text>
          </Card>
        </Pressable>
      </View>

      {budgetDecided !== null ? (
        <View style={styles.budgetBlock}>
          <Field label="Har bande ka budget" value={individualBudget} onChangeText={setIndividualBudget} keyboardType="number-pad" placeholder="25000" hint="PKR mein amount — commas hum laga denge." />
          <Card tone="raised" style={styles.previewCard}>
            <View>
              <Text style={styles.previewLabel}>Total group budget</Text>
              <Text style={styles.previewMeta}>{members.length} log × {formatRupees(amount)}</Text>
            </View>
            <Text style={styles.previewAmount}>{formatRupees(groupBudget)}</Text>
          </Card>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{isLeader ? 'Aap leader ho — final call aap ki.' : `${leader} ki approval ka intezar.`}</Text>
          </View>
          <PrimaryButton label={isLeader ? 'Budget lock karo  🔒' : 'Leader ko bhejo  ✈️'} disabled={amount <= 0} onPress={() => router.replace('/home')} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.muted, fontSize: 14, fontWeight: '800', paddingVertical: spacing.sm },
  heading: { marginTop: spacing.xl, gap: spacing.md },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  options: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  optionPressable: { flex: 1 },
  option: { minHeight: 150, padding: spacing.md, borderRadius: radii.medium, borderWidth: 1, borderColor: 'transparent' },
  optionSelected: { borderColor: colors.white },
  optionEmoji: { fontSize: 26, marginBottom: spacing.sm },
  optionTitle: { color: colors.white, fontSize: 16, lineHeight: 20, fontWeight: '900' },
  optionText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 5 },
  darkText: { color: colors.background },
  darkSubtext: { color: '#4E493F' },
  budgetBlock: { gap: spacing.md, marginTop: spacing.sm },
  previewCard: { gap: spacing.md },
  previewLabel: { color: colors.white, fontSize: 15, fontWeight: '900' },
  previewMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  previewAmount: { color: colors.lime, fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange },
  statusText: { color: colors.muted, flex: 1, fontSize: 12, lineHeight: 18 },
});
