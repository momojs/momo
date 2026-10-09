import { describe, expect, test } from 'bun:test';

// Existing server-rendering cases remain separate from browser component cases.
describe('Alert SSR', () => {
  test.each([
    false,
    true,
  ])('composes custom elements with default styles and content (shorthand: %s)', (shorthand) => {
    const result = Bun.spawnSync({
      cmd: [
        process.execPath,
        '--eval',
        `
        import { createElement as h } from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { Alert } from ${JSON.stringify(new URL('./alert.tsx', import.meta.url).href)};
        process.stdout.write(renderToStaticMarkup(h(Alert, {
          title: 0, description: '', action: 'Open', icon: '!',
          slots: {
            title: ${shorthand} ? h('h3', { className: 'render-class slot-class' }) : { render: h('h3', { className: 'render-class' }), className: 'slot-class' },
            content: ${shorthand} ? (props, state) => h('section', { ...props, 'data-state-keys': Object.keys(state).join(',') }) : undefined,
            description: ${shorthand} ? (props) => h('p', props) : undefined,
            icon: ${shorthand} ? h('i') : undefined,
            action: ${shorthand} ? h('a', { href: '/activity' }) : { render: h('a', { href: '/activity' }) },
          },
        })));
      `,
      ],
      cwd: new URL('../..', import.meta.url).pathname,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    expect(new TextDecoder().decode(result.stderr)).toBe('');
    expect(result.exitCode).toBe(0);
    const markup = new TextDecoder().decode(result.stdout);
    expect(markup).toMatch(/<h3[^>]*data-slot="alert-title"[^>]*>0<\/h3>/);
    expect(markup).toContain('font-medium');
    expect(markup).toContain('render-class');
    expect(markup).toContain('slot-class');
    expect(markup).toContain('data-slot="alert-description"');
    expect(markup).toContain('href="/activity"');
    expect(markup).toContain('>Open</a>');
    expect(markup).toContain('aria-hidden="true"');
    if (shorthand) expect(markup).toContain('data-state-keys=""');
  });
});
