import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import UserProfile from '../UserProfile';
import AuthModal from '../AuthModal';
import PoliciesModal from '../PoliciesModal';
import { useAuth } from '../../context/AuthContext';
import FuzzyText from '../FuzzyText';

export default function PublicLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showPolicies, setShowPolicies] = useState(false);
  const [policyTab, setPolicyTab] = useState<'terms' | 'privacy' | 'cookies' | 'refund'>('terms');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLaunch = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      setIsAuthModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white selection:bg-[#D4AF37]/30 font-sans relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[#0D1B2A]/40 backdrop-blur-[1px]"></div>

      {/* Video Background */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-[#0D1B2A]">
        <div className="absolute inset-0 bg-black/30 z-10" />
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/landing-bg.mp4" type="video/mp4" />
        </video>
      </div>

      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-5xl">
        <div className="flex items-center justify-between px-[26px] pt-[11px] pb-[12px] -ml-[5px] mt-[11px] mb-[1px] rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
          <div className="flex items-center gap-2 relative h-8 min-w-[100px]">
            <Link to="/" className="absolute top-1/2 -translate-y-1/2 font-tech font-bold tracking-tighter">
              <FuzzyText
                baseIntensity={0.13}
                hoverIntensity={0.44}
                enableHover={true}
                color="#D4AF37"
                fontSize="1.5rem"
                fontWeight={700}
                fontFamily='"Pixelify Sans", sans-serif'
              >
                :AURALIS
              </FuzzyText>
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-300">
            <Link to="/" className={`hover:text-[#D4AF37] transition-colors ${location.pathname === '/' ? 'text-[#D4AF37]' : ''}`}>Home</Link>
            <Link to="/about" className={`hover:text-[#D4AF37] transition-colors ${location.pathname === '/about' ? 'text-[#D4AF37]' : ''}`}>About</Link>
            <Link to="/faq" className={`hover:text-[#D4AF37] transition-colors ${location.pathname === '/faq' ? 'text-[#D4AF37]' : ''}`}>FAQ</Link>
            <Link to="/legal" className={`hover:text-[#D4AF37] transition-colors ${location.pathname === '/legal' ? 'text-[#D4AF37]' : ''}`}>Legal</Link>
          </nav>
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <UserProfile forceDark={true} />
            ) : null}
            <button 
              onClick={handleLaunch}
              className="px-6 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] font-semibold hover:bg-[#D4AF37]/20 transition-all hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]"
            >
              {user ? 'Open Workspace' : 'Sign In'}
            </button>
          </div>
        
          <div className="flex md:hidden items-center">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-2 p-4 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col gap-4 text-sm font-medium text-zinc-300">
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className={`hover:text-[#D4AF37] transition-colors ${location.pathname === '/' ? 'text-[#D4AF37]' : ''}`}>Home</Link>
            <Link to="/about" onClick={() => setIsMobileMenuOpen(false)} className={`hover:text-[#D4AF37] transition-colors ${location.pathname === '/about' ? 'text-[#D4AF37]' : ''}`}>About</Link>
            <Link to="/faq" onClick={() => setIsMobileMenuOpen(false)} className={`hover:text-[#D4AF37] transition-colors ${location.pathname === '/faq' ? 'text-[#D4AF37]' : ''}`}>FAQ</Link>
            <Link to="/legal" onClick={() => setIsMobileMenuOpen(false)} className={`hover:text-[#D4AF37] transition-colors ${location.pathname === '/legal' ? 'text-[#D4AF37]' : ''}`}>Legal</Link>
            <div className="h-px bg-white/10 my-2"></div>
            <button 
              onClick={() => { setIsMobileMenuOpen(false); handleLaunch(); }}
              className="w-full py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] font-semibold hover:bg-[#D4AF37]/20 transition-all text-center"
            >
              {user ? 'Open Workspace' : 'Sign In'}
            </button>
          </div>
        )}
      </header>
  

      <main className="relative z-10 flex flex-col items-center min-h-screen pt-32 pb-24 px-6 md:px-12 max-w-[1400px] mx-auto w-full">
        <Outlet context={{ handleLaunch, openPolicy: (tab: any) => { setPolicyTab(tab); setShowPolicies(true); } }} />
      </main>

      

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
      <PoliciesModal 
        isOpen={showPolicies} 
        mode="view" 
        defaultTab={policyTab} 
        onClose={() => setShowPolicies(false)} 
      />
    </div>
  );
}
