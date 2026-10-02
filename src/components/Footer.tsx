import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-bg-dark-end border-t border-neon-purple/30 mt-16 py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <div className="flex flex-wrap justify-center gap-4 sm:gap-8 mb-6">
          <Link to="/terms" className="text-gray-400 hover:text-neon-purple transition-colors text-sm sm:text-base">TERMS &amp; CONDITIONS</Link>
          <Link to="/privacy" className="text-gray-400 hover:text-neon-purple transition-colors text-sm sm:text-base">PRIVACY</Link>
        </div>

        {/* Founder credit — subtle trust signal, opens the in-app founder page. */}
        <Link
          to="/founder"
          className="group inline-flex items-center gap-2 text-xs sm:text-sm text-gray-500 hover:text-neon-purple transition-colors mb-4"
        >
          <span className="h-px w-6 bg-gray-700 group-hover:bg-neon-purple transition-colors" aria-hidden />
          Meet the Founder
          <span className="h-px w-6 bg-gray-700 group-hover:bg-neon-purple transition-colors" aria-hidden />
        </Link>

        <p className="text-gray-500 text-sm">© {currentYear}. ALL RIGHTS RESERVED.</p>
      </div>
    </footer>
  );
};
