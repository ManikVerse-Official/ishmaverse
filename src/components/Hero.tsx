import { useBrand } from '../context/BrandContext';
import { SmartImage } from './SmartImage';

export const Hero: React.FC = () => {
  const { brand } = useBrand();

  return (
    <section className="py-10 sm:py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-center">
          {/* Left content */}
          <div className="flex-1 text-center md:text-left space-y-6 md:space-y-8 w-full">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
                <span className="text-white block">WELCOME TO</span>
                <span className="bg-gradient-to-r from-white via-neon-purple to-purple-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                  {brand.site_name.toUpperCase()}
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-300 font-medium">
                THE DIGITAL MALL - TECH, ART, COMICS, EDUCATION
              </p>
            </div>
          </div>
          
          {/* Right content (Hexagon logo) */}
          <div className="flex-1 flex justify-center w-full">
            <div className="relative">
              {/* Particle aura */}
              <div className="absolute inset-0 animate-pulse">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 sm:w-8 sm:h-8 bg-neon-purple rounded-full opacity-60 blur-sm"></div>
                <div className="absolute top-1/4 right-0 w-4 h-4 sm:w-6 sm:h-6 bg-purple-400 rounded-full opacity-50 blur-sm"></div>
                <div className="absolute bottom-0 left-1/4 w-8 h-8 sm:w-10 sm:h-10 bg-neon-purple rounded-full opacity-40 blur-sm"></div>
                <div className="absolute bottom-1/4 right-1/4 w-5 h-5 sm:w-7 sm:h-7 bg-purple-500 rounded-full opacity-50 blur-sm"></div>
                <div className="absolute top-1/2 left-0 w-6 h-6 sm:w-9 sm:h-9 bg-purple-400 rounded-full opacity-60 blur-sm"></div>
              </div>
              
              {/* Glowing hexagon */}
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96">
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-[0_0_30px_rgba(139,92,246,0.7)]">
                  <polygon 
                    points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" 
                    fill="none" 
                    stroke="#8b5cf6" 
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                  <polygon 
                    points="50,10 90,30 90,70 50,90 10,70 10,30" 
                    fill="#1a0b2e" 
                    stroke="#8b5cf6" 
                    strokeWidth="1"
                    className="drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                  />
                </svg>
                
                {/* Logo inside hexagon */}
                <div className="absolute inset-0 flex items-center justify-center p-6 sm:p-10">
                  <SmartImage
                    src={brand.logo_url}
                    alt={brand.site_name}
                    className="w-full h-full object-contain mix-blend-screen drop-shadow-[0_0_25px_rgba(139,92,246,0.8)] bg-transparent border-0 shadow-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
