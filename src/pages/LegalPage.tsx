import { motion } from 'framer-motion';
import { ShieldCheck, FileText, Cookie, Undo2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export default function LegalPage() {
  const { openPolicy } = useOutletContext<{ openPolicy: (tab: 'terms' | 'privacy' | 'cookies' | 'refund') => void }>();

  return (
    <section id="legal" className="relative w-full max-w-6xl mx-auto mb-32 mt-32 min-h-[600px] flex justify-center pt-24">
      {/* Background large text */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full text-center z-0 select-none overflow-hidden">
        <h2 className="text-[25vw] sm:text-[140px] md:text-[200px] leading-none font-extrabold text-white tracking-tighter whitespace-nowrap opacity-90">
          Legal
        </h2>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 px-6 w-full max-w-4xl mt-10 md:mt-16">
        {[
          { id: 'terms', title: 'Terms of Use', icon: FileText, desc: 'Rules and guidelines for using Auralis.' },
          { id: 'privacy', title: 'Privacy Policy', icon: ShieldCheck, desc: 'How we collect, use, and protect your data.' },
          { id: 'cookies', title: 'Cookie Policy', icon: Cookie, desc: 'Information about how we use cookies.' },
          { id: 'refund', title: 'Refund Policy', icon: Undo2, desc: 'Our policies regarding refunds and cancellations.' },
        ].map((policy, i) => (
          <motion.button 
            key={policy.id}
            onClick={() => openPolicy(policy.id as any)}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="p-8 rounded-[32px] bg-[#0A0A0A]/40 backdrop-blur-2xl border border-white/5 flex flex-col items-center shadow-2xl relative overflow-hidden group hover:bg-white/5 transition-colors"
          >
            {/* Subtle top glare/highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 ease-out">
              <policy.icon className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-3">{policy.title}</h3>
            <p className="text-sm text-zinc-400 text-center">{policy.desc}</p>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
