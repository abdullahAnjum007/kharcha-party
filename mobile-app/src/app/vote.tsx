import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, PrimaryButton, Screen, Title } from '@/components/ui';
import { useAppState } from '@/state/AppContext';
import { colors, radii, spacing } from '@/theme';

const avatarColors = [colors.orange, colors.purple, colors.lime, '#65C8D0', '#F39BC8', '#F4C85A'];

export default function VoteScreen() {
  const { members, leader, setLeader, setDemoRole } = useAppState();

  const submitVote = () => {
    setDemoRole(leader === 'You' ? 'leader' : 'traveller');
    router.push('/budget');
  };

  return (
    <Screen>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>← Wapas</Text></Pressable>
      <View style={styles.heading}>
        <Eyebrow>Democracy, kinda</Eyebrow>
        <Title>Leader kaun banega?</Title>
        <Text style={styles.subtitle}>Aap ka ek vote hai. Samajhdaari se use karo, warna budget gaya. 😅</Text>
      </View>

      <View style={styles.list}>
        {members.map((member, index) => {
          const selected = leader === member;
          return (
            <Pressable key={`${member}-${index}`} onPress={() => setLeader(member)}>
              <Card style={[styles.memberRow, selected && styles.memberSelected]} tone={selected ? 'raised' : 'default'}>
                <View style={[styles.avatar, { backgroundColor: avatarColors[index % avatarColors.length] }]}>
                  <Text style={styles.avatarText}>{member.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.memberCopy}>
                  <Text style={styles.memberName}>{member}</Text>
                  <Text style={styles.memberHint}>{member === 'You' ? 'Aap — khud pe bharosa?' : selected ? 'Solid choice 👀' : 'Leader candidate'}</Text>
                </View>
                <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <Card tone="orange" style={styles.tieCard}>
        <Text style={styles.tieText}>🤝 Tie hua to revote. Dosti bachani hai boss.</Text>
      </Card>

      <PrimaryButton label={`${leader} ko vote do  →`} onPress={submitVote} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.muted, fontSize: 14, fontWeight: '800', paddingVertical: spacing.sm },
  heading: { marginTop: spacing.xl, gap: spacing.md },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  list: { gap: spacing.sm, marginTop: spacing.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderWidth: 1, borderColor: 'transparent' },
  memberSelected: { borderColor: colors.lime },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.background, fontSize: 19, fontWeight: '900' },
  memberCopy: { flex: 1, marginLeft: spacing.md, gap: 3 },
  memberName: { color: colors.white, fontSize: 17, fontWeight: '900' },
  memberHint: { color: colors.muted, fontSize: 12 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.lime },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.lime },
  tieCard: { padding: spacing.md, borderRadius: radii.medium },
  tieText: { color: colors.background, fontSize: 13, lineHeight: 19, fontWeight: '800' },
});
