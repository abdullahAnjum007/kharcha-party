import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { BottomNav, Card, Eyebrow, Screen } from '@/components/ui';
import { expenses, formatRupees } from '@/data/mockData';
import { useAppState } from '@/state/AppContext';
import { colors, radii, spacing } from '@/theme';
import { getGroup, listVoiceDrafts, reviewVoiceDraft, updateVoiceDraft, type ApiMember, type VoiceDraft } from '@/services/api';

const categories = ['Food', 'Transport', 'Hotel', 'Shopping', 'Entertainment', 'Extra'] as const;

export default function SheetScreen() {
  const { demoRole, session } = useAppState();
  const isLeader = demoRole === 'leader';
  const [voiceDrafts, setVoiceDrafts] = useState<VoiceDraft[]>([]);
  const [members, setMembers] = useState<ApiMember[]>([]);
  const [editing, setEditing] = useState<VoiceDraft | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [paidByMemberId, setPaidByMemberId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadVoiceDrafts = useCallback(async () => {
    if (!session) return;
    try {
      const [draftResponse, groupResponse] = await Promise.all([
        listVoiceDrafts({ groupId: session.groupId, token: session.token }),
        getGroup({ groupId: session.groupId, token: session.token }),
      ]);
      setVoiceDrafts(draftResponse.data.voiceDrafts.filter((draft) => ['NEEDS_DETAILS', 'PENDING_REVIEW'].includes(draft.status)));
      setMembers(groupResponse.data.members);
    } catch {
      setVoiceDrafts([]);
    }
  }, [session]);

  useFocusEffect(useCallback(() => { void loadVoiceDrafts(); }, [loadVoiceDrafts]));

  const openEditor = (draft: VoiceDraft) => {
    setEditing(draft);
    setTitle(draft.title ?? '');
    setAmount(draft.amount?.toString() ?? '');
    setCategory(draft.category);
    setPaidByMemberId(draft.paidBy?.id ?? null);
    setError('');
  };

  const save = async (acceptAfterSave: boolean) => {
    if (!session || !editing) return;
    setSaving(true);
    setError('');
    try {
      const response = await updateVoiceDraft({
        groupId: session.groupId,
        draftId: editing.id,
        token: session.token,
        details: { title: title.trim() || null, category, amount: Number(amount) > 0 ? Number(amount) : null, paidByMemberId },
      });
      const updated = response.data.voiceDraft;
      if (acceptAfterSave) {
        if (updated.missingFields.length) throw new Error('Accept se pehle sari missing details complete karein.');
        await reviewVoiceDraft({ groupId: session.groupId, draftId: updated.id, token: session.token, decision: 'accept' });
      }
      setEditing(null);
      await loadVoiceDrafts();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Entry save nahi ho saki.');
    } finally {
      setSaving(false);
    }
  };

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

        {voiceDrafts.length ? (
          <View style={styles.voiceSection}>
            <Text style={styles.voiceHeading}>🚨 Voice entries ko seedha karo</Text>
            {voiceDrafts.map((draft) => (
              <Pressable key={draft.id} onPress={() => openEditor(draft)}>
                <Card tone="raised" style={styles.voiceDraftCard}>
                  <View style={styles.voiceDraftCopy}>
                    <Text style={styles.voiceDraftTitle}>{draft.title ?? 'Expense detail missing'}</Text>
                    <Text style={styles.voiceDraftTranscript}>“{draft.transcript}”</Text>
                    <Text style={styles.voiceMissing}>{draft.missingFields.length ? `Missing: ${draft.missingFields.join(', ')}` : 'Review pending'}</Text>
                  </View>
                  <Text style={styles.voiceEdit}>Edit →</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        ) : null}

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

      <Modal transparent animationType="slide" visible={Boolean(editing)} onRequestClose={() => { if (!saving) setEditing(null); }}>
        <View style={styles.overlay}>
          <ScrollView style={styles.editorCard} contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.editorEyebrow}>VOICE ENTRY EDITOR</Text>
            <Text style={styles.editorTitle}>Harami pan fix karo 😅</Text>
            <Text style={styles.editorTranscript}>“{editing?.transcript}”</Text>

            <Text style={styles.inputLabel}>Kahan kharcha hua?</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Dinner scene" placeholderTextColor={colors.muted} style={styles.input} />
            <Text style={styles.inputLabel}>Amount (PKR)</Text>
            <TextInput value={amount} onChangeText={(value) => setAmount(value.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="e.g. 8200" placeholderTextColor={colors.muted} style={styles.input} />

            <Text style={styles.inputLabel}>Category</Text>
            <View style={styles.chips}>{categories.map((item) => (
              <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}>
                <Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item}</Text>
              </Pressable>
            ))}</View>

            <Text style={styles.inputLabel}>Paid by</Text>
            <View style={styles.chips}>{members.map((member) => (
              <Pressable key={member.id} onPress={() => setPaidByMemberId(member.id)} style={[styles.chip, paidByMemberId === member.id && styles.chipActive]}>
                <Text style={[styles.chipText, paidByMemberId === member.id && styles.chipTextActive]}>{member.name}</Text>
              </Pressable>
            ))}</View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.editorActions}>
              <Pressable disabled={saving} onPress={() => setEditing(null)} style={[styles.editorButton, styles.cancelButton]}><Text style={styles.cancelText}>Cancel</Text></Pressable>
              <Pressable disabled={saving} onPress={() => void save(false)} style={[styles.editorButton, styles.saveButton]}><Text style={styles.saveText}>Save</Text></Pressable>
            </View>
            <Pressable disabled={saving} onPress={() => void save(true)} style={styles.acceptButton}>
              {saving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.acceptText}>Save & accept entry ✓</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
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
  voiceSection: { gap: spacing.sm },
  voiceHeading: { color: colors.orange, fontSize: 17, fontWeight: '900' },
  voiceDraftCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.orange },
  voiceDraftCopy: { flex: 1 },
  voiceDraftTitle: { color: colors.white, fontSize: 15, fontWeight: '900' },
  voiceDraftTranscript: { color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 4 },
  voiceMissing: { color: colors.orange, fontSize: 10, fontWeight: '800', marginTop: 6 },
  voiceEdit: { color: colors.lime, fontSize: 12, fontWeight: '900' },
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  editorCard: { maxHeight: '92%', backgroundColor: colors.cardElevated, borderTopLeftRadius: radii.large, borderTopRightRadius: radii.large },
  editorContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  editorEyebrow: { color: colors.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  editorTitle: { color: colors.white, fontSize: 25, fontWeight: '900' },
  editorTranscript: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  inputLabel: { color: colors.white, fontSize: 12, fontWeight: '800', marginTop: spacing.xs },
  input: { minHeight: 48, borderRadius: radii.small, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, color: colors.white, paddingHorizontal: spacing.md, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.lime, borderColor: colors.lime },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  chipTextActive: { color: colors.background },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  editorActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  editorButton: { flex: 1, minHeight: 48, borderRadius: radii.medium, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  saveButton: { backgroundColor: colors.purple },
  cancelText: { color: colors.white, fontWeight: '900' },
  saveText: { color: colors.background, fontWeight: '900' },
  acceptButton: { minHeight: 52, borderRadius: radii.medium, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  acceptText: { color: colors.background, fontSize: 14, fontWeight: '900' },
});
