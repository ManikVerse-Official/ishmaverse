import { useEffect, useRef, useState } from 'react';

export type SmartImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

/**
 * Image that never blocks the initial render.
 *
 * It is lazy-loaded (`loading="lazy"`), decoded off the main thread
 * (`decoding="async"`), and fades in subtly once it has finished loading so
 * late-arriving images feel intentional instead of jarring. Any props passed in
 * (including an explicit `loading`/`decoding`) still win.
 */
export const SmartImage: React.FC<SmartImageProps> = ({
  className = '',
  loading = 'lazy',
  decoding = 'async',
  onLoad,
  onError,
  ...props
}) => {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // A cached image can finish loading before React attaches its onLoad handler,
  // so probe `complete` once on mount to avoid a permanently invisible image.
  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);

  return (
    <img
      {...props}
      ref={ref}
      loading={loading}
      decoding={decoding}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
      onError={(event) => {
        setLoaded(true);
        onError?.(event);
      }}
      className={`${className} transition-opacity duration-500 ${
        loaded ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
};
