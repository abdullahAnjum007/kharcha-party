import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomNav, Card, Eyebrow, PrimaryButton, ProgressBar, Screen, SectionTitle } from '@/components/ui';
import { expenses, formatRupees } from '@/data/mockData';
import { useAppState } from '@/state/AppContext';
import { colors, radii, spacing } from '@/theme';

export default function HomeScreen() {
  const { groupName, groupCode, individualBudget, demoRole, setDemoRole } = useAppState();
  const [notice, setNotice] = useState('');
  const isLeader = demoRole === 'leader';
  const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalBudget = (Number(individualBudget) || 25000) * 4;
  const progress = Math.round((spent / totalBudget) * 100);

  return (
    <View style={styles.root}>
      <Screen>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Eyebrow>{groupCode}</Eyebrow>
            <Text style={styles.groupName}>{groupName}</Text>
          </View>
          <View style={styles.logoCircle}><Text style={styles.logoEmoji}>🪩</Text></View>
        </View>

        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greeting}>Hey {isLeader ? 'leader' : 'traveller'} 👋</Text>
            <Text style={styles.greetingSub}>{isLeader ? 'Aaj kitna udaana hai?' : 'Kharchay dekho, tension nahi.'}</Text>
          </View>
          <View style={styles.roleSwitch}>
            {(['leader', 'traveller'] as const).map((role) => (
              <Pressable key={role} onPress={() => setDemoRole(role)} style={[styles.roleButton, demoRole === role && styles.roleActive]}>
                <Text style={[styles.roleText, demoRole === role && styles.roleTextActive]}>{role === 'leader' ? '👑' : '🎒'}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Card tone="raised" style={styles.totalCard}>
          <Text style={styles.cardLabel}>GROUP SPENDING</Text>
          <Text style={styles.totalAmount}>{formatRupees(spent)}</Text>
          <View style={styles.budgetLine}>
            <Text style={styles.budgetText}>{formatRupees(totalBudget)} budget</Text>
            <Text style={styles.budgetPercent}>{progress}% used</Text>
          </View>
          <ProgressBar value={progress} />
          <Text style={styles.safeText}>{formatRupees(Math.max(0, totalBudget - spent))} abhi safe hain. Filhal. 😅</Text>
        </Card>

        <View style={styles.miniGrid}>
          <Card style={styles.miniCard}>
            <Text style={styles.miniEmoji}>🎯</Text>
            <Text style={styles.miniLabel}>Mera budget</Text>
            <Text style={styles.miniAmount}>{formatRupees(Number(individualBudget) || 25000)}</Text>
          </Card>
          <Card style={styles.miniCard}>
            <Text style={styles.miniEmoji}>🔥</Text>
            <Text style={styles.miniLabel}>Mera kharcha</Text>
            <Text style={styles.miniAmount}>{formatRupees(4500)}</Text>
          </Card>
        </View>

        <SectionTitle>{isLeader ? 'Leader controls' : 'Aap ka scene'}</SectionTitle>
        <Card tone={isLeader ? 'lime' : 'purple'} style={styles.actionCard}>
          <Text style={styles.actionEmoji}>{isLeader ? '🎙️' : '🧾'}</Text>
          <View style={styles.actionCopy}>
            <Text style={styles.actionTitle}>{isLeader ? 'Kharcha add karo' : 'Expense request bhejo'}</Text>
            <Text style={styles.actionText}>{isLeader ? 'Type karo ya voice se bolo. “Dinner 8200, Ali ne diye.”' : 'Receipt ya amount bhejo. Leader approve karega.'}</Text>
          </View>
          <Pressable onPress={() => setNotice(isLeader ? 'Voice entry demo ready 🎙️' : 'Request leader ko bhej di ✈️')} style={styles.roundAction}>
            <Text style={styles.roundActionText}>→</Text>
          </Pressable>
        </Card>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <SectionTitle>Recent hungama</SectionTitle>
        <Card>
          {expenses.slice(0, 3).map((expense, index) => (
            <View key={expense.id} style={[styles.activityRow, index < 2 && styles.activityBorder]}>
              <View style={styles.activityIcon}><Text>{expense.emoji}</Text></View>
              <View style={styles.activityCopy}>
                <Text style={styles.activityTitle}>{expense.category}</Text>
                <Text style={styles.activityMeta}>{expense.paidBy} ne pay kiya</Text>
              </View>
              <Text style={styles.activityAmount}>{formatRupees(expense.amount)}</Text>
            </View>
          ))}
        </Card>

        <Card tone="raised" style={styles.sheetAccess}>
          <View style={styles.sheetIcon}><Text style={styles.sheetEmoji}>📊</Text></View>
          <View style={styles.sheetCopy}>
            <Text style={styles.sheetTitle}>{isLeader ? 'Full spreadsheet access' : 'Read-only spreadsheet'}</Text>
            <Text style={styles.sheetText}>{isLeader ? 'Rows edit karo, categories fix karo.' : 'Sab dekh sakte ho, edit leader karega.'}</Text>
          </View>
        </Card>

        <SectionTitle>Settlement preview</SectionTitle>
        <Card tone="orange" style={styles.settlement}>
          <Text style={styles.settlementTitle}>3 payments and sab chill ✌️</Text>
          <View style={styles.settlementLine}><Text style={styles.settlementText}>You owe Ali</Text><Text style={styles.settlementAmount}>Rs. 1,250</Text></View>
          <View style={styles.settlementLine}><Text style={styles.settlementText}>Sara owes Hamza</Text><Text style={styles.settlementAmount}>Rs. 800</Text></View>
          <PrimaryButton label="Poora settlement dekho" variant="secondary" onPress={() => setNotice('Settlement abhi demo preview hai ✌️')} />
        </Card>
      </Screen>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { flex: 1, gap: 3 },
  groupName: { color: colors.white, fontSize: 18, fontWeight: '900' },
  logoCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 22 },
  greetingRow: { marginTop: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: colors.white, fontSize: 28, fontWeight: '900', letterSpacing: -0.7 },
  greetingSub: { color: colors.muted, fontSize: 13, marginTop: 4 },
  roleSwitch: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radii.pill, padding: 3 },
  roleButton: { width: 36, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  roleActive: { backgroundColor: colors.cardElevated },
  roleText: { fontSize: 14, opacity: 0.45 },
  roleTextActive: { opacity: 1 },
  totalCard: { marginTop: spacing.sm },
  cardLabel: { color: colors.muted, fontSize: 11, letterSpacing: 1.2, fontWeight: '900' },
  totalAmount: { color: colors.white, fontSize: 36, fontWeight: '900', letterSpacing: -1.2, marginVertical: spacing.sm },
  budgetLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  budgetText: { color: colors.muted, fontSize: 12 },
  budgetPercent: { color: colors.lime, fontSize: 12, fontWeight: '900' },
  safeText: { color: colors.muted, fontSize: 11, marginTop: spacing.sm },
  miniGrid: { flexDirection: 'row', gap: spacing.sm },
  miniCard: { flex: 1, padding: spacing.md, borderRadius: radii.medium },
  miniEmoji: { fontSize: 20, marginBottom: spacing.sm },
  miniLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  miniAmount: { color: colors.white, fontSize: 18, fontWeight: '900', marginTop: 4 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  actionEmoji: { fontSize: 30 },
  actionCopy: { flex: 1 },
  actionTitle: { color: colors.background, fontSize: 17, fontWeight: '900' },
  actionText: { color: '#4C483D', fontSize: 11, lineHeight: 16, marginTop: 4 },
  roundAction: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  roundActionText: { color: colors.white, fontSize: 20, fontWeight: '900' },
  notice: { color: colors.lime, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  activityBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  activityIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1, marginLeft: spacing.sm },
  activityTitle: { color: colors.white, fontSize: 14, fontWeight: '800' },
  activityMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  activityAmount: { color: colors.white, fontSize: 13, fontWeight: '900' },
  sheetAccess: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sheetIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  sheetEmoji: { fontSize: 22 },
  sheetCopy: { flex: 1 },
  sheetTitle: { color: colors.white, fontSize: 15, fontWeight: '900' },
  sheetText: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  settlement: { gap: spacing.md },
  settlementTitle: { color: colors.background, fontSize: 20, fontWeight: '900' },
  settlementLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#D9774D', paddingTop: spacing.sm },
  settlementText: { color: colors.background, fontSize: 13, fontWeight: '700' },
  settlementAmount: { color: colors.background, fontSize: 14, fontWeight: '900' },
});
