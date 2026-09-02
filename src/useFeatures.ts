import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';

let globalPackages: any = null;

export function useFeatures() {
  const { profile } = useAuth();
  const [features, setFeatures] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFeatures = async () => {
      try {
        if (!globalPackages) {
          const res = await fetch('/api/packages');
          if (res.ok) {
            globalPackages = await res.json();
          }
        }
        
        if (profile && globalPackages) {
          const userFeatures = new Set<string>();
          const plansToCheck = profile.all_plans ? [...profile.all_plans] : [];
          
          if (profile.plan && profile.plan.includes('|')) {
            const planName = profile.plan.split('|')[0];
            plansToCheck.push({ name: planName, expiresAt: Date.now() + 10000 });
          } else if (profile.plan && profile.plan !== 'Free') {
            plansToCheck.push({ name: profile.plan, expiresAt: Date.now() + 10000 });
          }

          for (const plan of plansToCheck) {
            // Find package by name or id
            let pkg = Object.values(globalPackages).find((p: any) => p.plan === plan.name || p.id === plan.name || p.name === plan.name);
            if (pkg && (pkg as any).features) {
              (pkg as any).features.forEach((f: string) => userFeatures.add(f));
            }
          }
          setFeatures(Array.from(userFeatures));
        }
      } catch (e) {
        console.error("Error loading features:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFeatures();
  }, [profile]);

  const hasFeature = (featureName: string) => {
    // Pro/Studio users get everything if it's an old plan
    const userPlan = (profile?.plan || 'Free').split('|')[0].toLowerCase();
    const isLegacyPro = userPlan === 'creator' || userPlan === 'pro' || userPlan === 'studio';
    
    if (isLegacyPro && (featureName.includes('4K') || featureName.includes('60 FPS') || featureName.includes('Brand Kit'))) {
      return true; 
    }
    
    return features.includes(featureName);
  };

  return { features, hasFeature, isLoading };
}
