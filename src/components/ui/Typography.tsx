import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { TYPOGRAPHY } from '@/lib/design-tokens';

interface TypographyProps extends TextProps {
  children: React.ReactNode;
  style?: TextStyle | TextStyle[];
}

export const H1 = ({ children, style, ...props }: TypographyProps) => (
  <Text style={[TYPOGRAPHY.h1, style]} {...props}>
    {children}
  </Text>
);

export const H2 = ({ children, style, ...props }: TypographyProps) => (
  <Text style={[TYPOGRAPHY.h2, style]} {...props}>
    {children}
  </Text>
);

export const H3 = ({ children, style, ...props }: TypographyProps) => (
  <Text style={[TYPOGRAPHY.h3, style]} {...props}>
    {children}
  </Text>
);

export const Body = ({ children, style, ...props }: TypographyProps) => (
  <Text style={[TYPOGRAPHY.body, style]} {...props}>
    {children}
  </Text>
);

export const BodyBold = ({ children, style, ...props }: TypographyProps) => (
  <Text style={[TYPOGRAPHY.bodyBold, style]} {...props}>
    {children}
  </Text>
);

export const Label = ({ children, style, ...props }: TypographyProps) => (
  <Text style={[TYPOGRAPHY.label, style]} {...props}>
    {children}
  </Text>
);

export const Caption = ({ children, style, ...props }: TypographyProps) => (
  <Text style={[TYPOGRAPHY.caption, style]} {...props}>
    {children}
  </Text>
);

export const AmountLarge = ({ children, style, ...props }: TypographyProps) => (
  <Text style={[TYPOGRAPHY.amountLarge, style]} {...props}>
    {children}
  </Text>
);

export const AmountMedium = ({ children, style, ...props }: TypographyProps) => (
  <Text style={[TYPOGRAPHY.amountMedium, style]} {...props}>
    {children}
  </Text>
);
