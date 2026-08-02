import { motion } from 'motion/react';

import { swap } from '../shared/index.js';

export const Spinner: React.FC<React.ComponentProps<typeof motion.svg>> = (
  props,
) => (
  <motion.svg
    data-wui='spinner'
    initial={swap.initial}
    exit={swap.exit}
    animate={{
      scale: 1,
      opacity: 1,
      filter: 'blur(0px)',
      rotate: [0, 180, 360],
    }}
    transition={{
      type: 'spring',
      stiffness: 100,
      damping: 10,
      rotate: {
        duration: 1.8,
        repeat: Infinity,
        ease: 'linear',
      },
    }}
    width='1em'
    height='1em'
    stroke='currentColor'
    style={{ lineHeight: '1em', display: 'inline-flex' }}
    viewBox='22 22 44 44'
    {...props}
  >
    <motion.circle
      animate={{
        strokeDasharray: ['1px, 200px', '100px, 200px', '100px, 200px'],
        strokeDashoffset: ['0px', '-15px', '-125px'],
        transition: {
          duration: 1.8,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
      cx={44}
      cy={44}
      fill={'none'}
      initial={{
        strokeDasharray: '1px, 200px',
        strokeDashoffset: '0px',
      }}
      r={18}
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={6.4}
    />
  </motion.svg>
);
