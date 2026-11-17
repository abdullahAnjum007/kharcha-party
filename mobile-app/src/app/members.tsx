import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { Card, Eyebrow, Field, PrimaryButton, Screen, Title } from '@/components/ui';
import { useAppState } from '@/state/AppContext';
import { colors, radii, spacing } from '@/theme';
import { createGroup } from '@/services/api';

export default function MembersScreen() {
  const { groupName, members, memberCodes, setMemberCount, updateMember, connectBackend } = useAppState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const allNamed = members.every((name) => name.trim().length > 0);

  const saveGroup = async () => {
    setLoading(true);
    setError('');
    try {
      const creatorIndex = members.length > 1 ? 1 : 0;
      const creatorName = members[creatorIndex]!.trim();
      const memberNames = members.filter((_, index) => index !== creatorIndex).map((name) => name.trim());
      const response = await createGroup({ name: groupName.trim(), creatorName, memberNames });
      connectBackend(response.data);
      router.push('/vote');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Group create nahi ho saka.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>← Wapas</Text></Pressable>
      <View style={styles.heading}>
        <Eyebrow>Apni gang bulao</Eyebrow>
        <Title>Kitne log hain?</Title>
        <Text style={styles.subtitle}>Leader har dost ka naam add karega. Har naam ke saath personal login code banega.</Text>
      </View>

      <Card tone="raised" style={styles.counterCard}>
        <View>
          <Text style={styles.counterLabel}>Total travellers</Text>
          <Text style={styles.counterHint}>2 se 8 log</Text>
        </View>
        <View style={styles.counter}>
          <Pressable onPress={() => setMemberCount(members.length - 1)} style={styles.counterButton}><Text style={styles.counterButtonText}>−</Text></Pressable>
          <Text style={styles.count}>{members.length}</Text>
          <Pressable onPress={() => setMemberCount(members.length + 1)} style={styles.counterButton}><Text style={styles.counterButtonText}>+</Text></Pressable>
        </View>
      </Card>

      <Text style={styles.inputHeading}>Naam likho ✍️</Text>
      <View style={styles.inputs}>
        {members.map((member, index) => (
          <View key={index} style={styles.memberInputRow}>
            <View style={styles.memberField}>
              <Field
                label={`Member ${index + 1}${index === 1 ? ' (aap)' : ''}`}
                value={member}
                onChangeText={(value) => updateMember(index, value)}
                placeholder={`Dost ${index + 1}`}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.codeWrap}>
              <Text style={styles.codeLabel}>LOGIN CODE</Text>
              <View style={styles.codePill}><Text style={styles.codeText}>{memberCodes[index]}</Text></View>
            </View>
          </View>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton label={loading ? 'Group ban raha hai…' : 'Voting shuru karo  🗳️'} disabled={!allNamed || loading} onPress={() => void saveGroup()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.muted, fontSize: 14, fontWeight: '800', paddingVertical: spacing.sm },
  heading: { marginTop: spacing.xl, gap: spacing.md },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  counterCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  counterLabel: { color: colors.white, fontSize: 17, fontWeight: '900' },
  counterHint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  counterButton: { width: 40, height: 40, borderRadius: radii.small, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  counterButtonText: { color: colors.lime, fontSize: 24, fontWeight: '800', marginTop: -2 },
  count: { color: colors.white, fontSize: 24, fontWeight: '900', minWidth: 24, textAlign: 'center' },
  inputHeading: { color: colors.white, fontSize: 19, fontWeight: '900', marginTop: spacing.sm },
  inputs: { gap: spacing.md },
  memberInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  memberField: { flex: 1 },
  codeWrap: { width: 90, gap: spacing.xs },
  codeLabel: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6, textAlign: 'center' },
  codePill: { minHeight: 56, borderRadius: radii.medium, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },
  codeText: { color: colors.background, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
});
