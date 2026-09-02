import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="w-full flex flex-col items-center pb-24">
      <section id="about" className="relative w-full max-w-6xl mx-auto mt-32 min-h-[500px] flex justify-center pt-24 mb-16">
        {/* Background large text */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full text-center z-0 select-none overflow-hidden">
          <h2 className="text-[25vw] sm:text-[140px] md:text-[200px] leading-none font-extrabold text-white tracking-tighter whitespace-nowrap opacity-90">
            About
          </h2>
        </div>

        <div className="relative z-10 w-full max-w-4xl px-6 mt-10 md:mt-16 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="p-12 md:p-16 rounded-[32px] bg-[#0A0A0A]/40 backdrop-blur-2xl border border-white/5 flex flex-col shadow-2xl relative overflow-hidden"
          >
            {/* Subtle top glare/highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8">
              <Layers className="w-10 h-10 text-white" />
            </div>
            
            <h3 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-8">Designed for Creators</h3>
            <p className="text-lg md:text-xl text-zinc-400 leading-relaxed max-w-2xl mx-auto">
              Our editor integrates seamlessly with your workflow. Whether you're building a title sequence for a short film or kinetic typography for social media, Auralis gives you the tools to create professional-grade visual stories instantly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* User Reviews Section */}
      <section className="relative w-full max-w-6xl mx-auto flex flex-col items-center px-6">
        <div className="relative z-10 w-full max-w-4xl text-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="p-16 rounded-[32px] border border-dashed border-white/10 bg-[#0A0A0A]/20 backdrop-blur-md flex flex-col items-center justify-center text-center relative overflow-hidden"
          >
            <span className="text-4xl mb-6 opacity-80">✨</span>
            <h3 className="text-2xl font-bold text-white mb-3">Community Reviews</h3>
            <p className="text-zinc-400">
              No reviews yet. Be the first to share your experience with Auralis.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
