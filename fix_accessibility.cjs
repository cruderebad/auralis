const fs = require('fs');
let code = fs.readFileSync('src/lib/RenderEngine.ts', 'utf-8');

code = code.replace(
`export const applyAccessibilityOverrides = (style: GlobalStyle): GlobalStyle => {
  if (style.animationStyle !== 'ai-reactive') {
    return style;
  }

  const overrides = { ...style };
  
  if (style.accessibilityPreset === 'dyslexia') {`,
`export const applyAccessibilityOverrides = (style: GlobalStyle, accessibility?: any): GlobalStyle => {
  const overrides = { ...style };
  const profile = accessibility?.profile || style.accessibilityPreset;
  const reduceMotion = accessibility?.reduceMotion;
  
  if (reduceMotion) {
    overrides.animationEnabled = false;
    overrides.animationStyle = 'flat';
    overrides.aeEmotionSensitivity = 0;
    overrides.aeShakeStrength = 0;
    overrides.aeBounceStrength = 0;
    overrides.aeSlideIntensity = 0;
    overrides.aeZoomIntensity = 0;
    overrides.aeAutoColorToggle = false;
    overrides.aeAutoScaleToggle = false;
  }

  if (profile === 'dyslexia') {`
);

code = code.replace(
`export const renderCaptionFrame = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  caption: CaptionSegment,
  time: number,
  baseStyle: GlobalStyle,
  width: number,
  height: number,
  activeVideoCanvas?: HTMLCanvasElement
) => {
  const style = applyAccessibilityOverrides(baseStyle);`,
`export const renderCaptionFrame = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  caption: CaptionSegment,
  time: number,
  baseStyle: GlobalStyle,
  width: number,
  height: number,
  activeVideoCanvas?: HTMLCanvasElement,
  accessibility?: any
) => {
  const style = applyAccessibilityOverrides(baseStyle, accessibility);`
);

fs.writeFileSync('src/lib/RenderEngine.ts', code);
console.log("RenderEngine updated successfully!");
