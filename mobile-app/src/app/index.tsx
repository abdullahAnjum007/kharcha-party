import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, PrimaryButton, Screen, Title } from '@/components/ui';
import { useAppState } from '@/state/AppContext';
import { colors, radii, spacing } from '@/theme';

export default function WelcomeScreen() {
  const { setSetupMode } = useAppState();

  const begin = (mode: 'create' | 'join') => {
    setSetupMode(mode);
    router.push('/setup');
  };

  return (
    <Screen>
      <View style={styles.topRow}>
        <Text style={styles.logo}>🪩 kharcha.party</Text>
        <View style={styles.demoPill}><Text style={styles.demoText}>DEMO</Text></View>
      </View>

      <View style={styles.hero}>
        <Eyebrow>Dosti ka CFO</Eyebrow>
        <Title>Paisa ka hisaab, dosti ke saath.</Title>
        <Text style={styles.subtitle}>
          Trip ka har kharcha track karo, budget sambhalo aur “bhai tu de de” wali situations se bach jao. 😌
        </Text>
      </View>

      <Card tone="lime" style={styles.stickerCard}>
        <Text style={styles.stickerEmoji}>💸</Text>
        <View style={styles.stickerCopy}>
          <Text style={styles.stickerTitle}>No awkward maths</Text>
          <Text style={styles.stickerText}>Bas entry karo. Baqi hisaab humari zimmedari.</Text>
        </View>
      </Card>

      <View style={styles.actions}>
        <PrimaryButton label="Naya group banao  →" onPress={() => begin('create')} />
        <PrimaryButton label="Code se join karo" variant="secondary" onPress={() => begin('join')} />
      </View>

      <Text style={styles.footer}>Made for trips, shaadis aur woh dost jo “kal de dunga” bolte hain.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
  logo: { color: colors.white, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  demoPill: { backgroundColor: colors.cardElevated, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill },
  demoText: { color: colors.purple, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  hero: { marginTop: spacing.xxl, gap: spacing.md },
  subtitle: { color: colors.muted, fontSize: 17, lineHeight: 26, maxWidth: 520 },
  stickerCard: { marginTop: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, transform: [{ rotate: '-1deg' }] },
  stickerEmoji: { fontSize: 46 },
  stickerCopy: { flex: 1, gap: 4 },
  stickerTitle: { color: colors.background, fontSize: 19, fontWeight: '900' },
  stickerText: { color: '#4B542A', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  actions: { marginTop: 'auto', gap: spacing.sm, paddingTop: spacing.xxl },
  footer: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', paddingHorizontal: spacing.lg },
});
