/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CaptionSegment {
  id: string;
  start: number; // in seconds
  end: number; // in seconds
  text: string;
  words?: WordTiming[];
  emotion?: string;
  emotionIntensity?: number;
  tone?: string;
  speechStyle?: 'normal' | 'shouting' | 'whispering' | 'laughing' | 'crying' | 'hesitation' | string;
  emphasis?: string[];
  confidence?: number;
  speaker?: string;
  bracketLabel?: string;
}

export interface AudioSoundEvent {
  id: string;
  type: 'sound';
  event: string; // e.g. "door_slam", "laughter", "crying", "applause", "footsteps", "alarm", "siren"
  label: string; // e.g. "door slams", "laughter", "applause", "footsteps approaching"
  start: number; // in seconds
  end: number;   // in seconds
  confidence: number; // 0.0 - 1.0
  importance: number; // 0.0 - 1.0
  intensity: number;  // 0.0 - 1.0
}

export interface SemanticTimeline {
  segments: CaptionSegment[];
  soundEvents: AudioSoundEvent[];
  analyzedAt?: string;
}

export type AccessibilityCaptionMode = 
  | 'standard'
  | 'emotion'
  | 'sounds'
  | 'emotion_sounds'
  | 'adaptive'
  | 'full'
  | 'custom';

export interface CustomAccessibilityConfig {
  showEmotions: boolean;
  showSounds: boolean;
  showSpeechEmphasis: boolean;
  showSpeakerNames: boolean;
  showWhisperingLabels: boolean;
  showShoutingLabels: boolean;
  showMusicCues: boolean;
  showEnvironmentalCues: boolean;
  adaptiveVisualEmphasis: boolean;
  emotionThreshold: number; // default 0.70
  soundThreshold: number;   // default 0.70
  importanceThreshold: number; // default 0.65
}

export interface WordTiming {
  text: string;
  start: number;
  end: number;
  speaker?: string;
  emotion?: string;
  emphasis?: number;
  isFocus?: boolean;
  cssClass?: string;
}

export type AnimationStyle = 
  | 'word-by-word' 
  | 'word-highlight-box' 
  | 'word-highlight-color' 
  | 'pop-up' 
  | 'aesthetic' 
  | 'fade-in-word'
  | 'karaoke'
  | 'typewriter'
  | 'netflix'
  | '3d-depth'
  | 'ai-reactive'
  | 'kinetic'
  | 'flat'
  | 'play-typo'
  | 'follow-up';

export interface GlobalStyle {
  fontFamily: string;
  fontSize: number;
  textColor: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: 'left' | 'center' | 'right';
  outlineEnabled: boolean;
  outlineColor: string;
  outlineWidth?: number;
  shadowEnabled: boolean;
  shadowIntensity: number;
  shadowColor: string;
  adaptiveGlow?: boolean;
  backgroundEnabled: boolean;
  backgroundColor: string;
  backgroundOpacity: number;
  positionX: number; // 0-100 percentage
  positionY: number; // 0-100 percentage
  lineHeight: number;
  letterSpacing: number;
  casing: 'none' | 'uppercase' | 'capitalize' | 'lowercase';
  wordsPerSegment: number;
  maxLines: number;
  useOriginalSRT: boolean;
  aiAdaptiveLines: boolean;
  aiAdaptiveEmphasis?: boolean;
  aiAdaptivePunctuation?: boolean;
  animationEnabled: boolean;
  animationStyle: AnimationStyle;
  highlightFontFamily: string;
  highlightFontSize: number;
  highlightColor: string;
  highlightBoxColor?: string;
  glowEnabled?: boolean;
  glowColor?: string;
  glowSize?: number;
  glowSpread?: number;
  highlightBold: boolean;
  highlightItalic: boolean;
  aiEmphasis: boolean;
  aiLineFocusHighlighting?: boolean;
  autoEmoji: boolean;
  randomRotate: boolean;
  fadeInDuration: number;
  fadeOutDuration: number;
  staggerDelay: number;
  canvasBackground: string;
  popupIntensity?: number;
  popupMotionBlur?: number;
  popupDirection?: 'center' | 'left' | 'right';
  highlightBoxPadding?: number;
  highlightBoxRadius?: number;
  wordSpacing?: number;
  // AI Emotion & Pitch Kinetics
  aiSentimentColors?: boolean;
  pitchModulation?: boolean;
  kineticJitter?: number;
  emotionGlow?: boolean;
  // Depth Captions configuration
  depthEnabled?: boolean;
  depthIntensity?: number;
  depthSubjectOffsetX?: number;
  depthSubjectOffsetY?: number;
  depthSubjectMargin?: number;
  depthFontFamily?: string;
  depthFontWeight?: string;
  depthFontColor?: string;
  depthFontOpacity?: number;
  depthLetterSpacing?: number;
  depthLineHeight?: number;
  depthTextTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
  depthBlurAmount?: number;
  depthGlowStrength?: number;
  depthGlowRadius?: number;
  depthShadowStrength?: number;
  depthShadowBlur?: number;
  depthOutlineWidth?: number;
  depthOutlineColor?: string;
  depthBigWordSize?: number;
  depthForegroundSize?: number;
  depthScaleAnimation?: number;
  depthPositionX?: number;
  depthPositionY?: number;
  depthAutoCenter?: boolean;
  depthSafeArea?: number;
  depthAnimationStyle?: string;
  depthAnimationDuration?: number;
  depthAnimationDelay?: number;
  depthAnimationEasing?: string;
  depthOpacityCurve?: string;
  depthScaleCurve?: string;
  depthKeywordManualOverride?: string;
  onlyHighlightKeyword?: boolean;
  depthMaskFeather?: number;
  depthModelSelection?: number;
  bionicReadingEnabled?: boolean;
  bionicReadingStrength?: number;
  showSpeakerBadges?: boolean;
  speakerColorEnabled?: boolean;
  speakerColorMap?: Record<string, string>;
  // Word by Word
  wwRevealSpeed?: number;
  wwWordDelay?: number;
  wwStaggerIntensity?: number;
  wwScaleInAmount?: number;
  wwFadeInOpacity?: number;
  wwMotionBlur?: number;
  wwEasing?: string;
  wwReverseMode?: boolean;

  // Fade In Word
  fiwFadeDuration?: number;
  fiwWordDelay?: number;
  fiwStartOpacity?: number;
  fiwEndOpacity?: number;
  fiwBlurDuringFade?: boolean;
  fiwBlurStrength?: number;
  fiwEasing?: string;

  // Pop Up
  puPopIntensity?: number;
  puOvershoot?: number;
  puBounceStrength?: number;
  puPopDuration?: number;
  puMotionBlur?: number;
  puScaleStart?: number;
  puScaleEnd?: number;
  puRotationJitter?: number;
  puEasing?: string;

  // Highlight Box
  hbPadding?: number;
  hbCornerRadius?: number;
  hbOpacity?: number;
  hbColor?: string;
  hbAnimDuration?: number;
  hbExpandSpeed?: number;
  hbGlowStrength?: number;
  hbShadowIntensity?: number;
  hbFollowWord?: boolean;

  // Highlight Color
  hcColor?: string;
  hcTransitionSpeed?: number;
  hcOpacity?: number;
  hcGradientToggle?: boolean;
  hcGradientColors?: string;
  hcGlowStrength?: number;
  hcScaleBoost?: number;
  hcSmoothInterpolation?: boolean;

  // Karaoke Sweep
  ksSpeed?: number;
  ksDirection?: string;
  ksGradientStart?: string;
  ksGradientEnd?: string;
  ksGlowStrength?: number;
  ksOpacity?: number;
  ksSmoothness?: number;
  ksFollowAudio?: boolean;

  // Typewriter Kinetic
  twCharDelay?: number;
  twCursorBlinkSpeed?: number;
  twCursorStyle?: string;
  twSpeedVariation?: number;
  twCursorColor?: string;
  twCursorWidth?: number;
  twBackspaceToggle?: boolean;
  twSoundToggle?: boolean;

  // Netflix Stories
  nxBlurAmount?: number;
  nxBlurFade?: number;
  nxSlideDistance?: number;
  nxSlideDirection?: string;
  nxBgOpacity?: number;
  nxShadowStrength?: number;
  nxTextGlow?: number;
  nxEaseCurve?: string;
  nxHoldDuration?: number;

  // Layered 3D Depth
  l3dLayerCount?: number;
  l3dDepthStrength?: number;
  l3dPerspectiveAmount?: number;
  l3dParallaxIntensity?: number;
  l3dFloatingSpeed?: number;
  l3dRotationStrength?: number;
  l3dLayerOpacityFalloff?: number;
  l3dShadowDepth?: number;
  l3dCameraMovementSens?: number;

  // AI Emotional Adaptive
  aeEmotionSensitivity?: number;
  aeShakeStrength?: number;
  aeBounceStrength?: number;
  aeSlideIntensity?: number;
  aeZoomIntensity?: number;
  aeMaxAnimationSpeed?: number;
  aeEmotionDetectionThresh?: number;
  aeAutoColorToggle?: boolean;
  aeAutoScaleToggle?: boolean;
  aiBracketLabels?: 'auto' | 'never' | 'important' | 'sounds';
  
  accessibilityPreset?: 'none' | 'dyslexia' | 'focus' | 'calm' | 'hearing' | 'vision' | 'color-vision' | 'reduced-motion';

  // Aesthetic Trendy
  atWaveStrength?: number;
  atFlowSpeed?: number;
  atOrganicMovement?: number;
  atMomentumStrength?: number;
  atRotationDrift?: number;
  atSmoothnessFactor?: number;
  atElasticity?: number;
  atMotionBlur?: number;
  atDynamicScaling?: number;

  // Global Setup Settings
  gAnimDuration?: number;
  gEasing?: string;
  gMotionBlur?: number;
  gFpsPreview?: number;
  gGpuAccel?: boolean;
  gLoopAnim?: boolean;
  gEntranceAnim?: boolean;
  gExitAnim?: boolean;
  gOpacity?: number;
  gScale?: number;
  gRotation?: number;
  gOffsetX?: number;
  gOffsetY?: number;

  // Follow-up animation specific
  followUpStretch?: boolean;
  followUpStretchAmount?: number;
  followUpStretchSpline?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5';

export interface AccessibilityProfile {
  id: string;
  name: string;
  typography: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    letterSpacing: number;
    lineHeight: number;
  };
  layout: {
    maxWordsPerSegment: number;
    maxCharactersPerLine: number;
    maxLines: number;
    position: string;
    width: number;
  };
  contrast: {
    highContrast: boolean;
    textColor: string;
    backgroundColor: string;
    backgroundOpacity: number;
  };
  captionBehavior: {
    segmentation: string;
    speakerLabels: boolean;
    soundDescriptions: boolean;
    animation: string;
  };
}

export interface ProjectState {
  videoUrl: string | null;
  videoFile: File | null;
  rawCaptions: CaptionSegment[];
  captions: CaptionSegment[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  selectedCaptionId: string | null;
  aspectRatio: AspectRatio;
  resolution: string;
  style: GlobalStyle;
  accessibility: {
    profile: string;
    reduceMotion: boolean;
    customOverrides?: Partial<AccessibilityProfile>;
  };
}
