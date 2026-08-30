import { defineConfig } from '@momots/cli';

export default defineConfig({
  build: {
    assets: {
      'assets/tailwind.css': 'tailwind.css',
    },
    banner: "'use client';",
    target: 'browser',
    packages: 'external',
    splitting: true,
  },
  tarball: {
    imports: [
      '.',
      './components/alert',
      './components/button',
      './components/toast',
      './effects',
      './hooks',
      './shared',
      './tailwind',
    ],
    identities: [
      { export: 'Alert', from: ['.', './components/alert'] },
      { export: 'Button', from: ['.', './components/button'] },
      { export: 'ToastRoot', from: ['.', './components/toast'] },
      { export: 'ToastProvider', from: ['.', './components/toast'] },
      { export: 'createToastManager', from: ['.', './components/toast'] },
      { export: 'useToast', from: ['.', './components/toast'] },
      { export: 'Highlight', from: ['.', './effects'] },
      { export: 'useControllableValue', from: ['.', './hooks'] },
      { export: 'render', from: ['.', './shared'] },
      { export: 'cx', from: ['.', './tailwind'] },
    ],
    check: async (context) => {
      const { checkDesignTarball } = await import(
        './scripts/tarball-clean-check'
      );
      await checkDesignTarball(context);
    },
  },
});
