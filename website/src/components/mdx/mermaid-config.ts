import type { MermaidConfig } from 'mermaid';

const sharedConfig = {
  startOnLoad: false,
  securityLevel: 'loose',
  fontFamily: 'inherit',
  look: 'classic',
  flowchart: {
    curve: 'basis',
    diagramPadding: 12,
    nodeSpacing: 48,
    rankSpacing: 56,
    padding: 12,
  },
  themeCSS: `
    .label foreignObject div {
      line-height: 1.4;
    }
    .node rect,
    .node circle,
    .node ellipse,
    .node polygon,
    .node path {
      filter: drop-shadow(0 1px 2px color-mix(in oklab, var(--color-fd-foreground) 8%, transparent));
    }
    .edgeLabel .label {
      border-radius: 6px;
    }
    .cluster rect {
      rx: 10;
      ry: 10;
    }
  `,
} satisfies Partial<MermaidConfig>;

const lightThemeVariables = {
  darkMode: false,
  background: 'transparent',
  primaryColor: '#eef2ff',
  primaryTextColor: '#1e1b4b',
  primaryBorderColor: '#a5b4fc',
  secondaryColor: '#faf5ff',
  secondaryTextColor: '#581c87',
  secondaryBorderColor: '#d8b4fe',
  tertiaryColor: '#fffbeb',
  tertiaryTextColor: '#78350f',
  tertiaryBorderColor: '#fcd34d',
  lineColor: '#737373',
  textColor: '#171717',
  mainBkg: '#eef2ff',
  nodeBorder: '#a5b4fc',
  clusterBkg: '#f5f5f5',
  clusterBorder: '#d4d4d4',
  edgeLabelBackground: '#fafafa',
  titleColor: '#171717',
  fontSize: '14px',
};

const darkThemeVariables = {
  darkMode: true,
  background: 'transparent',
  primaryColor: '#1e1b4b',
  primaryTextColor: '#e0e7ff',
  primaryBorderColor: '#6366f1',
  secondaryColor: '#3b0764',
  secondaryTextColor: '#f5d0fe',
  secondaryBorderColor: '#a855f7',
  tertiaryColor: '#451a03',
  tertiaryTextColor: '#fde68a',
  tertiaryBorderColor: '#f59e0b',
  lineColor: '#a3a3a3',
  textColor: '#ebebeb',
  mainBkg: '#1e1b4b',
  nodeBorder: '#6366f1',
  clusterBkg: '#171717',
  clusterBorder: '#404040',
  edgeLabelBackground: '#262626',
  titleColor: '#fafafa',
  fontSize: '14px',
};

export function getMermaidConfig(theme: string | undefined): MermaidConfig {
  const isDark = theme === 'dark';

  return {
    ...sharedConfig,
    theme: 'base',
    themeVariables: isDark ? darkThemeVariables : lightThemeVariables,
  };
}
