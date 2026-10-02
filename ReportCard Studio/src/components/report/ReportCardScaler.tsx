import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A4 is 210mm wide — wider than any phone. Instead of forcing the user to
 * scroll sideways, the preview is scaled down to the available width while
 * keeping the exact A4 proportions (the PDF is unaffected).
 */
const A4_WIDTH_PX = (210 / 25.4) * 96; // 210mm at 96dpi ≈ 793.7px

export default function ReportCardScaler({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [naturalHeight, setNaturalHeight] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const measure = () => {
      const available = element.clientWidth;
      if (available <= 0) return;
      setScale(Math.min(1, available / A4_WIDTH_PX));
      const sheet = element.firstElementChild as HTMLElement | null;
      if (sheet) setNaturalHeight(sheet.offsetHeight);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    const sheet = element.firstElementChild as HTMLElement | null;
    if (sheet) observer.observe(sheet);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [children]);

  useEffect(() => {
    if (naturalHeight > 0) setHeight(naturalHeight * scale);
  }, [naturalHeight, scale]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <div
        style={{
          width: '210mm',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          height,
        }}
      >
        {children}
      </div>
    </div>
  );
}
