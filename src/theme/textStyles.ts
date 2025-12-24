import { Platform, TextStyle } from 'react-native';

const systemFontFamily = Platform.OS === 'ios' ? 'System' : undefined;

export const textStyles = {
  screenTitle: {
    fontSize: 32,
    fontWeight: '700' as TextStyle['fontWeight'],
    color: '#000000',
    fontFamily: systemFontFamily,
  },
  largeNumber: {
    fontSize: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: '#000000',
    fontFamily: systemFontFamily,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    color: '#000000',
    fontFamily: systemFontFamily,
  },
  listItemAmount: {
    fontSize: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: '#000000',
    fontFamily: systemFontFamily,
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '400' as TextStyle['fontWeight'],
    color: '#666666',
    fontFamily: systemFontFamily,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600' as TextStyle['fontWeight'],
    color: '#666666',
    textTransform: 'uppercase' as TextStyle['textTransform'],
    fontFamily: systemFontFamily,
  },
} as const;

