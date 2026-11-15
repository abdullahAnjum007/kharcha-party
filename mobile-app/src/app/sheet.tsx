import { StyleSheet, Text, View } from 'react-native';
import { BottomNav, Card, Eyebrow, Screen } from '@/components/ui';
import { expenses, formatRupees } from '@/data/mockData';
import { useAppState } from '@/state/AppContext';
import { colors, radii, spacing } from '@/theme';

export default function SheetScreen() {
  const { demoRole } = useAppState();
  const isLeader = demoRole === 'leader';

  return (
    <View style={styles.root}>
      <Screen>
        <View style={styles.heading}>
          <Eyebrow>Sab kuch, ek jagah</Eyebrow>
          <Text style={styles.title}>Kharcha sheet 📊</Text>
          <Text style={styles.subtitle}>Math boring hai. Clear math sukoon hai.</Text>
        </View>

        <Card tone={isLeader ? 'lime' : 'purple'} style={styles.modeCard}>
          <Text style={styles.modeEmoji}>{isLeader ? '✏️' : '👀'}</Text>
          <View style={styles.modeCopy}>
            <Text style={styles.modeTitle}>{isLeader ? 'Edit mode on hai' : 'Read-only mode'}</Text>
            <Text style={styles.modeText}>{isLeader ? 'Leader rows aur categories edit kar sakta hai.' : 'Aap sab dekh sakte ho. Changes leader karega.'}</Text>
          </View>
        </Card>

        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.personColumn]}>PERSON</Text>
          <Text style={[styles.headerText, styles.categoryColumn]}>CATEGORY</Text>
          <Text style={[styles.headerText, styles.amountColumn]}>AMOUNT</Text>
        </View>

        <Card style={styles.tableCard}>
          {expenses.map((expense, index) => (
            <View key={expense.id} style={[styles.row, index < expenses.length - 1 && styles.rowBorder]}>
              <View style={styles.personColumn}>
                <View style={styles.personLine}>
                  <View style={styles.emojiBox}><Text>{expense.emoji}</Text></View>
                  <View style={styles.personCopy}>
                    <Text style={styles.person}>{expense.person}</Text>
                    <Text style={styles.paidBy}>Paid by {expense.paidBy}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.categoryColumn}><Text style={styles.category}>{expense.category}</Text></View>
              <View style={styles.amountColumn}><Text style={styles.amount}>{formatRupees(expense.amount)}</Text></View>
            </View>
          ))}
        </Card>

        <Card tone="raised" style={styles.totalCard}>
          <View><Text style={styles.totalLabel}>TOTAL DAMAGE</Text><Text style={styles.totalMeta}>4 entries</Text></View>
          <Text style={styles.totalAmount}>{formatRupees(27450)}</Text>
        </Card>

        <Card tone="orange" style={styles.settlementCard}>
          <Text style={styles.settlementTitle}>3 payments and sab chill ✌️</Text>
          <Text style={styles.settlementHint}>Minimum transfers, maximum dosti.</Text>
          <View style={styles.payment}><Text style={styles.paymentText}>You owe Ali</Text><Text style={styles.paymentAmount}>Rs. 1,250</Text></View>
          <View style={styles.payment}><Text style={styles.paymentText}>Sara owes Hamza</Text><Text style={styles.paymentAmount}>Rs. 800</Text></View>
          <View style={styles.payment}><Text style={styles.paymentText}>Ali owes Sara</Text><Text style={styles.paymentAmount}>Rs. 500</Text></View>
        </Card>
      </Screen>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  heading: { gap: spacing.sm, marginTop: spacing.sm },
  title: { color: colors.white, fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: colors.muted, fontSize: 14 },
  modeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.medium, marginTop: spacing.sm },
  modeEmoji: { fontSize: 27 },
  modeCopy: { flex: 1 },
  modeTitle: { color: colors.background, fontSize: 15, fontWeight: '900' },
  modeText: { color: '#4B463F', fontSize: 11, lineHeight: 17, marginTop: 3 },
  tableHeader: { flexDirection: 'row', paddingHorizontal: spacing.sm, marginTop: spacing.sm },
  headerText: { color: colors.muted, fontSize: 9, letterSpacing: 0.7, fontWeight: '900' },
  personColumn: { flex: 1.35 },
  categoryColumn: { flex: 0.85, justifyContent: 'center' },
  amountColumn: { flex: 0.85, justifyContent: 'center', alignItems: 'flex-end' },
  tableCard: { paddingVertical: 4, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 76 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  personLine: { flexDirection: 'row', alignItems: 'center' },
  emojiBox: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center' },
  personCopy: { marginLeft: spacing.sm, flexShrink: 1 },
  person: { color: colors.white, fontSize: 13, fontWeight: '900' },
  paidBy: { color: colors.muted, fontSize: 9, marginTop: 3 },
  category: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  amount: { color: colors.white, fontSize: 11, fontWeight: '900' },
  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: colors.muted, fontSize: 10, letterSpacing: 1, fontWeight: '900' },
  totalMeta: { color: colors.muted, fontSize: 10, marginTop: 4 },
  totalAmount: { color: colors.lime, fontSize: 22, fontWeight: '900' },
  settlementCard: { gap: spacing.sm },
  settlementTitle: { color: colors.background, fontSize: 19, fontWeight: '900' },
  settlementHint: { color: '#6E3E2B', fontSize: 11 },
  payment: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#D9784E', paddingTop: spacing.sm },
  paymentText: { color: colors.background, fontSize: 12, fontWeight: '700' },
  paymentAmount: { color: colors.background, fontSize: 12, fontWeight: '900' },
});
