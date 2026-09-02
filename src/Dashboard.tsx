import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useFeatures } from './useFeatures';
import { useConfirm } from './context/ConfirmContext';
import { safeSaveProjects, loadProjectsFromIndexedDB } from './lib/projectStorage';
import { motion } from 'motion/react';
import {
  Plus,
  Home,
  Folder,
  Layers,
  Wand2,
  Mic,
  Archive,
  MoreHorizontal,
  Search,
  Bell,
  Zap,
  Star,
  Presentation,
  Heart,
  Video,
  Printer,
  FileText,
  Monitor,
  Table,
  Maximize,
  MessageSquare,
  Shield,
  Upload,
  PlusSquare,
  Bot,
  Grid,
  ChevronRight,
  Gift,
  ShieldAlert,
  ChevronDown,
  LayoutTemplate,
  User,
  CreditCard,
  Settings,
  LogOut,
  X
} from 'lucide-react';
import { cn } from './lib/utils';
import SettingsModal from './components/SettingsModal';
import { NotificationsTab } from './components/layout/NotificationsTab';
import PoliciesModal from './components/PoliciesModal';

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const { hasFeature } = useFeatures();
  const { confirm } = useConfirm();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState('Home');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showTerms, setShowTerms] = React.useState(false);
  const [showPolicies, setShowPolicies] = React.useState(false);

  const [showNewProjectModal, setShowNewProjectModal] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState('');
  const [newProjectRatio, setNewProjectRatio] = React.useState<'9:16' | '16:9' | '1:1' | '4:5'>('9:16');

  const DEFAULT_PREMIUM_THUMBNAIL = 'bg-gradient-to-br from-[#6B46C1] via-[#3B0764] to-[#0F172A]';

  React.useEffect(() => {
    if (user) {
      const acceptedLocal = localStorage.getItem(`auralis_terms_accepted_${user.id}`);
      const profileAccepted = (profile as any)?.accepted_terms;
      if (!acceptedLocal && !profileAccepted) {
        setShowTerms(true);
      }
    }
  }, [user, profile]);
  const [projects, setProjects] = React.useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('auralis_projects');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Async load backup from IndexedDB if available to restore full projectData and captions
  React.useEffect(() => {
    loadProjectsFromIndexedDB().then((dbProjects) => {
      if (dbProjects && dbProjects.length > 0) {
        setProjects((prev) => {
          if (prev.length === 0) return dbProjects;
          // Merge full projectData from IndexedDB into existing state
          return prev.map((localP) => {
            const dbP = dbProjects.find((p: any) => p.id === localP.id);
            if (dbP && dbP.projectData) {
              return {
                ...localP,
                ...dbP,
                projectData: dbP.projectData,
              };
            }
            return localP;
          });
        });
      }
    });
  }, []);

  React.useEffect(() => {
    safeSaveProjects(projects);
  }, [projects]);

  const handleNewProject = () => {
    setNewProjectName(`Project ${projects.length + 1}`);
    setNewProjectRatio('9:16');
    setShowNewProjectModal(true);
  };

  const handleConfirmCreateProject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const projectId = Math.random().toString(36).substr(2, 9);
    const rawTitle = newProjectName.trim() || `Project ${projects.length + 1}`;
    const formattedTitle = rawTitle.endsWith('.mp4') ? rawTitle : `${rawTitle}.mp4`;
    const newProj = {
      id: projectId,
      title: formattedTitle,
      time: 'Just now',
      tag: 'Draft',
      duration: '00:00',
      thumbnail: DEFAULT_PREMIUM_THUMBNAIL,
      aspectRatio: newProjectRatio,
      projectData: null
    };
    setProjects([newProj, ...projects]);
    setShowNewProjectModal(false);
    navigate('/timeline', { state: { projectId: newProj.id, title: newProj.title, isNew: true, aspectRatio: newProjectRatio } });
  };

  const handleOpenProject = (project: any) => {
    navigate('/timeline', { state: { projectId: project.id, projectData: project.projectData, title: project.title } });
  };

  const handleUploadSrt = () => {
    navigate('/timeline', { state: { action: 'upload_srt' } });
  };

  const handleUploadVideo = () => {
    navigate('/timeline', { state: { action: 'upload_video' } });
  };

  const handleExploreStyles = () => {
    window.open('/styles', '_blank');
  };


  const handleDeleteProject = (id: string) => {
    setProjects(projects.filter(p => p.id !== id));
  };

  const handleCloneProject = (project: any) => {
    const newProject = { ...project, id: Math.random().toString(36).substr(2, 9), title: `${project.title} (Copy)`, time: 'Just now' };
    setProjects([newProject, ...projects]);
  };

  const handleRenameProject = (id: string, newTitle: string) => {
    setProjects(projects.map(p => p.id === id ? { ...p, title: newTitle } : p));
  };

  const userName = user?.email?.split('@')[0] || 'User';
  const capitalizedName = userName.charAt(0).toUpperCase() + userName.slice(1);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = React.useState(false);
  const [settingsModalTab, setSettingsModalTab] = React.useState<'account' | 'plan' | 'settings'>('account');

  
  
  const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
  
  let daysLeft: number | null = null;
  if (profile?.plan_expires_at) {
    const diff = profile.plan_expires_at - Date.now();
    if (diff > 0) {
      daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
  }

  return (
    <div className="flex h-screen bg-[#F9FAFB] dark:bg-[#050505] text-gray-900 dark:text-white font-sans overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-white dark:bg-[#0A0A0A]  dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] border-b border-gray-200 dark:border-white/10 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-lg"><img src="/logo.svg" alt="C" className="w-5 h-5 invert" /></div>
          <span className="font-bold text-lg">Auralis</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-gray-600 dark:text-gray-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
        </button>
      </div>

      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Left Sidebar */}

      <div className={cn(
        "w-64 bg-white dark:bg-[#050505] border-r border-gray-200 dark:border-white/5 flex flex-col justify-between h-full flex-shrink-0 transition-transform duration-300 absolute md:static z-40",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div>
          {/* Logo (Desktop) */}
          <div className="hidden md:block p-6">
            <div className="w-10 h-10 bg-black dark:bg-[#111111] dark:border dark:border-white/10 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              C
            </div>
          </div>

          <div className="h-16 md:hidden"></div>{/* Create Button */}
          <div className="px-4 mb-4">
            <button 
              onClick={handleNewProject}
              className="w-full bg-[#6B46C1] dark:bg-purple-600 hover:bg-[#553C9A] text-white flex items-center gap-3 px-4 py-2.5 rounded-full font-medium transition-colors"
            >
              <div className="bg-white dark:bg-[#0A0A0A] dark:border-white/5 p-1 rounded-full">
                <Plus className="w-4 h-4 text-[#6B46C1]" />
              </div>
              Create
            </button>
          </div>

          {/* Navigation */}
          <nav className="px-2 space-y-1">
            <NavItem icon={<Home className="w-5 h-5" />} label="Home" active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
            <NavItem icon={<Folder className="w-5 h-5" />} label="Projects" active={activeTab === 'Projects'} onClick={() => setActiveTab('Projects')} />
            <NavItem icon={<Layers className="w-5 h-5" />} label="Templates" active={activeTab === 'Templates'} onClick={() => setActiveTab('Templates')} />
            <NavItem icon={<Wand2 className="w-5 h-5" />} label="Styles" active={activeTab === 'Styles'} onClick={() => setActiveTab('Styles')} />
            <NavItem icon={<Mic className="w-5 h-5" />} label="Voices" active={activeTab === 'Voices'} onClick={() => setActiveTab('Voices')} />
            <NavItem icon={<Star className="w-5 h-5" />} label="Brand Kit" isPro active={activeTab === 'Brand Kit'} onClick={() => setActiveTab('Brand Kit')} />
            <NavItem icon={<Archive className="w-5 h-5" />} label="Assets" active={activeTab === 'Assets'} onClick={() => setActiveTab('Assets')} />
            <NavItem icon={<MessageSquare className="w-5 h-5" />} label="Feedback" active={false} onClick={() => navigate('/feedback')} />
            <NavItem icon={<Bell className="w-5 h-5" />} label="Notifications" active={activeTab === 'Notifications'} onClick={() => setActiveTab('Notifications')} />
            {profile?.role === 'admin' && (
              <NavItem icon={<Shield className="w-5 h-5" />} label="Admin Panel" active={false} onClick={() => navigate('/admin')} />
            )}
          </nav>
        </div>

        {/* Bottom User Area */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5">
          {/* Current Plan Box */}
          <div className="bg-white dark:bg-[#0A0A0A] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-white/5 shadow-sm rounded-2xl p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Current Plan:</span>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">{(profile?.plan || 'Free').split('|')[0]}</span>
                {daysLeft !== null && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Expires in {daysLeft} days</span>
                )}
              </div>
            </div>
          </div>

          {/* User Profile */}
          <div className="relative">
            <div 
              className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] rounded-xl cursor-pointer"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-white font-medium overflow-hidden">
                {capitalizedName.charAt(0)}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{capitalizedName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </div>

            {/* Dropdown Menu */}
            {isProfileDropdownOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-[#0A0A0A]  dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-white/5 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button 
                  onClick={() => { setSettingsModalTab('account'); setSettingsModalOpen(true); setIsProfileDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  Account
                </button>
                <button 
                  onClick={() => { setSettingsModalTab('plan'); setSettingsModalOpen(true); setIsProfileDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  Your Plan
                </button>
                <button 
                  onClick={() => { setSettingsModalTab('settings'); setSettingsModalOpen(true); setIsProfileDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] flex items-center gap-2"
                >
                  <Settings className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  Settings
                </button>
                <button 
                  onClick={() => { setShowPolicies(true); setIsProfileDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  Policies
                </button>
                <div className="h-px bg-gray-100 dark:bg-white/10 my-1 mx-2" />
                <button 
                  onClick={() => signOut()}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
            {/* Click outside backdrop for dropdown */}
            {isProfileDropdownOpen && (
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setIsProfileDropdownOpen(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F9FAFB] dark:bg-[#050505] pt-16 md:pt-0 relative">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#6B46C1]/10 dark:bg-[#6B46C1]/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-500/5 dark:bg-pink-500/10 blur-[120px] rounded-full pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-[1200px] mx-auto p-4 sm:p-8"
        >
          
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
            <div>
              <p className="text-gray-600 dark:text-gray-300 mb-1 font-medium">Welcome back, {capitalizedName} 👋</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => setActiveTab('Notifications')}
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm border transition-colors ${activeTab === 'Notifications' ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400' : 'bg-white dark:bg-transparent border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                <Bell className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Hero / Search */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center justify-center mt-6 mb-16"
          >
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-5xl sm:text-7xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-[#9333EA] to-[#DB2777] mb-8"
            >
              Auralis
            </motion.h1>
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="relative w-full max-w-2xl"
            >
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 dark:text-gray-500" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects" 
                className="w-full bg-white dark:bg-[#0A0A0A]  dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-gray-200 dark:border-white/5 rounded-full py-3 md:py-4 pl-14 pr-6 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all shadow-md text-base md:text-lg placeholder:text-gray-400 dark:text-gray-400"
              />
            </motion.div>
          </motion.div>

          {activeTab === 'Home' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col lg:flex-row gap-8"
          >
            {/* Left Column (Main) */}
            <div className="flex-1 space-y-8">
              
              

              {/* Quick Actions Grid */}
              <section>
                <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Quick Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <ActionCard icon={<PlusSquare className="w-8 h-8 text-[#6B46C1] dark:text-purple-300" />} title="New Project" subtitle="Start from scratch" onClick={handleNewProject} />
                  <ActionCard icon={<Video className="w-8 h-8 text-orange-500 dark:text-orange-400" />} title="Import Video" subtitle="Add captions to your video" onClick={handleUploadVideo} />
                  <ActionCard icon={<div className="w-8 h-8 bg-yellow-400 dark:bg-yellow-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">CC</div>} title="Upload SRT" subtitle="Import your caption file" onClick={handleUploadSrt} />
                  <ActionCard icon={<Bot className="w-8 h-8 text-red-500 dark:text-red-400" />} title="AI Transcribe" subtitle="Auto-generate captions" onClick={handleNewProject} />
                  <ActionCard icon={<Mic className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />} title="Clone Voice" subtitle="Create a digital voice replica" onClick={() => setActiveTab('Voices')} />
                  <ActionCard icon={<LayoutTemplate className="w-8 h-8 text-blue-500 dark:text-blue-400" />} title="From Template" subtitle="Use pre-made caption styles" onClick={() => setActiveTab('Templates')} />
                  <ActionCard icon={<Grid className="w-8 h-8 text-gray-600 dark:text-gray-300" />} title="More Tools" subtitle="Explore all tools" onClick={() => {}} />
                </div>
              </section>

              {/* Promo Banner */}
              <div className="bg-gradient-to-r from-purple-100 via-pink-50 to-orange-50 dark:bg-gradient-to-r dark:from-[#09090B] dark:via-[#1A0B2E] dark:to-[#3B1569] rounded-3xl p-8 relative overflow-hidden flex items-center shadow-sm border border-transparent dark:border-white/5">
                <div className="relative z-10 max-w-sm">
                  <span className="inline-block bg-purple-600 text-white dark:bg-[#1E162B] dark:text-purple-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 flex items-center gap-1 w-max">
                    New in Auralis <ChevronRight className="w-3 h-3" />
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900 dark:text-white">Animated captions.<br/><span className="text-purple-600 dark:text-[#A855F7]">Your way.</span></h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">Stylize, animate and perfect captions that connect and convert.</p>
                  <button onClick={handleExploreStyles} className="bg-[#5B21B6] hover:bg-[#4C1D95] text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
                    Explore Styles <Wand2 className="w-4 h-4" />
                  </button>
                </div>
                {/* Abstract 3D elements placeholder */}
                <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-30 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen" />
              </div>

              {/* Recent Projects */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Projects</h2>
                  <button onClick={() => setActiveTab('Projects')} className="text-[#6B46C1] dark:text-purple-400 font-medium text-sm hover:underline">View all</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredProjects.slice(0, 3).map(project => (
                    <ProjectCard 
                      key={project.id}
                      title={project.title} 
                      time={project.time} 
                      thumbnail={project.thumbnail && !project.thumbnail.includes('bg-emerald') ? project.thumbnail : DEFAULT_PREMIUM_THUMBNAIL} 
                      duration={project.duration || "00:00"}
                      tag={project.tag || "Draft"}
                      onClick={() => handleOpenProject(project)}
                      onDelete={() => handleDeleteProject(project.id)}
                      onClone={() => handleCloneProject(project)}
                      onRename={(newTitle) => handleRenameProject(project.id, newTitle)}
                    />
                  ))}
                  <div 
                    onClick={handleNewProject}
                    className="bg-white dark:bg-[#0A0A0A] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer hover:border-[#6B46C1] dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all min-h-[160px]"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-[#6B46C1] dark:text-purple-300 flex items-center justify-center mb-3">
                      <Plus className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">New Project</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">Start your next idea</p>
                  </div>
                </div>
              </section>

            </div>

            {/* Right Sidebar */}
            <div className="w-full lg:w-72 space-y-6">
              
              {/* Your Plan */}
              <motion.div 
                
                className="bg-white dark:bg-[#0A0A0A]  dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/5"
              >
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Your Plan</h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-[#1E162B] flex items-center justify-center">
                    <Star className="w-4 h-4 fill-[#6B46C1] text-[#6B46C1] dark:fill-[#A855F7] dark:text-[#A855F7]" />
                  </div>
                  <span className="font-semibold text-sm">{(profile?.plan || 'Free').split('|')[0]} Plan</span>
                </div>
              </motion.div>

              {/* Quick Actions List */}
              <motion.div 
                
                className="bg-white dark:bg-[#0A0A0A]  dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] rounded-2xl p-2 shadow-sm border border-gray-100 dark:border-white/5"
              >
                <h3 className="font-bold text-gray-900 dark:text-white p-3 pb-1">Quick Actions</h3>
                <nav className="space-y-0.5">
                  <ListAction icon={<FileText />} label="Caption Styles" />
                  <ListAction icon={<Mic />} label="Voice Library" />
                  <ListAction icon={<span className="font-serif font-bold text-lg leading-none">A</span>} label="Text Effects" />
                  <ListAction icon={<Upload className="rotate-180" />} label="Export Settings" />
                </nav>
              </motion.div>

              {/* Invite Friends */}
              <motion.div 
                
                className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100 relative overflow-hidden"
              >
                <div className="relative z-10">
                  <h3 className="font-bold text-[#6B46C1] dark:text-purple-400 text-lg leading-tight mb-2">
                    Invite friends to Auralis! ✨
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Share Auralis with your<br/>friends and creators.
                  </p>
                  <button className="bg-white dark:bg-[#0A0A0A] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] text-[#6B46C1] dark:text-purple-400 font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-sm hover:shadow-md transition-shadow">
                    Invite Now <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-80 pointer-events-none w-32 h-32 flex items-center justify-center">
                  {/* Gift Box Icon visualization */}
                  <Gift className="w-24 h-24 text-purple-400" />
                </div>
              </motion.div>

            </div>
          </motion.div>
          )}

          {activeTab === 'Projects' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Projects</h2>
                <button onClick={handleNewProject} className="bg-[#6B46C1] dark:bg-purple-600 hover:bg-[#553C9A] text-white px-4 py-2 rounded-lg font-medium transition-colors">
                  New Project
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {filteredProjects.map(project => (
                  <ProjectCard 
                    key={project.id}
                    title={project.title} 
                    time={project.time} 
                    thumbnail={project.thumbnail && !project.thumbnail.includes('bg-emerald') ? project.thumbnail : DEFAULT_PREMIUM_THUMBNAIL} 
                    duration={project.duration || "00:00"}
                    tag={project.tag || "Draft"}
                    onClick={() => handleOpenProject(project)}
                    onDelete={() => handleDeleteProject(project.id)}
                    onClone={() => handleCloneProject(project)}
                    onRename={(newTitle) => handleRenameProject(project.id, newTitle)}
                  />
                ))}
                {filteredProjects.length === 0 && (
                  <div className="col-span-4 text-center py-12 text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-white dark:bg-[#0A0A0A] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
                    <p className="mb-4">No projects created yet.</p>
                    <button onClick={handleNewProject} className="bg-[#6B46C1] dark:bg-purple-600 text-white px-6 py-2 rounded-lg">
                      Create your first project
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'Templates' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Templates Library</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[
                  {
                    id: 'tiktok_viral',
                    name: 'TikTok Viral',
                    platform: 'TikTok',
                    aspectRatio: '9:16',
                    style: 'Bold & Dynamic',
                    thumbnail: 'bg-gradient-to-tr from-pink-500 to-indigo-500'
                  },
                  {
                    id: 'yt_shorts',
                    name: 'YouTube Shorts',
                    platform: 'YouTube',
                    aspectRatio: '9:16',
                    style: 'Clean & Engaging',
                    thumbnail: 'bg-gradient-to-br from-red-500 to-red-800'
                  },
                  {
                    id: 'ig_reels',
                    name: 'Instagram Reels',
                    platform: 'Instagram',
                    aspectRatio: '9:16',
                    style: 'Aesthetic & Smooth',
                    thumbnail: 'bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500'
                  },
                  {
                    id: 'yt_standard',
                    name: 'YouTube Standard',
                    platform: 'YouTube',
                    aspectRatio: '16:9',
                    style: 'Professional',
                    thumbnail: 'bg-gray-800'
                  },
                  {
                    id: 'ig_post',
                    name: 'Instagram Square',
                    platform: 'Instagram',
                    aspectRatio: '1:1',
                    style: 'Minimal',
                    thumbnail: 'bg-gray-200'
                  },
                  {
                    id: 'podcast_clip',
                    name: 'Podcast Clip',
                    platform: 'Any',
                    aspectRatio: '4:5',
                    style: 'Subtitled Highlight',
                    thumbnail: 'bg-gradient-to-tr from-[#0D9488] via-[#0284C7] to-[#1E1B4B]'
                  }
                ].map(template => (
                  <motion.div
                    key={template.id}
                    
                    onClick={() => {
                      const projectId = Math.random().toString(36).substr(2, 9);
                      const newProj = {
                        id: projectId,
                        title: `${template.name} Project`,
                        time: 'Just now',
                        tag: 'Draft',
                        duration: '00:00',
                        thumbnail: template.thumbnail,
                        projectData: null
                      };
                      setProjects([newProj, ...projects]);
                      navigate('/timeline', { state: { projectId: newProj.id, title: newProj.title, isNew: true, templateId: template.id, aspectRatio: template.aspectRatio } });
                    }}
                    className="bg-white dark:bg-[#0A0A0A]  dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group"
                  >
                    <div className={cn("h-40 relative flex items-center justify-center", template.thumbnail)}>
                      <div className="absolute top-3 left-3 bg-white dark:bg-[#0A0A0A] dark:border-white/5 /20 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-md">
                        {template.aspectRatio}
                      </div>
                      <LayoutTemplate className="w-12 h-12 text-white/50 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-gray-900 dark:text-white">{template.name}</h3>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-3">{template.platform} • {template.style}</p>
                      <button className="w-full bg-[#F9FAFB] dark:bg-[#050505] text-gray-700 dark:text-gray-200 hover:bg-[#6B46C1] dark:bg-purple-600 hover:text-white font-medium py-2 rounded-xl text-sm transition-colors">
                        Use Template
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'Notifications' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <NotificationsTab />
            </motion.div>
          )}

          {activeTab !== 'Home' && activeTab !== 'Projects' && activeTab !== 'Templates' && activeTab !== 'Notifications' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-[50vh] text-center bg-white dark:bg-[#0A0A0A] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-dashed border-gray-300 rounded-2xl p-8"
            >
              

          {activeTab === 'Brand Kit' ? (
                <>
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-[#6B46C1] dark:text-purple-400 mb-4">
                    <Wand2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{activeTab}</h2>
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 max-w-md">We are working hard on bringing the new {activeTab} features to life. Check back soon for updates!</p>
                </>
              ) : null}
            </motion.div>
          )}
        </motion.div>
      </div>
      
      {/* Create New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-gray-900 dark:text-white"
          >
            <button 
              type="button"
              onClick={() => setShowNewProjectModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6B46C1] to-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 shrink-0">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-snug">Create New Project</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Choose your project name and canvas layout</p>
              </div>
            </div>

            <form onSubmit={handleConfirmCreateProject} className="space-y-6">
              {/* Project Name Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. My Next Reel"
                  className="w-full bg-gray-50 dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-[#6B46C1] dark:focus:border-purple-500 transition-colors text-gray-900 dark:text-white"
                />
              </div>

              {/* Aspect Ratio Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Aspect Ratio / Format
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: '9:16', name: '9:16', desc: 'TikTok / Reels', shapeClass: 'w-3.5 h-6' },
                    { id: '16:9', name: '16:9', desc: 'YouTube', shapeClass: 'w-6 h-3.5' },
                    { id: '1:1', name: '1:1', desc: 'Square Post', shapeClass: 'w-4.5 h-4.5' },
                    { id: '4:5', name: '4:5', desc: 'Feed Video', shapeClass: 'w-4 h-5' }
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setNewProjectRatio(ratio.id as any)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center relative cursor-pointer",
                        newProjectRatio === ratio.id
                          ? "bg-[#6B46C1]/10 border-[#6B46C1] text-[#6B46C1] dark:text-purple-300 dark:border-purple-500 dark:bg-purple-500/15 shadow-sm font-bold"
                          : "bg-gray-50 dark:bg-[#181818] border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#222]"
                      )}
                    >
                      <div className="h-9 flex items-center justify-center mb-1">
                        <div className={cn("border-2 rounded-sm border-current transition-all", ratio.shapeClass)} />
                      </div>
                      <span className="font-bold text-xs">{ratio.name}</span>
                      <span className="text-[10px] opacity-75 mt-0.5">{ratio.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-200 dark:border-white/10 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#6B46C1] hover:bg-[#5B3CA1] text-white font-semibold text-sm transition-colors shadow-lg shadow-purple-500/25"
                >
                  Create Project
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <SettingsModal 
        isOpen={settingsModalOpen} 
        onClose={() => setSettingsModalOpen(false)} 
        defaultTab={settingsModalTab} 
      />
      <PoliciesModal
        isOpen={showTerms}
        mode="enforce"
        onAccept={() => setShowTerms(false)}
      />
      <PoliciesModal
        isOpen={showPolicies}
        mode="view"
        onClose={() => setShowPolicies(false)}
      />
    </div>
  );
}

// Components

function NavItem({ icon, label, active, isPro, onClick }: { icon: React.ReactNode, label: string, active?: boolean, isPro?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-sm",
      active ? "bg-purple-50 dark:bg-[#2A1647] text-[#6B46C1] dark:text-[#E9D5FF] font-semibold" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1A1A] font-medium"
    )}>
      <div className="flex items-center gap-3">
        {icon}
        {label}
      </div>
      {isPro && (
        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
      )}
    </button>
  );
}

function IconAction({ icon, label, color, isNew }: { icon: React.ReactNode, label: string, color: string, isNew?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer group">
      <div className="relative">
        <div className={cn("w-12 h-12 rounded-full border bg-white dark:bg-[#111111] flex items-center justify-center transition-transform group-hover:scale-105", color)}>
          {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
        </div>
        {isNew && (
          <span className="absolute -top-2 -right-2 bg-[#6B46C1] dark:bg-[#4C1D95] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white dark:border-[#111111]">
            New
          </span>
        )}
      </div>
      <span className="text-xs text-gray-700 dark:text-gray-200 font-medium text-center leading-tight whitespace-nowrap">{label}</span>
    </div>
  );
}

function ActionCard({ icon, title, subtitle, onClick }: { icon: React.ReactNode, title: string, subtitle: string, onClick?: () => void }) {
  return (
    <motion.button 
      
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white dark:bg-[#0A0A0A] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:shadow-md hover:border-gray-200 dark:hover:bg-white/5 dark:hover:border-white/20 transition-all text-center h-[140px] shadow-sm"
    >
      <div className="w-12 h-12 flex items-center justify-center bg-[#F9FAFB] dark:bg-[#111111] dark:border dark:border-white/5 rounded-xl">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-gray-900 dark:text-white text-[13px] leading-tight mb-1">{title}</h3>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 dark:text-gray-500 leading-tight">{subtitle}</p>
      </div>
    </motion.button>
  );
}

function ProjectCard({ title, time, thumbnail, duration, tag, onClick, onDelete, onClone, onRename }: { title: string, time: string, thumbnail: string, duration: string, tag: string, onClick?: () => void, onDelete?: () => void, onClone?: () => void, onRename?: (newTitle: string) => void, key?: React.Key }) {
  const [showMenu, setShowMenu] = React.useState(false);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [renameInput, setRenameInput] = React.useState(title);
  const { confirm } = useConfirm();

  const isGreenOrEmerald = !thumbnail || thumbnail.includes('bg-emerald');
  const finalThumbnail = isGreenOrEmerald
    ? 'bg-gradient-to-br from-[#6B46C1] via-[#3B0764] to-[#0F172A]'
    : thumbnail;

  const isCssClassBg = finalThumbnail.startsWith('bg-');

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      
      transition={{ duration: 0.2 }}
      className={cn(
        "bg-white dark:bg-[#0A0A0A] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative",
        showMenu ? "z-40" : "z-0"
      )}
    >
      <div 
        className={cn("h-[120px] relative bg-cover bg-center rounded-t-2xl overflow-hidden flex items-center justify-center", isCssClassBg ? finalThumbnail : "")} 
        style={!isCssClassBg ? { backgroundImage: `url(${finalThumbnail})` } : undefined}
        onClick={onClick}
      >
        {/* Subtle decorative center badge for gradient/abstract thumbnails */}
        {isCssClassBg && (
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white/80 group-hover:scale-110 group-hover:text-white transition-all border border-white/20 shadow-lg">
            <Video className="w-5 h-5" />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-md">
          {tag}
        </div>
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
          {duration}
        </div>
      </div>
      <div className="p-3 flex justify-between items-start">
        <div onClick={isRenaming ? undefined : onClick} className="flex-1">
          {isRenaming ? (
            <input 
              type="text" 
              value={renameInput}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (renameInput.trim() && onRename) onRename(renameInput.trim());
                  setIsRenaming(false);
                } else if (e.key === 'Escape') {
                  setIsRenaming(false);
                  setRenameInput(title);
                }
              }}
              onBlur={() => {
                if (renameInput.trim() && onRename) onRename(renameInput.trim());
                setIsRenaming(false);
              }}
              className="w-full bg-gray-100 dark:bg-white/10 text-sm font-semibold text-gray-900 dark:text-white px-2 py-0.5 rounded outline-none border border-auralis/50 mb-0.5"
            />
          ) : (
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate max-w-[150px]">{title}</h3>
          )}
          <p className="text-[11px] text-gray-500 dark:text-gray-400 dark:text-gray-500">{time}</p>
        </div>
        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity p-1"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-7 w-32 bg-white dark:bg-[#18181B] rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 py-1 z-[100] text-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 font-medium transition-colors"
              >
                Rename
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (onClone) onClone();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 font-medium transition-colors"
              >
                Clone
              </button>
              <button 
                onClick={() => {
                  confirm({
                    title: "Delete Project",
                    message: "Are you sure you want to delete this project? This cannot be undone.",
                    confirmText: "Delete",
                    onConfirm: () => {
                      if (onDelete) onDelete();
                    }
                  });
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ListAction({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#F9FAFB] dark:bg-[#111111] border border-gray-100 dark:border-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 group-hover:bg-white dark:group-hover:bg-[#1A1A1A] transition-colors">
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" }) : icon}
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
    </button>
  );
}
