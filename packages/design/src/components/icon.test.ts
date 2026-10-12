import { describe, expect, test } from 'bun:test';

function renderIcons(source: string) {
  // Other component suites mock React hooks; keep SSR on the real runtime.
  const result = Bun.spawnSync({
    cmd: [
      process.execPath,
      '--eval',
      `
        import { createElement } from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
        import { Icon } from ${JSON.stringify(new URL('./icon.tsx', import.meta.url).href)};
        const render = (props) => renderToStaticMarkup(createElement(Icon, props));
        ${source}
      `,
    ],
    cwd: new URL('../..', import.meta.url).pathname,
    stderr: 'pipe',
    stdout: 'pipe',
  });
  const stderr = new TextDecoder().decode(result.stderr);
  if (result.exitCode !== 0) throw new Error(stderr);
  expect(stderr).toBe('');
  return new TextDecoder().decode(result.stdout);
}

describe('Icon', () => {
  test('renders a complete decorative Hugeicon during SSR without browser globals', () => {
    const markup = renderIcons(`
      process.stdout.write(render({ icon: CheckmarkCircle02Icon }));
    `);

    expect(markup).toContain('data-slot="icon"');
    expect(markup).toContain('width="18" height="18"');
    expect(markup).toContain('stroke="currentColor"');
    expect(markup).toContain('stroke-width="1.8"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('focusable="false"');
    expect(markup).toMatch(/<path d="M[^\"]+"/);
    expect(markup.match(/<path /g)).toHaveLength(1);
    expect(markup).not.toContain('<title>');
  });

  test('accepts path data and forwards presentation props with morph disabled', () => {
    const markup = renderIcons(`
      process.stdout.write(render({
        icon: 'M4 6h16M4 12h16', morph: false,
        size: '1em', strokeWidth: 2, color: 'red',
        className: 'custom-icon', id: 'menu',
      }));
    `);

    expect(markup).toContain('<path d="M4 6h16M4 12h16"');
    expect(markup).toContain('width="1em" height="1em"');
    expect(markup).toContain('stroke="red"');
    expect(markup).toContain('stroke-width="2"');
    expect(markup).toContain('class="custom-icon"');
    expect(markup).toContain('id="menu"');
    expect(markup).not.toContain('morph=');
  });

  test('exposes a name through label, aria-label, or aria-labelledby', () => {
    const result = JSON.parse(
      renderIcons(`
      process.stdout.write(JSON.stringify([
        render({ icon: CheckmarkCircle02Icon, label: 'Saved & synced' }),
        render({ icon: CheckmarkCircle02Icon, 'aria-label': 'Saved' }),
        render({ icon: CheckmarkCircle02Icon, 'aria-labelledby': 'status-label' }),
      ]));
    `),
    ) as string[];

    for (const markup of result) {
      expect(markup).toContain('role="img"');
      expect(markup).not.toContain('aria-hidden="true"');
    }
    expect(result[0]).toContain('<title>Saved &amp; synced</title>');
    expect(result[1]).toContain('aria-label="Saved"');
    expect(result[2]).toContain('aria-labelledby="status-label"');
  });
});
