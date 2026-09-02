const fs = require('fs');
let code = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf-8');

code = code.replace(
`  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showCaptionSettings, setShowCaptionSettings] = useState(false);
  const [isSavingBrandKit, setIsSavingBrandKit] = useState(false);`,
`  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [isSavingBrandKit, setIsSavingBrandKit] = useState(false);`
);

code = code.replace(
`                {activeTab === 'depth-captions' && (
                  <div className="flex items-center gap-1.5">
                    <span>Captions & Styles</span>
                    <button
                      onClick={() => isAnyPresetActive && setShowCaptionSettings(!showCaptionSettings)}
                      disabled={!isAnyPresetActive}
                      className={cn(
                        "p-1 rounded-md transition-all cursor-pointer flex items-center justify-center",
                        !isAnyPresetActive 
                          ? "opacity-35 cursor-not-allowed text-zinc-500" 
                          : showCaptionSettings
                           ? "bg-auralis/20 text-auralis hover:bg-auralis/30"
                           : "hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-450 dark:text-zinc-400 hover:text-auralis"
                      )}
                      title="Edit Caption Settings"
                    >
                      <Pencil size={11} className="stroke-[2.5]" />
                    </button>
                  </div>
                )}`,
`                {activeTab === 'depth-captions' && (
                  <div className="flex items-center gap-1.5">
                    <span>Captions & Styles</span>
                  </div>
                )}`
);

fs.writeFileSync('src/components/layout/Sidebar.tsx', code);
console.log("Sidebar updated!");
