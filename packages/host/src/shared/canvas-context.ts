import { singleton } from '@momots/core';

import { isSSR } from '../guard';

export const ctx = singleton(Symbol.for('@momots/canvas-context'), () => {
  if (isSSR()) return null;
  try {
    const el = document.createElement('canvas');
    return el.getContext('2d');
  } catch {
    return null;
  }
});
