import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Users, CreditCard, DollarSign, Wallet, 
  Tag, Layers, BarChart2, MessageSquare, TerminalSquare, 
  Settings, RotateCcw, Menu, Search, Bell, X, ChevronLeft, ChevronRight, LogOut 
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from './lib/utils';
import AdminOverview from './components/admin/AdminOverview';
import AdminUsers from './components/admin/AdminUsers';
import AdminSubscriptions from './components/admin/AdminSubscriptions';
import AdminFeedback from './components/admin/AdminFeedback';
import AdminSettings from './components/admin/AdminSettings';
import AdminCoupons from './components/admin/AdminCoupons';
import AdminPayments from './components/admin/AdminPayments';
import AdminRefunds from './components/admin/AdminRefunds';
import AdminAnalytics from './components/admin/AdminAnalytics';

const NAV_ITEMS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'payments', label: 'Payments', icon: DollarSign },
  { id: 'refunds', label: 'Refunds', icon: RotateCcw },
  { id: 'credits', label: 'Credits', icon: Wallet },
  { id: 'coupons', label: 'Coupons', icon: Tag },
  { id: 'templates', label: 'Templates', icon: Layers },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'logs', label: 'System Logs', icon: TerminalSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <AdminOverview />;
      case 'users': return <AdminUsers />;
      case 'subscriptions': return <AdminSubscriptions />;
      case 'coupons': return <AdminCoupons />;
      case 'feedback': return <AdminFeedback />;
      case 'settings': return <AdminSettings />;
      case 'payments': return <AdminPayments />;
      case 'refunds': return <AdminRefunds />;
      case 'analytics': return <AdminAnalytics />;
      default: 
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center border border-dashed border-white/10 rounded-2xl p-8 bg-white/5">
            <h2 className="text-2xl font-bold text-white mb-2">{NAV_ITEMS.find(i => i.id === activeTab)?.label}</h2>
            <p className="text-gray-400 max-w-md">This section is currently under construction. Check back soon for updates!</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden selection:bg-[#6B46C1]/30">
      
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col bg-[#0A0A0A] border-r border-white/5 transition-all duration-300",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6B46C1] to-[#E23A5D] flex items-center justify-center font-bold text-white shadow-lg">
                <img src="/logo.svg" alt="C" className="w-5 h-5 invert" />
              </div>
              <span className="font-bold text-lg tracking-tight">Auralis Admin</span>
            </div>
          )}
          {isSidebarCollapsed && (
            <div className="w-8 h-8 mx-auto rounded-lg bg-gradient-to-br from-[#6B46C1] to-[#E23A5D] flex items-center justify-center font-bold text-white">
              <img src="/logo.svg" alt="C" className="w-5 h-5 invert" />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                activeTab === item.id 
                  ? "bg-[#6B46C1]/20 text-[#6B46C1] font-medium" 
                  : "text-gray-400 hover:text-white hover:bg-white/5",
                isSidebarCollapsed && "justify-center px-0"
              )}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside 
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 bg-[#0A0A0A] border-r border-white/5 z-50 flex flex-col"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6B46C1] to-[#E23A5D] flex items-center justify-center font-bold text-white">
                    <img src="/logo.svg" alt="C" className="w-5 h-5 invert" />
                  </div>
                  <span className="font-bold text-lg tracking-tight">Auralis Admin</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                      activeTab === item.id 
                        ? "bg-[#6B46C1]/20 text-[#6B46C1] font-medium" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navigation */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-gray-400 hover:text-white">
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">
              {NAV_ITEMS.find(i => i.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#6B46C1]/50 focus:ring-1 focus:ring-[#6B46C1]/50 transition-all w-64"
              />
            </div>
            
            <button className="relative text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#E23A5D] border border-[#0A0A0A]"></span>
            </button>

            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-white">{profile?.full_name || 'Admin'}</div>
                <div className="text-xs text-[#6B46C1] font-bold">Super Admin</div>
              </div>
              <div className="relative group">
                <button 
                  className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[2px] cursor-pointer hover:scale-105 transition-transform"
                >
                  <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.full_name || 'Admin'}&background=random`} alt="Admin" className="w-full h-full rounded-full border-2 border-[#0A0A0A]" />
                </button>
                <div className="absolute right-0 top-full pt-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50">
                  <div className="w-48 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl py-1">
                    <div className="px-4 py-2 border-b border-white/5 mb-1">
                      <div className="text-sm font-medium text-white">{profile?.full_name || 'Admin User'}</div>
                      <div className="text-xs text-gray-500 truncate">{profile?.email || 'admin@auralis.app'}</div>
                    </div>
                    <button onClick={() => navigate('/dashboard')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white">Return to App</button>
                    <button onClick={() => setActiveTab('settings')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white">Admin Settings</button>
                    <div className="h-px bg-white/10 my-1 mx-2"></div>
                    <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-white/5 flex items-center gap-2">
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto"
          >
            {renderContent()}
          </motion.div>
        </main>
      </div>

    </div>
  );
}
