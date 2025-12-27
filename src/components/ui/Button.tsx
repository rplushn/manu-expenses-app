import React from 'react';
import { Pressable, Text, PressableProps, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { BUTTON_STYLE, TYPOGRAPHY, COLORS } from '@/lib/design-tokens';

interface ButtonProps extends PressableProps {
  children: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  loading?: boolean;
}

export const Button = ({
  children,
  variant = 'primary',
  style,
  textStyle,
  loading = false,
  disabled,
  ...props
}: ButtonProps) => {
  const buttonStyle = BUTTON_STYLE[variant];
  
  const textColor =
    variant === 'primary'
      ? COLORS.text.white
      : COLORS.text.primary;

  return (
    <Pressable
      style={({ pressed }) => [
        buttonStyle,
        {
          opacity: pressed ? 0.8 : disabled || loading ? 0.5 : 1,
        },
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text
          style={[
            {
              fontSize: TYPOGRAPHY.bodyBold.fontSize,
              fontWeight: TYPOGRAPHY.bodyBold.fontWeight,
              color: textColor,
              textAlign: 'center',
            },
            textStyle,
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
};
