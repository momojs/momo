import { useCallback, useEffect, useRef, useState } from 'react';

export type PresenceGateKey = string | number | symbol;

export type PresenceGateExitHandler = () => void;

export type UsePresenceGateResult = {
  /**
   * Controls whether the root presence tree should stay mounted.
   * It turns on immediately when `open` is true, and stays true after
   * `open` becomes false until every registered gate reports exit complete.
   */
  visible: boolean;
  /**
   * Creates an `onExitComplete` callback for a child `AnimatePresence`.
   * Call it while rendering each child presence that should delay root unmount.
   *
   * Unkeyed gates are tracked by call order, so keep those calls stable across
   * renders. Use `createGate(key)` for dynamic or conditional child presences.
   */
  createGate: (key?: PresenceGateKey) => PresenceGateExitHandler;
};

type InternalGateKey = PresenceGateKey;

/**
 * Coordinates nested `AnimatePresence` exit animations.
 *
 * Motion can only unmount a parent after its own exit completes, but nested
 * exit animations often need to finish from the inside out. This hook keeps the
 * root mounted through `visible` until all child gates created by `createGate`
 * have called their `onExitComplete` handlers.
 */
export function usePresenceGate(open: boolean): UsePresenceGateResult {
  const [retained, setRetained] = useState(open);

  const openRef = useRef(open);
  const pendingGates = useRef(new Set<InternalGateKey>());
  const renderedGates = useRef(new Set<InternalGateKey>());
  const gateCallbacks = useRef(
    new Map<InternalGateKey, PresenceGateExitHandler>(),
  );
  const slotGateKeys = useRef<symbol[]>([]);
  const slotCursor = useRef(0);

  const visible = open || retained;
  const closing = !open && retained;

  // Keep async gate callbacks aligned with the latest render, even if a very
  // short exit animation completes before effects run.
  openRef.current = open;

  // `createGate()` may be called multiple times during render. Reset the slot
  // cursor so unkeyed gates keep stable identities by call order.
  slotCursor.current = 0;
  renderedGates.current = new Set();

  const maybeReleaseRoot = useCallback(() => {
    if (!openRef.current && pendingGates.current.size === 0) {
      setRetained(false);
    }
  }, []);

  const createGate = useCallback(
    (key?: PresenceGateKey) => {
      let gateKey: InternalGateKey;

      if (key === undefined) {
        const slotIndex = slotCursor.current++;
        slotGateKeys.current[slotIndex] ??= Symbol(
          `momo_presence_gate_slot_${slotIndex}`,
        );
        gateKey = slotGateKeys.current[slotIndex];
      } else {
        gateKey = key;
      }

      renderedGates.current.add(gateKey);

      if (closing) {
        pendingGates.current.add(gateKey);
      }

      const existing = gateCallbacks.current.get(gateKey);
      if (existing) return existing;

      const completeGate = () => {
        if (!pendingGates.current.delete(gateKey)) return;
        maybeReleaseRoot();
      };

      gateCallbacks.current.set(gateKey, completeGate);
      return completeGate;
    },
    [closing, maybeReleaseRoot],
  );

  useEffect(() => {
    if (open) {
      pendingGates.current.clear();
      setRetained(true);
      return;
    }

    if (!retained) return;

    // If a gate disappears during the closing render, it can no longer call
    // `onExitComplete`; prune it so the root is not retained forever.
    for (const gateKey of pendingGates.current) {
      if (!renderedGates.current.has(gateKey)) {
        pendingGates.current.delete(gateKey);
      }
    }

    maybeReleaseRoot();
  }, [maybeReleaseRoot, open, retained]);

  return {
    visible,
    createGate,
  };
}
