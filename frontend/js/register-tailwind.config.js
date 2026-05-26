tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'surface-dim': '#dcd9d9',
        'primary-container': '#0070eb',
        primary: '#0058bc',
        'outline-variant': '#c1c6d7',
        error: '#ba1a1a',
        secondary: '#5e5e5e',
        'inverse-primary': '#adc6ff',
        'on-surface-variant': '#414755',
        'on-primary': '#ffffff',
        tertiary: '#4648d4',
        surface: '#fcf9f8',
        'on-surface': '#1c1b1b',
        'surface-variant': '#e5e2e1',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f6f3f2',
        'surface-container': '#f0edec',
        outline: '#717786',
        background: '#fcf9f8'
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem'
      },
      spacing: {
        base: '4px',
        sm: '8px',
        md: '16px',
        'container-max': '1280px',
        lg: '24px',
        xl: '48px',
        xs: '4px',
        gutter: '20px'
      },
      fontFamily: {
        'code-md': ['JetBrains Mono'],
        'body-sm': ['Space Grotesk'],
        'body-md': ['Space Grotesk'],
        h1: ['Space Grotesk'],
        h2: ['Space Grotesk'],
        display: ['Space Grotesk'],
        'body-lg': ['Space Grotesk'],
        'label-md': ['Space Grotesk'],
        h3: ['Space Grotesk']
      },
      fontSize: {
        'code-md': ['14px', { lineHeight: '1.7', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        h1: ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        h2: ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        display: ['48px', { lineHeight: '1.1', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-md': ['12px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '600' }],
        h3: ['20px', { lineHeight: '1.4', fontWeight: '600' }]
      }
    }
  }
};