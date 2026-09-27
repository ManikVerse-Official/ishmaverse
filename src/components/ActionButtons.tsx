import { Rocket, Code, Pencil, ChevronRight } from 'lucide-react';

const actions = [
  { 
    id: '1', 
    title: 'Discover New Releases', 
    icon: <Rocket className="w-8 h-8" /> 
  },
  { 
    id: '2', 
    title: 'Custom Scripts (AutoCAD AI Focus)', 
    icon: <Code className="w-8 h-8" /> 
  },
  { 
    id: '3', 
    title: 'Get a Custom Design Quote', 
    icon: <Pencil className="w-8 h-8" /> 
  },
];

export const ActionButtons: React.FC = () => {
  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-4">
        {actions.map((action) => (
          <button 
            key={action.id}
            className="group relative w-full text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-neon-purple via-purple-500 to-neon-purple rounded-2xl blur opacity-50 group-hover:opacity-100 transition duration-300" />
            <div className="relative flex items-center gap-4 sm:gap-6 bg-bg-dark-end border border-neon-purple/40 rounded-2xl px-5 sm:px-8 py-5 sm:py-6 group-hover:border-neon-purple transition-all duration-300">
              <div className="flex-shrink-0 text-neon-purple drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                {action.icon}
              </div>
              <h3 className="flex-1 text-lg sm:text-xl lg:text-2xl font-bold text-white group-hover:text-neon-purple transition-colors">
                {action.title}
              </h3>
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-neon-purple drop-shadow-[0_0_8px_rgba(139,92,246,0.5)] group-hover:translate-x-1 transition-transform duration-300" />
              <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                <div className="absolute bottom-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-neon-purple/25 rounded-full blur-3xl" />
                <div className="absolute top-0 right-10 sm:right-20 w-16 h-16 sm:w-24 sm:h-24 bg-purple-500/15 rounded-full blur-2xl" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
