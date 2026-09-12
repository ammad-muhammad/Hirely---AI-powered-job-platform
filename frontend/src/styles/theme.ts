export const theme = {
  colors: {
    primary: {
      light: '#6366f1',
      DEFAULT: '#4f46e5',
      dark: '#4338ca',
    },
    background: {
      light: '#ffffff',
      dark: '#0f172a',
    },
    card: {
      light: '#f8fafc',
      dark: '#1e293b',
    },
    text: {
      light: '#0f172a',
      dark: '#f8fafc',
      mutedLight: '#64748b',
      mutedDark: '#94a3b8',
    },
  },
  animation: {
    transitionFast: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    transitionNormal: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;
