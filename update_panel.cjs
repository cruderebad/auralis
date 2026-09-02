const fs = require('fs');
let code = fs.readFileSync('src/components/layout/CaptionAccessibilityPanel.tsx', 'utf-8');

code = code.replace(
`interface CaptionAccessibilityPanelProps {
  currentStyle: GlobalStyle;
  updateStyle: (updates: Partial<GlobalStyle>) => void;
  accessibilitySettings: any;
  updateAccessibility: (updates: any) => void;
  isLight: boolean;
}`,
`import { CaptionSegment } from '../../types';

interface CaptionAccessibilityPanelProps {
  currentStyle: GlobalStyle;
  updateStyle: (updates: Partial<GlobalStyle>) => void;
  accessibilitySettings: any;
  updateAccessibility: (updates: any) => void;
  isLight: boolean;
  captions: CaptionSegment[];
  onUpdateCaptions: (c: CaptionSegment[]) => void;
  session: any;
}`
);

code = code.replace(
`export function CaptionAccessibilityPanel({
  currentStyle,
  updateStyle,
  accessibilitySettings,
  updateAccessibility,
  isLight
}: CaptionAccessibilityPanelProps) {
  const [activeSection, setActiveSection] = useState<string>('accessibility');`,
`export function CaptionAccessibilityPanel({
  currentStyle,
  updateStyle,
  accessibilitySettings,
  updateAccessibility,
  isLight,
  captions,
  onUpdateCaptions,
  session
}: CaptionAccessibilityPanelProps) {
  const [activeSection, setActiveSection] = useState<string>('accessibility');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAIAnalyze = async (updates: Partial<GlobalStyle>) => {
    updateStyle(updates);
    const newStyle = { ...currentStyle, ...updates };

    if (captions.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-emotions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": \`Bearer \${session.access_token}\` } : {})
        },
        body: JSON.stringify({ 
          segments: captions, 
          aiAdaptiveLines: newStyle.aiAdaptiveLines, 
          aiBracketLabels: newStyle.aiBracketLabels || 'auto',
          accessibilityProfile: accessibilitySettings.profile || 'standard'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.segments) {
          onUpdateCaptions(data.segments);
        }
      }
    } catch (err) {
      console.error("AI Adaptation failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };`
);

code = code.replace(
`checked={currentStyle.aiAdaptiveLines} onChange={(e) => updateStyle({ aiAdaptiveLines: e.target.checked })}`,
`checked={currentStyle.aiAdaptiveLines} onChange={(e) => handleAIAnalyze({ aiAdaptiveLines: e.target.checked })} disabled={isAnalyzing}`
);

code = code.replace(
`checked={currentStyle.aiBracketLabels === 'auto'} onChange={(e) => updateStyle({ aiBracketLabels: e.target.checked ? 'auto' : 'never' })}`,
`checked={currentStyle.aiBracketLabels === 'auto'} onChange={(e) => handleAIAnalyze({ aiBracketLabels: e.target.checked ? 'auto' : 'never' })} disabled={isAnalyzing}`
);

fs.writeFileSync('src/components/layout/CaptionAccessibilityPanel.tsx', code);
console.log("Panel updated successfully!");
