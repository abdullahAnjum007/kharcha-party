import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { BottomNav, Card, Eyebrow, Screen, SectionTitle } from '@/components/ui';
import { voiceLogs as demoVoiceLogs } from '@/data/mockData';
import { reviewVoiceDraft, uploadVoiceDraft, type VoiceDraft } from '@/services/api';
import { useAppState } from '@/state/AppContext';
import { colors, radii, spacing } from '@/theme';

type DisplayLog = { id: string; transcript: string; status: 'Accepted' | 'Pending' | 'Denied'; time: string };

export default function VoiceScreen() {
  const { session } = useAppState();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [processing, setProcessing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState('');
  const [newLogs, setNewLogs] = useState<DisplayLog[]>([]);
  const logs: DisplayLog[] = [...newLogs, ...demoVoiceLogs];

  const uploadRecording = async (uri: string) => {
    if (!session) return;
    setProcessing(true);
    setError('');
    try {
      const response = await uploadVoiceDraft({ uri, groupId: session.groupId, token: session.token });
      setDraft(response.data.voiceDraft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Voice samajh nahi aayi. Dobara try karein.');
    } finally {
      setProcessing(false);
    }
  };

  const toggleRecording = async () => {
    if (!session || processing || reviewing) return;
    setError('');
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        if (!recorder.uri) throw new Error('Recording file nahi mili. Dobara try karein.');
        await uploadRecording(recorder.uri);
        return;
      }
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Voice entry ke liye microphone permission zaroori hai.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Recording start nahi ho saki.');
    }
  };

  const review = async (decision: 'accept' | 'deny') => {
    if (!session || !draft) return;
    setReviewing(true);
    setError('');
    try {
      const response = await reviewVoiceDraft({ groupId: session.groupId, draftId: draft.id, token: session.token, decision });
      const reviewed = response.data.voiceDraft;
      setNewLogs((current) => [{ id: reviewed.id, transcript: reviewed.transcript, status: decision === 'accept' ? 'Accepted' : 'Denied', time: 'Abhi' }, ...current]);
      setDraft(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Entry review nahi ho saki.');
    } finally {
      setReviewing(false);
    }
  };

  const seconds = Math.floor(recorderState.durationMillis / 1000);

  return (
    <View style={styles.root}>
      <Screen>
        <View style={styles.heading}>
          <Eyebrow>Bol ke kharcha likho</Eyebrow>
          <Text style={styles.title}>Voice log 🎙️</Text>
          <Text style={styles.subtitle}>Roman Urdu ya Hinglish mein bolo. AI pehle entry dikhayega; aap ke Accept ke baad hi kharcha save hoga.</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recorderState.isRecording ? 'Recording band karein' : 'Voice expense record karein'}
          disabled={!session || processing || reviewing}
          onPress={() => void toggleRecording()}
          style={({ pressed }) => [pressed && styles.pressed, !session && styles.disabled]}
        >
          <Card tone={recorderState.isRecording ? 'orange' : 'lime'} style={styles.recorder}>
            <View style={styles.mic}><Text style={styles.micEmoji}>{recorderState.isRecording ? '⏹️' : '🎙️'}</Text></View>
            <View style={styles.recorderCopy}>
              <Text style={styles.recorderTitle}>{recorderState.isRecording ? `Sun raha hoon… ${seconds}s` : 'Tap karke bolo'}</Text>
              <Text style={styles.recorderText}>{recorderState.isRecording ? 'Tap dobara karo aur AI ko bhejo.' : '“Hotel 12000, sab ke liye.”'}</Text>
            </View>
            <View style={styles.wave}><Text style={styles.waveText}>{recorderState.isRecording ? '▇▃▆▂▅' : '▂▅▇▃▆'}</Text></View>
          </Card>
        </Pressable>

        {!session ? (
          <Card tone="raised" style={styles.notice}>
            <Text style={styles.noticeTitle}>🔐 Pehle group create ya join karein</Text>
            <Text style={styles.noticeText}>Voice expense ko sahi member aur group mein save karne ke liye backend session chahiye.</Text>
          </Card>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <SectionTitle>Recent transcripts</SectionTitle>
        <View style={styles.logs}>
          {logs.map((log) => (
            <Card key={log.id} style={styles.logCard}>
              <View style={styles.logTop}>
                <View style={[styles.status, log.status === 'Accepted' ? styles.accepted : log.status === 'Denied' ? styles.denied : styles.pending]}>
                  <Text style={[styles.statusText, log.status === 'Accepted' ? styles.acceptedText : log.status === 'Denied' ? styles.deniedText : styles.pendingText]}>
                    {log.status === 'Accepted' ? '✓ ' : log.status === 'Denied' ? '✕ ' : '⏳ '}{log.status}
                  </Text>
                </View>
                <Text style={styles.time}>{log.time}</Text>
              </View>
              <Text style={styles.transcript}>“{log.transcript}”</Text>
              <View style={styles.audioLine}>
                <View style={styles.play}><Text style={styles.playText}>▶</Text></View>
                <Text style={styles.fakeWave}>▁▃▆▂▇▅▂▆▃▁▅▇▂▃</Text>
                <Text style={styles.duration}>voice</Text>
              </View>
            </Card>
          ))}
        </View>

        <Card tone="raised" style={styles.futureCard}>
          <Text style={styles.futureTitle}>🧠 AI review guard on hai</Text>
          <Text style={styles.futureText}>Transcript aur parsed amount pehle modal mein aate hain. Deny se kuch save nahi hota; Accept se expense row banti hai.</Text>
        </Card>
      </Screen>
      <BottomNav />

      <Modal transparent animationType="fade" visible={processing || Boolean(draft)} onRequestClose={() => undefined}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            {processing ? (
              <View style={styles.processing}>
                <ActivityIndicator size="large" color={colors.lime} />
                <Text style={styles.modalTitle}>AI kharcha samajh raha hai…</Text>
                <Text style={styles.modalSubtitle}>Voice ko text aur clean entry mein convert kar raha hoon. 🪄</Text>
              </View>
            ) : draft ? (
              <>
                <Text style={styles.modalEyebrow}>ENTRY CHECK KAR LO</Text>
                <Text style={styles.modalTitle}>Yahi bola tha na? 👀</Text>
                <Text style={styles.modalSubtitle}>“{draft.transcript}”</Text>
                <View style={styles.entryHeader}>
                  <Text style={[styles.columnLabel, styles.entryMain]}>ENTRY</Text>
                  <Text style={styles.columnLabel}>AMOUNT</Text>
                </View>
                <View style={styles.entryRow}>
                  <View style={styles.entryMain}>
                    <Text style={styles.entryTitle}>{draft.title}</Text>
                    <Text style={styles.entryMeta}>{draft.category} · Paid by {draft.memberName}</Text>
                  </View>
                  <Text style={styles.entryAmount}>Rs. {draft.amount.toLocaleString('en-PK')}</Text>
                </View>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <View style={styles.modalActions}>
                  <Pressable disabled={reviewing} onPress={() => void review('deny')} style={({ pressed }) => [styles.reviewButton, styles.denyButton, pressed && styles.pressed]}>
                    <Text style={styles.denyLabel}>Deny ✕</Text>
                  </Pressable>
                  <Pressable disabled={reviewing} onPress={() => void review('accept')} style={({ pressed }) => [styles.reviewButton, styles.acceptButton, pressed && styles.pressed]}>
                    {reviewing ? <ActivityIndicator color={colors.background} /> : <Text style={styles.acceptLabel}>Accept ✓</Text>}
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  heading: { gap: spacing.sm, marginTop: spacing.sm },
  title: { color: colors.white, fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  recorder: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  mic: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  micEmoji: { fontSize: 23 },
  recorderCopy: { flex: 1 },
  recorderTitle: { color: colors.background, fontSize: 17, fontWeight: '900' },
  recorderText: { color: '#4C542C', fontSize: 11, marginTop: 4 },
  wave: { backgroundColor: '#BFD95E', paddingHorizontal: 8, paddingVertical: 5, borderRadius: radii.pill },
  waveText: { color: colors.background, fontSize: 12, fontWeight: '900' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
  notice: { borderWidth: 1, borderColor: colors.purple },
  noticeTitle: { color: colors.white, fontSize: 14, fontWeight: '900' },
  noticeText: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  logs: { gap: spacing.sm },
  logCard: { gap: spacing.md },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radii.pill },
  accepted: { backgroundColor: '#293A25' },
  pending: { backgroundColor: '#433429' },
  denied: { backgroundColor: '#442626' },
  statusText: { fontSize: 10, fontWeight: '900' },
  acceptedText: { color: colors.success },
  pendingText: { color: colors.orange },
  deniedText: { color: colors.danger },
  time: { color: colors.muted, fontSize: 10 },
  transcript: { color: colors.white, fontSize: 18, lineHeight: 25, fontWeight: '800' },
  audioLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  play: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center' },
  playText: { color: colors.lime, fontSize: 10, marginLeft: 2 },
  fakeWave: { flex: 1, color: colors.muted, letterSpacing: 2 },
  duration: { color: colors.muted, fontSize: 10 },
  futureCard: { borderWidth: 1, borderColor: colors.line },
  futureTitle: { color: colors.white, fontSize: 14, fontWeight: '900' },
  futureText: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 5 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCard: { width: '100%', maxWidth: 520, borderRadius: radii.large, backgroundColor: colors.cardElevated, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.line },
  processing: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  modalEyebrow: { color: colors.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  modalTitle: { color: colors.white, fontSize: 24, lineHeight: 30, fontWeight: '900', textAlign: 'center' },
  modalSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  entryHeader: { flexDirection: 'row', paddingHorizontal: spacing.sm },
  columnLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  entryMain: { flex: 1 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.medium, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  entryTitle: { color: colors.white, fontSize: 17, fontWeight: '900' },
  entryMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  entryAmount: { color: colors.lime, fontSize: 17, fontWeight: '900' },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  reviewButton: { flex: 1, minHeight: 52, borderRadius: radii.medium, alignItems: 'center', justifyContent: 'center' },
  denyButton: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.danger },
  acceptButton: { backgroundColor: colors.lime },
  denyLabel: { color: colors.danger, fontSize: 15, fontWeight: '900' },
  acceptLabel: { color: colors.background, fontSize: 15, fontWeight: '900' },
});
