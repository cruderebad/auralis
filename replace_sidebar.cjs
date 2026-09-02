const fs = require('fs');
let code = fs.readFileSync('src/components/layout/Sidebar.tsx', 'utf-8');

const startIndex = code.indexOf("{/* TA-3.5: Depth Captions Drawer Content */}");
const nextSectionIndex = code.indexOf("{/* TA-4: Image Drawer Content */}");

if (startIndex !== -1 && nextSectionIndex !== -1) {
  const replacement = `{/* TA-3.5: Depth Captions Drawer Content */}
            {activeTab === 'depth-captions' && (
              <div className="h-full">
                <CaptionAccessibilityPanel 
                  currentStyle={currentStyle} 
                  updateStyle={updateStyle}
                  accessibilitySettings={store.accessibility}
                  updateAccessibility={store.setAccessibility}
                  isLight={isLight!}
                />
              </div>
            )}

            `;
  code = code.slice(0, startIndex) + replacement + code.slice(nextSectionIndex);
  
  // also replace import
  code = code.replace("import { CaptionSettingsPanel } from './CaptionSettingsPanel';", "import { CaptionAccessibilityPanel } from './CaptionAccessibilityPanel';");

  fs.writeFileSync('src/components/layout/Sidebar.tsx', code);
  console.log("Replaced successfully!");
} else {
  console.log("Could not find start or end index.");
}
