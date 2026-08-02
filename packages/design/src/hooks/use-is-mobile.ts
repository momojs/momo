import { useIsBreakpoint } from './use-is-breakpoint.js';

export function useIsMobile() {
  return useIsBreakpoint() ?? false;
}
