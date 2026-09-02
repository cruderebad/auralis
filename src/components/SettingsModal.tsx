import React, { useState, useEffect } from 'react';
import { X, User, CreditCard, Settings, Mail, Calendar, Key, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'account' | 'plan' | 'settings';
}

export default function SettingsModal({ isOpen, onClose, defaultTab = 'account' }: SettingsModalProps) {
  const { user, profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'plan' | 'settings'>(defaultTab);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'plan', label: 'Your Plan', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative bg-white dark:bg-[#111] rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col md:flex-row h-[600px] max-h-[90vh]"
        >
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-gray-50 dark:bg-[#050505] border-r border-gray-100 dark:border-white/5 flex flex-col">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
            </div>
            
            <nav className="flex-1 px-4 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-[#6B46C1] text-white" 
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#222] hover:text-gray-900 dark:text-white"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
            
            <div className="p-4 border-t border-gray-200 dark:border-white/10">
              <button 
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#111] p-6 md:p-8 relative">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {activeTab === 'account' && <AccountTab />}
            {activeTab === 'plan' && <PlanTab />}
            {activeTab === 'settings' && <SettingsTab />}
            
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function AccountTab() {
  const { user, profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user?.id);
      
      if (!error) {
        setIsEditing(false);
        // In a real app we might trigger a context refresh here
        window.location.reload();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Account details</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Manage your personal information and connected accounts.</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#050505] rounded-2xl border border-gray-100 dark:border-white/5">
          <div className="w-16 h-16 rounded-full bg-[#6B46C1] flex items-center justify-center text-white text-xl font-bold">
            {profile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-lg">{profile?.full_name || 'User'}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Full Name</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!isEditing}
                className="w-full bg-white dark:bg-[#111] border border-gray-300 rounded-xl px-4 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6B46C1] disabled:bg-gray-50 dark:bg-[#050505] disabled:text-gray-500 dark:text-gray-400 dark:text-gray-500"
              />
              {isEditing ? (
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#6B46C1] hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl font-medium transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email Address</label>
            <div className="w-full bg-gray-50 dark:bg-[#050505] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-gray-500 dark:text-gray-400 dark:text-gray-500 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {user?.email}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">Google Connected Account</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanTab() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (data && !error) {
          setHistory(data);
        }
      } catch (err) {
        console.error("Failed to fetch payment history", err);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  
  const planHierarchy: Record<string, number> = { "Free": 0, "Creator": 1, "Pro": 2, "Studio": 3 };
  
  const enrichedPlans = (profile?.all_plans || []).map(p => {
    let maxHigherExp = Date.now();
    for (const other of (profile?.all_plans || [])) {
       if ((planHierarchy[other.name] || 0) > (planHierarchy[p.name] || 0)) {
          if (other.expiresAt > maxHigherExp) {
             maxHigherExp = other.expiresAt;
          }
       }
    }
    const durationMillis = Math.max(0, p.expiresAt - maxHigherExp);
    const daysLeft = Math.ceil(durationMillis / (1000 * 60 * 60 * 24));
    const isPaused = maxHigherExp > Date.now();
    return { ...p, daysLeft, isPaused };
  }).filter(p => p.daysLeft > 0);
  
  // Sort so active plan is first, then paused plans
  enrichedPlans.sort((a, b) => {
    if (a.isPaused && !b.isPaused) return 1;
    if (!a.isPaused && b.isPaused) return -1;
    return b.daysLeft - a.daysLeft;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Your Plan</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Manage your subscription and billing history.</p>
      </div>

      <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-[#111] border border-purple-100 dark:border-purple-500/20 rounded-2xl p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 space-y-4">
            {enrichedPlans.length === 0 ? (
              <div>
                <h4 className="text-purple-900 dark:text-purple-300 font-bold text-lg">Free Plan</h4>
                <p className="text-sm text-purple-600/80 dark:text-purple-400/80">
                  No expiration
                </p>
              </div>
            ) : (
              enrichedPlans.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div>
                    <h4 className="text-purple-900 dark:text-purple-300 font-bold text-lg flex items-center gap-2">
                      {p.name} Plan
                      {p.isPaused && <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Paused</span>}
                      {!p.isPaused && <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>}
                    </h4>
                    <p className="text-sm text-purple-600/80 dark:text-purple-400/80">
                      {p.isPaused ? `Resumes automatically (${p.daysLeft} days left)` : `Expires in ${p.daysLeft} days`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <div>
        <h4 className="font-bold text-gray-900 dark:text-white mb-4">Billing History</h4>
        
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Loading history...</p>
        ) : history.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-[#050505] rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">No payment history found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((payment) => (
              <div key={payment.id} className="flex justify-between items-center p-4 border border-gray-100 dark:border-white/5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1A1A1A] dark:bg-[#050505] transition-colors">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm capitalize">{payment.package} Plan</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(payment.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">₹{payment.amount / 100}</p>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                    payment.status === 'paid' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}>
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Preferences</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Customize your editor experience.</p>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">General</h4>
          <div className="space-y-3">
            
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#050505] rounded-xl border border-gray-100 dark:border-white/5">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Theme</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Choose dark, light, or system theme.</p>
              </div>
              <select 
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 outline-none focus:border-[#6B46C1]"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System Default</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#050505] rounded-xl border border-gray-100 dark:border-white/5">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Language</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Select your preferred language.</p>
              </div>
              <select className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 outline-none focus:border-[#6B46C1]">
                <option value="en">English (US)</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#050505] rounded-xl border border-gray-100 dark:border-white/5">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Theme</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Choose your editor appearance.</p>
              </div>
              <select className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 outline-none focus:border-[#6B46C1]">
                <option value="system">System Default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Advanced</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#050505] rounded-xl border border-gray-100 dark:border-white/5">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">Hardware Acceleration</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Use GPU for faster rendering.</p>
              </div>
              <div className="relative inline-block w-10 h-5 align-middle select-none">
                <input type="checkbox" defaultChecked className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white dark:bg-[#111] border-4 border-[#6B46C1] appearance-none cursor-pointer" style={{ right: 0 }} />
                <label className="toggle-label block overflow-hidden h-5 rounded-full bg-[#6B46C1] cursor-pointer"></label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
