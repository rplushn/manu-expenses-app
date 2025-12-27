import React from 'react';
import { View, ViewProps, ViewStyle, Pressable } from 'react-native';
import { CARD_STYLE } from '@/lib/design-tokens';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
}

export const Card = ({ children, style, onPress, ...props }: CardProps) => {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          CARD_STYLE,
          { opacity: pressed ? 0.8 : 1 },
          style,
        ]}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[CARD_STYLE, style]} {...props}>
      {children}
    </View>
  );
};
