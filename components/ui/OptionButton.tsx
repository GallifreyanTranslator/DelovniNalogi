import React, { memo } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Radius, FontSize, Shadow } from '@/constants/theme';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
  accent?: boolean;
}

export const OptionButton = memo(({ label, selected, onPress, style, accent }: Props) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        selected && (accent ? styles.selectedAccent : styles.selected),
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[styles.label, selected && styles.labelSelected]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  btn: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minHeight: 48,
    justifyContent: 'center',
    ...Shadow.sm,
  },
  selected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  selectedAccent: {
    backgroundColor: Colors.accent,
    borderColor: Colors.warning,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  labelSelected: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
});
