import { useCallback, useRef, ReactNode, CSSProperties } from 'react';

interface TiltCardProps {
  children: ReactNode;
  /** Extra classes for the wrapper (e.g. rounded corners). */
  className?: string;
  /** Glow colour applied while hovering (any CSS colour). */
  glow?: string;
  /** Maximum rotation in degrees. */
  intensity?: number;
  /** Lift, in pixels, applied while hovering. */
  lift?: number;
  /** Inline style merged onto the wrapper. */
  style?: CSSProperties;
}

const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const TRANSITION = 'transform 300ms ease-out, box-shadow 300ms ease';

/**
 * A premium, mouse-following 3D tilt card.
 *
 * Performance: the transform is written straight to the element's `style` inside
 * a single requestAnimationFrame per frame, so moving the pointer never triggers
 * a React re-render (the old version set state on every mousemove, which made
 * grids of cards feel laggy). It also honours `prefers-reduced-motion`.
 */
export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  glow,
  intensity = 7,
  lift = 6,
  style,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const handleEnter = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transition = TRANSITION;
  }, []);

  const handleMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion()) return;
      const el = ref.current;
      if (!el || rafRef.current !== null) return;

      const { clientX, clientY } = event;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const px = (clientX - rect.left) / rect.width;
        const py = (clientY - rect.top) / rect.height;
        const rotateY = (px - 0.5) * 2 * intensity;
        const rotateX = -(py - 0.5) * 2 * intensity;

        el.style.transition = 'none';
        el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(1.02) translateY(-${lift}px)`;
        if (glow) el.style.boxShadow = `0 28px 70px ${glow}`;
      });
    },
    [glow, intensity, lift],
  );

  const handleLeave = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const el = ref.current;
    if (!el) return;
    el.style.transition = TRANSITION;
    el.style.transform = '';
    el.style.boxShadow = '';
  }, []);

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={style}
    >
      {children}
    </div>
  );
};
