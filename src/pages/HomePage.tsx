import { motion } from 'framer-motion';
import { Wand2 } from 'lucide-react';
import FuzzyText from '../components/FuzzyText';
import { useOutletContext } from 'react-router-dom';

export default function HomePage() {
  const { handleLaunch } = useOutletContext<{ handleLaunch: () => void }>();

  return (
    <section id="home" className="w-full min-h-[calc(100vh-200px)] flex flex-col items-center justify-center pt-0 pb-16 text-center">
      <div className="flex flex-col items-center w-full gap-8">
        {/* Huge AURALIS text */}
        <div className="w-full relative flex justify-center">
          <div className="h-[80px] sm:h-[120px] md:h-[150px] lg:h-[200px] w-full max-w-5xl relative flex justify-center">
            <FuzzyText
              baseIntensity={0.15}
              hoverIntensity={0.5}
              enableHover={true}
              color="#ffffff"
              fontSize="clamp(3rem, 12vw, 10rem)"
              fontWeight={700}
              fontFamily='"Pixelify Sans", sans-serif'
              className="w-full max-w-[650px] h-auto object-contain"
              style={{
                borderColor: '#ffffff',
                width: '465px',
                height: '80px'
              }}
            >
              AURALIS
            </FuzzyText>
          </div>
        </div>

        {/* Description and button on the right */}
        <div className="flex-none flex flex-col items-center mt-8 z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <motion.button
              onClick={handleLaunch}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-6 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-medium text-lg overflow-hidden transition-all hover:bg-white/20 hover:border-[#D4AF37]/50"
            >
              <span className="relative flex items-center gap-2">
                Launch Editor <Wand2 className="w-5 h-5 text-[#D4AF37]" />
              </span>
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
