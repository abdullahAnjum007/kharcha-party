import { StyleSheet, Text, View } from 'react-native';
import { BottomNav, Card, Eyebrow, Screen, SectionTitle } from '@/components/ui';
import { voiceLogs } from '@/data/mockData';
import { colors, radii, spacing } from '@/theme';

export default function VoiceScreen() {
  return (
    <View style={styles.root}>
      <Screen>
        <View style={styles.heading}>
          <Eyebrow>Bol ke kharcha likho</Eyebrow>
          <Text style={styles.title}>Voice log 🎙️</Text>
          <Text style={styles.subtitle}>Aap bolo, demo transcript samjhega. Filhal woh acting kar raha hai.</Text>
        </View>

        <Card tone="lime" style={styles.recorder}>
          <View style={styles.mic}><Text style={styles.micEmoji}>🎙️</Text></View>
          <View style={styles.recorderCopy}>
            <Text style={styles.recorderTitle}>Tap karke bolo</Text>
            <Text style={styles.recorderText}>“Hotel 12000, sab ke liye.”</Text>
          </View>
          <View style={styles.wave}><Text style={styles.waveText}>▂▅▇▃▆</Text></View>
        </Card>

        <SectionTitle>Recent transcripts</SectionTitle>
        <View style={styles.logs}>
          {voiceLogs.map((log) => (
            <Card key={log.id} style={styles.logCard}>
              <View style={styles.logTop}>
                <View style={[styles.status, log.status === 'Accepted' ? styles.accepted : styles.pending]}>
                  <Text style={[styles.statusText, log.status === 'Accepted' ? styles.acceptedText : styles.pendingText]}>
                    {log.status === 'Accepted' ? '✓ ' : '⏳ '}{log.status}
                  </Text>
                </View>
                <Text style={styles.time}>{log.time}</Text>
              </View>
              <Text style={styles.transcript}>“{log.transcript}”</Text>
              <View style={styles.audioLine}>
                <View style={styles.play}><Text style={styles.playText}>▶</Text></View>
                <Text style={styles.fakeWave}>▁▃▆▂▇▅▂▆▃▁▅▇▂▃</Text>
                <Text style={styles.duration}>0:04</Text>
              </View>
            </Card>
          ))}
        </View>

        <Card tone="raised" style={styles.futureCard}>
          <Text style={styles.futureTitle}>🧠 Real voice magic baad mein</Text>
          <Text style={styles.futureText}>Production mein yahan speech-to-text service, amount parsing aur leader approval sync connect hoga.</Text>
        </Card>
      </Screen>
      <BottomNav />
    </View>
  );
}

// Later: connect microphone capture and real voice-to-text parsing here.

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
  logs: { gap: spacing.sm },
  logCard: { gap: spacing.md },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: radii.pill },
  accepted: { backgroundColor: '#293A25' },
  pending: { backgroundColor: '#433429' },
  statusText: { fontSize: 10, fontWeight: '900' },
  acceptedText: { color: colors.success },
  pendingText: { color: colors.orange },
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
});
