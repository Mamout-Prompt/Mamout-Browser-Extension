import { Purple80, PurpleGrey80, Pink80, Purple40, PurpleGrey40, Pink40 } from './Color';
import { Typography } from './Type';

export interface ColorScheme {
  primary: string;
  secondary: string;
  tertiary: string;
  background: string;
  onBackground: string;
  surfaceContainer: string;
  surfaceVariant: string;
}

export const DarkColorScheme: ColorScheme = {
  primary: Purple80,
  secondary: PurpleGrey80,
  tertiary: Pink80,
  background: '#1C1B1F',
  onBackground: '#E6E1E5',
  surfaceContainer: '#2B2930',
  surfaceVariant: '#49454F',
};

export const LightColorScheme: ColorScheme = {
  primary: Purple40,
  secondary: PurpleGrey40,
  tertiary: Pink40,
  background: '#FEF7FF',
  onBackground: '#1D1B20',
  surfaceContainer: '#ECE6F0',
  surfaceVariant: '#E7E0EC',
};

interface MamoutThemeProps {
  darkTheme?: boolean;
  children: React.ReactNode;
}

export const MamoutTheme: React.FC<MamoutThemeProps> = ({ darkTheme, children }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (darkTheme !== undefined) return darkTheme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkTheme !== undefined) {
      setIsDark(darkTheme);
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [darkTheme]);

  const colorScheme = isDark ? DarkColorScheme : LightColorScheme;

  const themeVariables = {
    '--md-sys-color-primary': colorScheme.primary,
    '--md-sys-color-secondary': colorScheme.secondary,
    '--md-sys-color-tertiary': colorScheme.tertiary,
    '--md-sys-color-background': colorScheme.background,
    '--md-sys-color-on-background': colorScheme.onBackground,
    '--md-sys-color-surface-container': colorScheme.surfaceContainer,
    '--md-sys-color-surface-variant': colorScheme.surfaceVariant,
    ...Typography.bodyLarge,
  } as React.CSSProperties;

  return (
    <div style={themeVariables} className={isDark ? 'dark-theme theme-wrapper' : 'light-theme theme-wrapper'}>
      {children}
    </div>
  );
};
