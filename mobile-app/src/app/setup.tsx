import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, Field, PrimaryButton, Screen, Title } from '@/components/ui';
import { useAppState } from '@/state/AppContext';
import { colors, radii, spacing } from '@/theme';

export default function SetupScreen() {
  const { setupMode, setSetupMode, groupName, setGroupName, groupCode, setGroupCode, inviteCode, setInviteCode } = useAppState();
  const isCreate = setupMode === 'create';
  const canContinue = isCreate ? groupName.trim().length > 1 : groupCode.trim().length > 3 && /^\d{4}$/.test(inviteCode);

  return (
    <Screen>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>← Wapas</Text></Pressable>
      <View style={styles.heading}>
        <Eyebrow>{isCreate ? 'Naya adventure' : 'Gang mil gayi?'}</Eyebrow>
        <Title>{isCreate ? 'Trip ka naam kya hai?' : 'Apna invite code daalo.'}</Title>
        <Text style={styles.subtitle}>{isCreate ? 'Naam iconic ho. Group chat jaisa boring nahi.' : 'Group code aur apna personal 4-digit code leader se lo. 🔐'}</Text>
      </View>

      <View style={styles.modeSwitch}>
        {(['create', 'join'] as const).map((mode) => (
          <Pressable key={mode} onPress={() => setSetupMode(mode)} style={[styles.mode, setupMode === mode && styles.modeActive]}>
            <Text style={[styles.modeText, setupMode === mode && styles.modeTextActive]}>{mode === 'create' ? 'Create' : 'Join'}</Text>
          </Pressable>
        ))}
      </View>

      {isCreate ? (
        <Field label="Group / trip name" value={groupName} onChangeText={setGroupName} placeholder="e.g. Hunza Scene 2026" autoCapitalize="words" />
      ) : (
        <View style={styles.joinFields}>
          <Field label="Group ID / code" value={groupCode} onChangeText={(value) => setGroupCode(value.toUpperCase())} placeholder="e.g. KHP-ABC123" autoCapitalize="characters" maxLength={16} />
          <Field label="Aap ka personal 4-digit code" value={inviteCode} onChangeText={(value) => setInviteCode(value.replace(/\D/g, '').slice(0, 4))} placeholder="e.g. 0427" keyboardType="number-pad" maxLength={4} secureTextEntry />
        </View>
      )}

      <Card tone="raised" style={styles.helper}>
        <Text style={styles.helperEmoji}>🧪</Text>
        <View style={styles.helperCopy}>
          <Text style={styles.helperTitle}>Demo mode on hai</Text>
          <Text style={styles.helperText}>Koi backend nahi. Jo bhi karo ge, sirf iss prototype mein local rahega.</Text>
        </View>
      </Card>

      <View style={styles.action}>
        <PrimaryButton label={isCreate ? 'Log add karo  →' : 'Group join karo  →'} disabled={!canContinue} onPress={() => router.push('/members')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.muted, fontSize: 14, fontWeight: '800', paddingVertical: spacing.sm },
  heading: { marginTop: spacing.xl, gap: spacing.md },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  modeSwitch: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radii.medium, padding: 4, marginVertical: spacing.sm },
  mode: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  modeActive: { backgroundColor: colors.cardElevated },
  modeText: { color: colors.muted, fontWeight: '800' },
  modeTextActive: { color: colors.lime },
  helper: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  joinFields: { gap: spacing.md },
  helperEmoji: { fontSize: 30 },
  helperCopy: { flex: 1, gap: 3 },
  helperTitle: { color: colors.white, fontWeight: '900', fontSize: 15 },
  helperText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  action: { marginTop: 'auto', paddingTop: spacing.xxl },
});
