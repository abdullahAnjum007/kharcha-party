import { PropsWithChildren, ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { colors, radii, spacing } from '@/theme';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const content = <View style={styles.screenContent}>{children}</View>;
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Card({
  children,
  style,
  tone = 'default',
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; tone?: 'default' | 'raised' | 'lime' | 'orange' | 'purple' }>) {
  return <View style={[styles.card, toneStyles[tone], style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, buttonStyles[variant], pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonLabel, variant !== 'primary' && styles.buttonLabelLight]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label?: string; hint?: string }) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        selectionColor={colors.lime}
        style={styles.input}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Eyebrow({ children, color = colors.lime }: PropsWithChildren<{ color?: string }>) {
  return <Text style={[styles.eyebrow, { color }]}>{children}</Text>;
}

export function Title({ children }: PropsWithChildren) {
  return <Text style={styles.title}>{children}</Text>;
}

export function SectionTitle({ children, right }: PropsWithChildren<{ right?: ReactNode }>) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {right}
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, value))}%` }]} />
    </View>
  );
}

const tabs = [
  { path: '/home', icon: '🏠', label: 'Home' },
  { path: '/voice', icon: '🎙️', label: 'Voice log' },
  { path: '/sheet', icon: '📊', label: 'Sheet' },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <SafeAreaView edges={['bottom']} style={styles.navSafe}>
      <View style={styles.nav}>
        {tabs.map((tab) => {
          const active = pathname === tab.path;
          return (
            <Pressable key={tab.path} onPress={() => router.replace(tab.path)} style={styles.navItem}>
              <Text style={styles.navIcon}>{tab.icon}</Text>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text>
              <View style={[styles.navDot, active && styles.navDotActive]} />
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const toneStyles = StyleSheet.create({
  default: { backgroundColor: colors.card },
  raised: { backgroundColor: colors.cardElevated },
  lime: { backgroundColor: colors.lime },
  orange: { backgroundColor: colors.orange },
  purple: { backgroundColor: colors.purple },
});

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: colors.lime },
  secondary: { backgroundColor: colors.cardElevated, borderWidth: 1, borderColor: colors.line },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
});

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1 },
  screenContent: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: { borderRadius: radii.large, padding: spacing.lg, overflow: 'hidden' },
  button: { minHeight: 56, borderRadius: radii.medium, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  buttonLabel: { color: colors.background, fontSize: 16, fontWeight: '900', letterSpacing: 0.1 },
  buttonLabelLight: { color: colors.white },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  fieldWrap: { gap: spacing.xs },
  fieldLabel: { color: colors.white, fontSize: 14, fontWeight: '700' },
  input: { minHeight: 56, backgroundColor: colors.card, color: colors.white, borderRadius: radii.medium, borderWidth: 1, borderColor: colors.line, paddingHorizontal: spacing.md, fontSize: 17, fontWeight: '600' },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: colors.white, fontSize: 38, lineHeight: 42, fontWeight: '900', letterSpacing: -1.2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  sectionTitle: { color: colors.white, fontSize: 21, fontWeight: '900', letterSpacing: -0.4 },
  progressTrack: { height: 10, borderRadius: radii.pill, backgroundColor: colors.line, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.lime },
  navSafe: { backgroundColor: colors.card },
  nav: { minHeight: 72, maxWidth: 680, width: '100%', alignSelf: 'center', flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card, paddingHorizontal: spacing.md },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  navIcon: { fontSize: 19 },
  navLabel: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  navLabelActive: { color: colors.lime },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'transparent', marginTop: 2 },
  navDotActive: { backgroundColor: colors.lime },
});
