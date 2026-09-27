import { motion } from 'framer-motion';
import { GreetingFrame } from '../types';
import { SmartImage } from './SmartImage';

interface PhotoFrameProps {
  frame: GreetingFrame;
  accent: string;
  glow: string;
  src: string;
  alt: string;
  /** Extra classes control the frame's size (height/aspect) from the caller. */
  className?: string;
  /** Tighter padding for the in-form live preview. */
  compact?: boolean;
}

const Overlay: React.FC<{ accent: string }> = ({ accent }) => (
  <div
    className="pointer-events-none absolute inset-0"
    style={{
      background: `linear-gradient(135deg, ${accent}33 0%, transparent 45%, rgba(0,0,0,0.28) 100%)`,
    }}
  />
);

export const PhotoFrame: React.FC<PhotoFrameProps> = ({
  frame,
  accent,
  glow,
  src,
  alt,
  className = '',
  compact = false,
}) => {
  const image = (
    <SmartImage
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      draggable={false}
    />
  );

  switch (frame) {
    case 'polaroid':
      return (
        <motion.div
          initial={{ rotate: -2.5, opacity: 0, y: 12 }}
          animate={{ rotate: -2.5, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          whileHover={{ rotate: 0, scale: 1.01 }}
          className={`relative bg-white ${compact ? 'p-2 pb-8' : 'p-3 pb-14'} rounded-[10px] shadow-2xl ${className}`}
          style={{ boxShadow: `0 22px 60px ${glow}, 0 4px 12px rgba(0,0,0,0.4)` }}
        >
          <div className="relative overflow-hidden rounded-[6px] bg-black/10 w-full h-full">
            {image}
            <Overlay accent={accent} />
          </div>
          <div
            className="absolute bottom-2 left-0 right-0 text-center uppercase tracking-[0.3em]"
            style={{ color: '#9ca3af', fontFamily: "'Caveat', cursive", fontSize: compact ? 11 : 14 }}
          >
            with love
          </div>
        </motion.div>
      );

    case 'gold':
      return (
        <div
          className={`relative rounded-2xl p-[3px] ${className}`}
          style={{
            background: 'linear-gradient(135deg,#fef3c7 0%,#f59e0b 35%,#fde68a 55%,#b45309 100%)',
            boxShadow: `0 22px 60px ${glow}`,
          }}
        >
          <div className="rounded-[13px] p-[3px]" style={{ background: 'rgba(24,16,4,0.55)' }}>
            <div className="relative overflow-hidden rounded-[10px] w-full h-full">
              {image}
              <Overlay accent={accent} />
            </div>
          </div>
        </div>
      );

    case 'neon':
      return (
        <div
          className={`relative rounded-2xl p-[2px] ${className}`}
          style={{
            border: `1.5px solid ${accent}`,
            background: 'rgba(8,4,18,0.6)',
            boxShadow: `0 0 26px ${glow}, inset 0 0 18px ${glow}`,
          }}
        >
          {/* Compositor-friendly pulse instead of animating box-shadow values. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl animate-pulse"
            style={{ boxShadow: `0 0 44px ${glow}` }}
          />
          <div className="relative overflow-hidden rounded-[14px] w-full h-full">
            {image}
            <Overlay accent={accent} />
          </div>
        </div>
      );

    case 'elegant':
      return (
        <div
          className={`relative ${compact ? 'p-1.5' : 'p-2.5'} rounded-2xl ${className}`}
          style={{ border: `1px solid ${accent}66` }}
        >
          <div
            className="relative overflow-hidden rounded-xl w-full h-full"
            style={{ border: `1px solid ${accent}99`, boxShadow: `0 18px 46px ${glow}` }}
          >
            {image}
            <Overlay accent={accent} />
          </div>
          {[
            'top-1 left-1 border-t border-l',
            'top-1 right-1 border-t border-r',
            'bottom-1 left-1 border-b border-l',
            'bottom-1 right-1 border-b border-r',
          ].map((position) => (
            <span
              key={position}
              className={`pointer-events-none absolute w-3 h-3 ${position}`}
              style={{ borderColor: accent }}
            />
          ))}
        </div>
      );

    case 'vintage':
      return (
        <div
          className={`relative ${compact ? 'p-1.5' : 'p-2.5'} rounded-md ${className}`}
          style={{ background: 'linear-gradient(135deg,#f5e6c8,#e0c9a6)', border: '1px solid #b89b72' }}
        >
          <div
            className="relative overflow-hidden rounded-sm w-full h-full"
            style={{ boxShadow: 'inset 0 0 34px rgba(80,50,20,0.45)' }}
          >
            <SmartImage
              src={src}
              alt={alt}
              className="w-full h-full object-cover sepia-[.28] contrast-[1.05]"
              draggable={false}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(circle at 50% 40%, transparent 40%, rgba(70,40,10,0.4) 100%)' }}
            />
          </div>
        </div>
      );

    case 'soft':
    default:
      return (
        <div
          className={`relative overflow-hidden rounded-2xl ${className}`}
          style={{ border: '1px solid rgba(255,255,255,0.18)', boxShadow: `0 18px 50px ${glow}` }}
        >
          {image}
          <Overlay accent={accent} />
        </div>
      );
  }
};
