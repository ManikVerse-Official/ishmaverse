import { GreetingTier } from '../types';

interface CategoryEffectsProps {
  categoryId: string;
  tier: GreetingTier;
  /** Theme accent used to tint sparks and the candle. */
  accent: string;
  /** Compact (in-form) previews skip the ambience to stay light. */
  compact?: boolean;
}

/**
 * Deterministic pseudo-random in [0,1) so positions and delays stay stable
 * across re-renders (no hydration jitter, no re-scattering on every keystroke).
 */
const rand = (seed: number): number => {
  const x = Math.sin(seed * 9973.13) * 10000;
  return x - Math.floor(x);
};

/** Premium birthday candle — CSS-only, flickers and brightens on hover. */
const Candle: React.FC<{ accent: string }> = ({ accent }) => (
  <div className="css-candle" aria-hidden title="Make a wish">
    <div
      className="css-candle-flame"
      style={{
        background: `radial-gradient(circle at 50% 72%, #fff8e1, #fbbf24 55%, ${accent} 100%)`,
      }}
    />
    <div
      className="css-candle-body"
      style={{ background: `linear-gradient(180deg, #fef3c7 0%, ${accent} 130%)` }}
    />
  </div>
);

/**
 * Category-matched ambient animation layer drawn behind the card content.
 *
 * Everything here is pure CSS (keyframes live in index.css) so it stays cheap,
 * works without JavaScript interaction, and is automatically stilled for users
 * who prefer reduced motion.
 */
export const CategoryEffects: React.FC<CategoryEffectsProps> = ({
  categoryId,
  tier,
  accent,
  compact = false,
}) => {
  if (compact) return null;

  const isPremium = tier === 'premium';
  const isElite = tier === 'elite';

  /* ---------------------------- Birthday ---------------------------- */
  if (categoryId === 'birthday') {
    const balloons = isElite ? 8 : isPremium ? 6 : 4;
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: balloons }).map((_, i) => (
          <span
            key={`balloon-${i}`}
            className="card-balloon select-none"
            style={{
              left: `${6 + i * (88 / balloons)}%`,
              fontSize: `${20 + rand(i) * 18}px`,
              animationDuration: `${9 + rand(i + 3) * 6}s`,
              animationDelay: `${-rand(i + 7) * 12}s`,
            }}
          >
            🎈
          </span>
        ))}
        {isPremium && <Candle accent={accent} />}
      </div>
    );
  }

  /* -------------------- Marriage / Anniversary ---------------------- */
  if (categoryId === 'marriage' || categoryId === 'romantic') {
    const petals = isElite ? 10 : isPremium ? 8 : 5;
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: petals }).map((_, i) => (
          <span
            key={`petal-${i}`}
            className="card-petal select-none"
            style={{
              left: `${4 + i * (92 / petals)}%`,
              fontSize: `${13 + rand(i + 1) * 12}px`,
              animationDuration: `${7 + rand(i + 2) * 6}s`,
              animationDelay: `${-rand(i + 5) * 9}s`,
            }}
          >
            {i % 3 === 0 ? '❤️' : '🌸'}
          </span>
        ))}
      </div>
    );
  }

  /* ----------------------------- Festivals -------------------------- */
  if (categoryId === 'festival') {
    const diyas = isElite ? 4 : isPremium ? 3 : 2;
    const sparks = isElite ? 7 : isPremium ? 5 : 3;
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: diyas }).map((_, i) => (
          <span
            key={`diya-${i}`}
            className="card-diya select-none"
            style={{
              left: `${12 + i * (72 / diyas)}%`,
              fontSize: `${18 + rand(i) * 10}px`,
              animationDelay: `${rand(i + 1) * 2}s`,
            }}
          >
            🪔
          </span>
        ))}
        {Array.from({ length: sparks }).map((_, i) => (
          <span
            key={`spark-${i}`}
            className="card-firework select-none"
            style={{
              left: `${8 + rand(i + 4) * 82}%`,
              top: `${10 + rand(i + 6) * 62}%`,
              fontSize: `${13 + rand(i) * 15}px`,
              color: accent,
              animationDelay: `${rand(i + 8) * 4}s`,
            }}
          >
            ✨
          </span>
        ))}
      </div>
    );
  }

  /* --------------------------- Events / Functions -------------------- */
  /* Aurora Nights and the other 'event' themes previously had no ambience, so
   * they read as flat/broken next to the animated categories. */
  if (categoryId === 'event') {
    const sparks = isElite ? 9 : isPremium ? 6 : 4;
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: sparks }).map((_, i) => (
          <span
            key={`event-spark-${i}`}
            className="card-firework select-none"
            style={{
              left: `${8 + rand(i + 2) * 84}%`,
              top: `${8 + rand(i + 9) * 66}%`,
              fontSize: `${13 + rand(i + 3) * 16}px`,
              color: accent,
              animationDelay: `${rand(i + 11) * 4}s`,
            }}
          >
            {i % 3 === 0 ? '✦' : '✨'}
          </span>
        ))}
      </div>
    );
  }

  /* --------------------------- Family & Friends ---------------------- */
  if (categoryId === 'family') {
    const petals = isElite ? 10 : isPremium ? 8 : 5;
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: petals }).map((_, i) => (
          <span
            key={`family-petal-${i}`}
            className="card-petal select-none"
            style={{
              left: `${5 + i * (90 / petals)}%`,
              fontSize: `${13 + rand(i + 4) * 11}px`,
              animationDuration: `${8 + rand(i + 2) * 6}s`,
              animationDelay: `${-rand(i + 6) * 9}s`,
            }}
          >
            {i % 3 === 0 ? '🌿' : '💛'}
          </span>
        ))}
      </div>
    );
  }

  return null;
};
