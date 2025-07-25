// Design Tokens for Bolobey Tournament Platform
// These tokens ensure consistency across all components

export const tokens = {
  // Colors
  colors: {
    // Primary brand colors
    primary: {
      50: 'hsl(250, 95%, 98%)',
      100: 'hsl(251, 90%, 95%)',
      200: 'hsl(251, 85%, 90%)',
      300: 'hsl(252, 80%, 80%)',
      400: 'hsl(253, 75%, 70%)',
      500: 'hsl(254, 70%, 60%)', // Main primary color
      600: 'hsl(255, 65%, 50%)',
      700: 'hsl(256, 60%, 40%)',
      800: 'hsl(257, 55%, 30%)',
      900: 'hsl(258, 50%, 20%)',
      950: 'hsl(259, 45%, 10%)',
    },
    
    // Secondary colors
    secondary: {
      50: 'hsl(220, 95%, 98%)',
      100: 'hsl(221, 90%, 95%)',
      200: 'hsl(222, 85%, 90%)',
      300: 'hsl(223, 80%, 80%)',
      400: 'hsl(224, 75%, 70%)',
      500: 'hsl(225, 70%, 60%)',
      600: 'hsl(226, 65%, 50%)',
      700: 'hsl(227, 60%, 40%)',
      800: 'hsl(228, 55%, 30%)',
      900: 'hsl(229, 50%, 20%)',
      950: 'hsl(230, 45%, 10%)',
    },

    // Success colors
    success: {
      50: 'hsl(142, 95%, 98%)',
      100: 'hsl(143, 90%, 95%)',
      200: 'hsl(144, 85%, 90%)',
      300: 'hsl(145, 80%, 80%)',
      400: 'hsl(146, 75%, 70%)',
      500: 'hsl(147, 70%, 60%)',
      600: 'hsl(148, 65%, 50%)',
      700: 'hsl(149, 60%, 40%)',
      800: 'hsl(150, 55%, 30%)',
      900: 'hsl(151, 50%, 20%)',
      950: 'hsl(152, 45%, 10%)',
    },

    // Warning colors
    warning: {
      50: 'hsl(48, 95%, 98%)',
      100: 'hsl(49, 90%, 95%)',
      200: 'hsl(50, 85%, 90%)',
      300: 'hsl(51, 80%, 80%)',
      400: 'hsl(52, 75%, 70%)',
      500: 'hsl(53, 70%, 60%)',
      600: 'hsl(54, 65%, 50%)',
      700: 'hsl(55, 60%, 40%)',
      800: 'hsl(56, 55%, 30%)',
      900: 'hsl(57, 50%, 20%)',
      950: 'hsl(58, 45%, 10%)',
    },

    // Error colors
    error: {
      50: 'hsl(0, 95%, 98%)',
      100: 'hsl(1, 90%, 95%)',
      200: 'hsl(2, 85%, 90%)',
      300: 'hsl(3, 80%, 80%)',
      400: 'hsl(4, 75%, 70%)',
      500: 'hsl(5, 70%, 60%)',
      600: 'hsl(6, 65%, 50%)',
      700: 'hsl(7, 60%, 40%)',
      800: 'hsl(8, 55%, 30%)',
      900: 'hsl(9, 50%, 20%)',
      950: 'hsl(10, 45%, 10%)',
    },

    // Neutral colors
    neutral: {
      50: 'hsl(0, 0%, 98%)',
      100: 'hsl(0, 0%, 95%)',
      200: 'hsl(0, 0%, 90%)',
      300: 'hsl(0, 0%, 80%)',
      400: 'hsl(0, 0%, 70%)',
      500: 'hsl(0, 0%, 60%)',
      600: 'hsl(0, 0%, 50%)',
      700: 'hsl(0, 0%, 40%)',
      800: 'hsl(0, 0%, 30%)',
      900: 'hsl(0, 0%, 20%)',
      950: 'hsl(0, 0%, 10%)',
    },
  },

  // Spacing
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    '2xl': '3rem',    // 48px
    '3xl': '4rem',    // 64px
    '4xl': '6rem',    // 96px
    '5xl': '8rem',    // 128px
  },

  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
      '6xl': '3.75rem',   // 60px
      '7xl': '4.5rem',    // 72px
      '8xl': '6rem',      // 96px
      '9xl': '8rem',      // 128px
    },
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },
  },

  // Border radius
  borderRadius: {
    none: '0',
    sm: '0.125rem',   // 2px
    base: '0.25rem',  // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px
    '3xl': '1.5rem',  // 24px
    full: '9999px',
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',
  },

  // Transitions
  transitions: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // Z-index
  zIndex: {
    hide: '-1',
    auto: 'auto',
    base: '0',
    docked: '10',
    dropdown: '1000',
    sticky: '1100',
    banner: '1200',
    overlay: '1300',
    modal: '1400',
    popover: '1500',
    skipLink: '1600',
    toast: '1700',
    tooltip: '1800',
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Helper function to get token value
export function getToken(path: string): string {
  const keys = path.split('.');
  let value: unknown = tokens;
  
  for (const key of keys) {
    value = (value as Record<string, unknown>)[key];
    if (value === undefined) {
      throw new Error(`Token not found: ${path}`);
    }
  }
  
  return value as string;
}

// CSS custom properties generator
export function generateCSSVariables(): string {
  const variables: string[] = [];
  
  // Generate color variables
  Object.entries(tokens.colors).forEach(([colorName, colorShades]) => {
    Object.entries(colorShades).forEach(([shade, value]) => {
      variables.push(`--color-${colorName}-${shade}: ${value};`);
    });
  });
  
  // Generate spacing variables
  Object.entries(tokens.spacing).forEach(([name, value]) => {
    variables.push(`--spacing-${name}: ${value};`);
  });
  
  // Generate typography variables
  Object.entries(tokens.typography.fontSize).forEach(([name, value]) => {
    variables.push(`--font-size-${name}: ${value};`);
  });
  
  Object.entries(tokens.typography.fontWeight).forEach(([name, value]) => {
    variables.push(`--font-weight-${name}: ${value};`);
  });
  
  // Generate border radius variables
  Object.entries(tokens.borderRadius).forEach(([name, value]) => {
    variables.push(`--radius-${name}: ${value};`);
  });
  
  return `:root {\n  ${variables.join('\n  ')}\n}`;
} 