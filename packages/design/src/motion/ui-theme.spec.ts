import { describe, expect, test } from 'bun:test';

import {
  defaultTheme,
  defineTheme,
  resolveReducedMotion,
  themeToCssVars,
} from './ui-theme';

describe('Motion UI theme', () => {
  test('merges partial tokens while preserving the complete vocabulary', () => {
    const theme = defineTheme({
      transitions: { ui: { stiffness: 500 } },
      travel: { enter: 12 },
      inView: { once: false },
    });
    expect(theme.transitions.ui).toEqual({
      ...defaultTheme.transitions.ui,
      stiffness: 500,
    });
    expect(theme.transitions.snap).toEqual(defaultTheme.transitions.snap);
    expect(theme.travel).toEqual({ ...defaultTheme.travel, enter: 12 });
    expect(theme.inView).toEqual({ ...defaultTheme.inView, once: false });
    expect(theme.stagger).toEqual(defaultTheme.stagger);
  });

  test('replaces an ease tuple as a whole and ignores omitted values', () => {
    const ease = [0.1, 0.2, 0.3, 0.4] as const;
    const theme = defineTheme({
      transitions: { ui: { ease, duration: undefined } },
    });
    expect(theme.transitions.ui.ease).toEqual(ease);
    expect(theme.transitions.ui.ease).not.toBe(ease);
    expect(theme.transitions.ui.duration).toBe(
      defaultTheme.transitions.ui.duration,
    );
  });

  test('resolved themes never mutate defaults, other themes, or caller config', () => {
    const before = structuredClone(defaultTheme);
    const config = { transitions: { ui: { stiffness: 500 } } };
    const first = defineTheme(config);
    const second = defineTheme();
    first.transitions.ui.stiffness = 1;
    first.transitions.snap.duration = 9;
    first.travel.enter = 999;
    first.stagger.base = 999;
    expect(defaultTheme).toEqual(before);
    expect(second).toEqual(before);
    expect(config.transitions.ui.stiffness).toBe(500);
  });

  test('resolves full, calm, and off from user preference and configured strategy', () => {
    expect(resolveReducedMotion(defaultTheme, false)).toEqual({
      strategy: 'full',
      animate: true,
      travel: true,
      opacityOnly: false,
    });
    expect(resolveReducedMotion(defaultTheme, true)).toEqual({
      strategy: 'calm',
      animate: true,
      travel: false,
      opacityOnly: true,
    });
    const off = defineTheme({ reducedMotion: 'off' });
    expect(resolveReducedMotion(off, true)).toEqual({
      strategy: 'off',
      animate: false,
      travel: false,
      opacityOnly: false,
    });
    expect(resolveReducedMotion(off, false).strategy).toBe('full');
  });

  test('emits the active theme as CSS fade, spring, stagger, and travel values', () => {
    const theme = defineTheme({
      transitions: { ui: { duration: 0.4, ease: [0.1, 0.2, 0.3, 0.4] } },
      stagger: { base: 0.12 },
      travel: { enter: 12 },
    });
    const vars = themeToCssVars(theme);
    expect(vars['--motion-ui-transition-ui']).toBe(
      'cubic-bezier(0.1, 0.2, 0.3, 0.4)',
    );
    expect(vars['--motion-ui-transition-ui-duration']).toBe('0.4s');
    expect(vars['--motion-ui-transition-ui-spring']).toStartWith('linear(');
    expect(
      Number.parseFloat(vars['--motion-ui-transition-ui-spring-duration']!),
    ).toBeGreaterThan(0);
    expect(vars['--motion-ui-stagger-base']).toBe('0.12s');
    expect(vars['--motion-ui-travel-enter']).toBe('12px');
  });

  test('renders defaults without a provider during SSR with real React', async () => {
    // Existing component specs mock React globally. A fresh process keeps this
    // assertion on the actual server renderer regardless of suite ordering.
    const result = Bun.spawn({
      cmd: [
        process.execPath,
        '-e',
        `
        import { createElement } from 'react';
        import { renderToStaticMarkup } from 'react-dom/server';
        import { defaultTheme, useMotionUITheme, useMotionUITransition } from ${JSON.stringify(new URL('./ui-theme.ts', import.meta.url).pathname)};
        function Probe() {
          const theme = useMotionUITheme();
          const transition = useMotionUITransition('ui');
          return createElement('output', {
            'data-mode': theme.motionMode,
            'data-duration': transition.duration,
            'data-travel': theme.travel.enter,
          });
        }
        console.log(renderToStaticMarkup(createElement(Probe)));
      `,
      ],
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const output = await new Response(result.stdout).text();
    const errors = await new Response(result.stderr).text();
    expect(await result.exited).toBe(0);
    expect(errors).toBe('');
    expect(output).toContain('data-mode="full"');
    expect(output).toContain(
      `data-duration="${defaultTheme.transitions.ui.duration}"`,
    );
    expect(output).toContain(`data-travel="${defaultTheme.travel.enter}"`);
  });
});
