import { createCn } from 'cn/config';
import { defineConfig } from 'cva';

const onComplete = createCn({
  extend: {
    classGroups: {
      // Register the --text-* tokens from themes/semantic.css as font sizes.
      'font-size': [
        {
          text: [
            'momo-display-xl',
            'momo-display-lg',
            'momo-display-md',
            'momo-display-sm',
            'momo-title-lg',
            'momo-title-md',
            'momo-title-sm',
            'momo-body-md',
            'momo-body-sm',
            'momo-caption',
            'momo-caption-uppercase',
            'momo-code',
            'momo-button',
            'momo-nav-link',
          ],
        },
      ],
    },
  },
});

export const { cva, cx } = defineConfig({
  hooks: { onComplete },
});
