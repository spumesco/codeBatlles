tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary-container': '#0070eb',
        primary: '#0058bc',
        'outline-variant': '#c1c6d7',
        'on-primary': '#ffffff',
        secondary: '#5e5e5e',
        'on-surface': '#1c1b1b',
        surface: '#fcf9f8',
        outline: '#717786'
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem'
      },
      spacing: {
        sm: '8px',
        md: '16px',
        'container-max': '1280px',
        lg: '24px',
        xl: '48px',
        gutter: '20px'
      },
      fontFamily: {
        'body-md': ['Space Grotesk'],
        display: ['Space Grotesk'],
        'code-md': ['JetBrains Mono']
      },
      fontSize: {
        'body-md': ['16px', { lineHeight: '1.6' }],
        h2: ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        display: ['48px', { lineHeight: '1.1', fontWeight: '700' }]
      }
    }
  }
};