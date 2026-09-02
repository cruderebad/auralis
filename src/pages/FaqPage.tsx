import { motion } from 'framer-motion';

export default function FaqPage() {
  return (
    <section id="faq" className="relative w-full max-w-6xl mx-auto mb-32 mt-32 min-h-[600px] flex justify-center pt-24">
      {/* Background large text */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full text-center z-0 select-none overflow-hidden">
        <h2 className="text-[25vw] sm:text-[140px] md:text-[200px] leading-none font-extrabold text-white tracking-tighter whitespace-nowrap opacity-90">
          FAQ
        </h2>
      </div>

      <div className="relative z-10 w-full max-w-4xl px-6 mt-10 md:mt-16 space-y-4">
        {[
          { q: "What is Auralis?", a: "Auralis is an AI-powered caption editor that helps creators generate accurate, animated subtitles for videos in minutes. It supports customizable styles, timeline editing, and fast exports." },
          { q: "Which languages does Auralis support?", a: "Auralis can generate captions in multiple languages, including English, Hindi, and Hinglish, with more languages being added over time." },
          { q: "Can I edit the captions?", a: "Absolutely. Every caption is fully editable. You can change the text, timing, styling, colors, fonts, animations, and positioning before exporting." },
          { q: "Does Auralis work with short and long videos?", a: "Yes. Auralis supports everything from short-form content like Reels, Shorts, and TikToks to longer videos such as YouTube videos, tutorials, and podcasts." },
          { q: "What export quality is available?", a: "You can export videos in high quality while preserving smooth caption animations. Export speed depends on your device and video length." },
          { q: "Do I need editing experience?", a: "Not at all. Auralis is designed for beginners and professionals alike. Upload your video, generate captions, customize them, and export." },
          { q: "Is my data private?", a: "Yes. Your videos are processed securely, and we don't use your content to train AI models without your permission." },
          { q: "Can I use Auralis on any device?", a: "Auralis runs directly in your web browser, so there's nothing to install. Desktop browsers provide the best experience." },
          { q: "Is Auralis free to use?", a: "Yes. Auralis is free to use for transcribing and editing video captions without credit restrictions." },
          { q: "What makes Auralis different?", a: "Auralis focuses on beautiful, creator-friendly captions instead of just transcription. It combines AI-powered caption generation with an intuitive editor, smooth animations, and fast exports in one place." },
          { q: "Can I customize caption styles?", a: "Yes. Choose from multiple animation presets, fonts, colors, highlights, outlines, and effects to match your brand or editing style." },
          { q: "Does Auralis add watermarks?", a: "Free exports may include a watermark depending on your plan. Premium plans export without watermarks." },
          { q: "Can I import subtitle files?", a: "Yes. You can import subtitle files such as .srt to continue editing or apply Auralis's animation styles." },
          { q: "How accurate are the captions?", a: "Auralis uses advanced AI speech recognition to achieve high accuracy. You can always review and edit captions before exporting." },
          { q: "Do I need an internet connection?", a: "Yes. Since Auralis uses AI for transcription and cloud-powered features, an internet connection is required." },
          { q: "What video formats are supported?", a: "Auralis supports popular formats like MP4, MOV, and WebM. More formats will continue to be added." },
          { q: "Is Auralis suitable for podcasts and interviews?", a: "Yes. Auralis works great for podcasts, interviews, educational content, tutorials, gaming videos, and social media clips." }
        ].map((faq, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="p-8 rounded-[32px] bg-[#0A0A0A]/40 backdrop-blur-2xl border border-white/5 shadow-2xl relative overflow-hidden"
          >
            {/* Subtle top glare/highlight */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            <h3 className="text-xl font-bold text-white mb-3">{faq.q}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
