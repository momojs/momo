import { useInsertionEffect, useLayoutEffect } from 'react';

// Use the earliest effect possible to reset the ref below.
export const useEarlyEffect: typeof useLayoutEffect =
  typeof document !== 'undefined'
    ? (useInsertionEffect ?? useLayoutEffect)
    : () => void 0;
