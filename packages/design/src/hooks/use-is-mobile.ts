import { useIsBreakpoint } from './use-is-breakpoint';

export function useIsMobile() {
  return useIsBreakpoint() ?? false;
}
