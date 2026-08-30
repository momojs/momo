import { defineConfig } from '@momots/cli';

export default defineConfig({
  build: {
    bundle: ['@momots/host'],
    splitting: true,
    target: 'browser',
  },
  tarball: {
    forbidImports: ['@momots/host'],
    identities: [
      { export: 'Drive', from: ['.', './core'] },
      { export: 'DriveContext', from: ['.', './context'] },
      { export: 'parser', from: ['.', './parser'] },
      { export: 'isRawTextBody', from: ['.', './parser'] },
      { export: 'repeat', from: ['.', './stages', './stages/repeat'] },
    ],
    check: async (context) => {
      const { checkDriveTarball } = await import(
        './scripts/tarball-clean-check'
      );
      await checkDriveTarball(context);
    },
  },
});
