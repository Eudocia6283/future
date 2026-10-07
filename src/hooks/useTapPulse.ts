import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * Touch screens cannot hover, so a tap briefly toggles `data-pulse` on the
 * element instead. Pair every `hover:` / `group-hover:` style that should be
 * reachable on touch with a matching `data-pulse:` / `group-data-pulse:` one;
 * the effect plays in, holds for `duration` ms, then eases back out.
 *
 * Browsers only dispatch `click` for a genuine single-finger tap (never after
 * a pan, scroll or multi-touch), which is exactly the gesture we want here.
 */
export function useTapPulse<T extends HTMLElement>(duration = 800) {
  const [isPulsing, setIsPulsing] = useState(false);
  const pointerTypeRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const pulse = useCallback(() => {
    clearTimeout(timerRef.current);
    setIsPulsing(true);
    timerRef.current = setTimeout(() => setIsPulsing(false), duration);
  }, [duration]);

  const onPointerDown = useCallback((e: React.PointerEvent<T>) => {
    pointerTypeRef.current = e.pointerType;
  }, []);

  /** Returns true when the click came from a touch/pen tap and a pulse started. */
  const handleTap = useCallback(
    (e: React.MouseEvent<T>) => {
      // Mouse users already get the hover state; `detail === 0` is keyboard activation.
      if (pointerTypeRef.current === "mouse" || e.detail === 0) return false;
      pulse();
      return true;
    },
    [pulse],
  );

  return {
    handleTap,
    pulseProps: {
      onPointerDown,
      "data-pulse": isPulsing || undefined,
    },
  };
}
