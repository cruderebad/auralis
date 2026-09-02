import { useConfirm } from '../../context/ConfirmContext';
import React, { useState, useEffect } from 'react';
import { Settings, Shield, Globe, CreditCard, Key, Database, Cpu, HardDrive } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { safeSetLocalStorage } from '../../lib/projectStorage';

export default function AdminSettings() {
  const { alert } = useConfirm();

  const [settings, setSettings] = useState({
    maintenanceMode: false,
    globalAnnouncement: '',
    enableNewFeatures: true,
    adminTimeout: 60,
    require2fa: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('auralis_admin_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  const handleSave = () => {
    safeSetLocalStorage('auralis_admin_settings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  const SETTING_SECTIONS = [
    {
      title: 'General',
      icon: Globe,
      items: [
        { 
          name: 'Maintenance Mode', 
          description: 'Disable app access for non-admins', 
          type: 'toggle', 
          value: settings.maintenanceMode,
          onChange: (v: boolean) => setSettings({...settings, maintenanceMode: v})
        },
        { 
          name: 'Global Announcement', 
          description: 'Show banner on top of all pages', 
          type: 'text', 
          value: settings.globalAnnouncement,
          onChange: (v: string) => setSettings({...settings, globalAnnouncement: v})
        },
        { 
          name: 'Enable New Features', 
          description: 'Opt-in users to beta features', 
          type: 'toggle', 
          value: settings.enableNewFeatures,
          onChange: (v: boolean) => setSettings({...settings, enableNewFeatures: v})
        },
      ]
    },
    {
      title: 'Security & Access',
      icon: Shield,
      items: [
        { 
          name: 'Admin Session Timeout', 
          description: 'Minutes before auto logout', 
          type: 'number', 
          value: settings.adminTimeout,
          onChange: (v: string) => setSettings({...settings, adminTimeout: parseInt(v) || 60})
        },
        { 
          name: 'Require 2FA', 
          description: 'Force 2FA for admin accounts', 
          type: 'toggle', 
          value: settings.require2fa,
          onChange: (v: boolean) => setSettings({...settings, require2fa: v})
        },
      ]
    },
    {
      title: 'API & Integrations',
      icon: Key,
      items: [
        { name: 'Gemini API Key', description: 'Used for AI features', type: 'password', value: '****************' },
      ]
    },
    {
      title: 'System Status',
      icon: Cpu,
      items: [
        { name: 'Rendering Queue', description: 'Current status of export servers', type: 'status', value: 'Operational', color: 'text-emerald-500' },
        { name: 'Supabase Database', description: 'Connection to main DB', type: 'status', value: 'Operational', color: 'text-emerald-500' },
        { name: 'Storage Usage', description: 'Object storage capacity', type: 'status', value: '45% Used', color: 'text-amber-500' },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {SETTING_SECTIONS.map((section, idx) => (
          <motion.div 
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-white/5 flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-white/5 text-gray-400">
                <section.icon size={18} />
              </div>
              <h3 className="font-bold text-white">{section.title}</h3>
            </div>
            
            <div className="p-4 space-y-4">
              {section.items.map((item, i) => (
                <div key={i} className="flex justify-between items-start md:items-center py-2">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-0.5">{item.name}</h4>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  
                  <div className="ml-4 shrink-0">
                    {item.type === 'toggle' && (
                      <button 
                        onClick={() => item.onChange && item.onChange(!item.value)}
                        className={cn(
                        "w-10 h-5 rounded-full relative transition-colors",
                        item.value ? "bg-[#6B46C1]" : "bg-white/10"
                      )}>
                        <div className={cn(
                          "w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform",
                          item.value ? "left-5" : "left-1"
                        )} />
                      </button>
                    )}
                    
                    {item.type === 'text' && (
                      <input 
                        type="text" 
                        value={item.value as string}
                        onChange={(e) => item.onChange && item.onChange(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white w-48 focus:border-[#6B46C1]/50 focus:outline-none"
                      />
                    )}
                    
                    {item.type === 'number' && (
                      <input 
                        type="number" 
                        value={item.value as number}
                        onChange={(e) => item.onChange && item.onChange(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white w-20 text-center focus:border-[#6B46C1]/50 focus:outline-none"
                      />
                    )}

                    {item.type === 'password' && (
                      <input 
                        type="password" 
                        readOnly
                        value={item.value as string}
                        className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white w-48 focus:border-[#6B46C1]/50 focus:outline-none opacity-50 cursor-not-allowed"
                      />
                    )}
                    
                    {item.type === 'status' && (
                      <span className={cn("text-xs font-bold px-2 py-1 rounded-md bg-white/5", item.color)}>
                        {item.value}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="flex justify-end pt-4">
        <button onClick={handleSave} className="bg-[#6B46C1] hover:bg-[#5B3CA1] text-white font-medium py-2 px-6 rounded-xl transition-colors shadow-lg shadow-purple-500/20">
          Save Settings
        </button>
      </div>
    </div>
  );
}
