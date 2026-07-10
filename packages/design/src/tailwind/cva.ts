import { defineConfig } from 'cva';
import { extendTailwindMerge } from 'tailwind-merge';

const merge = extendTailwindMerge({
  extend: {
    classGroups: {},
  },
});

export const { cva, cx } = defineConfig({
  hooks: { onComplete: (name) => merge(name) },
});
