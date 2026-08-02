import type { IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';

export function Icon({ icon }: { icon: IconSvgElement }) {
  return <HugeiconsIcon icon={icon} size={22} strokeWidth={1.8} aria-hidden />;
}
