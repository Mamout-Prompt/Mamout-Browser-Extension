export interface TypographyStyle {
  fontFamily: string;
  fontWeight: React.CSSProperties['fontWeight'];
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
}

export const Typography: { bodyLarge: TypographyStyle } = {
  bodyLarge: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: 400,
    fontSize: '16px',
    lineHeight: '24px',
    letterSpacing: '0.5px',
  },
};
