import { cx } from '@momots/design';
import type { Variants } from 'motion/react';
import { motion, usePresenceData } from 'motion/react';

export type PageDirection = 1 | -1;

const variants = {
  initial: (direction: PageDirection) => ({
    translateX: `${direction * 30}%`,
    opacity: 0,
  }),
  visible: {
    translateX: '0%',
    opacity: 1,
  },
  hidden: (direction: PageDirection) => ({
    translateX: `${direction * -30}%`,
    opacity: 0,
  }),
} satisfies Variants;

export function Page({
  children,
  className,
  ...props
}: React.ComponentProps<typeof motion.main>) {
  return (
    <motion.main
      exit='hidden'
      initial='initial'
      animate='visible'
      variants={variants}
      custom={usePresenceData()}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className={cx('size-full overflow-y-auto overflow-x-hidden', className)}
      {...props}
    >
      {children}
    </motion.main>
  );
}
