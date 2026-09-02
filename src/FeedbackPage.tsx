import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Bug, Lightbulb, CreditCard, Film, Zap, Star, Send, CheckCircle, ArrowLeft, Clock, User, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuth } from './context/AuthContext';
import { cn } from './lib/utils';

const CATEGORIES = [
  { id: 'Bug Report', icon: Bug, color: 'text-red-400' },
  { id: 'Feature Request', icon: Lightbulb, color: 'text-amber-400' },
  { id: 'Payment Issue', icon: CreditCard, color: 'text-emerald-400' },
  { id: 'Export Issue', icon: Film, color: 'text-blue-400' },
  { id: 'Performance', icon: Zap, color: 'text-purple-400' },
  { id: 'General Feedback', icon: MessageSquare, color: 'text-gray-500 dark:text-gray-400' },
  { id: 'Other', icon: MessageSquare, color: 'text-gray-500 dark:text-gray-400' }
];

export default function FeedbackPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');
  
  // Submit State
  const [category, setCategory] = useState('Bug Report');
  const [subCategory, setSubCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // History State
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    if (!profile) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', profile.id)
        .neq('category', 'SYSTEM_REFUND_LOG')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setFeedbacks(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadFeedbackDetails = async (f: any) => {
    setSelectedFeedback(f);
    try {
      const { data, error } = await supabase
        .from('feedback_messages')
        .select(`*, user:profiles(full_name, avatar_url)`)
        .eq('feedback_id', f.id)
        .order('created_at', { ascending: true });
        
      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendReply = async () => {
    if (!selectedFeedback || !replyText.trim() || !profile) return;
    try {
      const newMsg = {
        feedback_id: selectedFeedback.id,
        user_id: profile.id,
        message: replyText,
        is_admin: false
      };
      const { data, error } = await supabase.from('feedback_messages').insert([newMsg]).select(`*, user:profiles(full_name, avatar_url)`).single();
      
      if (!error && data) {
        setMessages([...messages, data]);
        setReplyText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getDeviceInfo = () => {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      setErrorMsg('You must be logged in to submit feedback.');
      return;
    }
    if (!subject.trim() || !description.trim()) {
      setErrorMsg('Subject and description are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const metadata = {

        ...getDeviceInfo(),
        appVersion: '1.0.0',
        plan: profile.plan || 'Free',
        timestamp: new Date().toISOString()
      ,
        subCategory: subCategory
      };

      const finalSubject = subCategory ? `[${subCategory}] ${subject}` : subject;

      const { error } = await supabase.from('feedback').insert([{
        user_id: profile.id,
        category,
        subject: finalSubject,
        description,
        rating,
        metadata
      }]);

      if (error) throw error;
      
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setActiveTab('history');
        setSubject('');
        setDescription('');
      }, 3000);
      
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white flex flex-col items-center justify-start pt-20 p-4 selection:bg-[#6B46C1]/30">
      <motion.button 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={20} />
        <span className="font-medium">Back</span>
      </motion.button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "w-full transition-all duration-300",
          activeTab === 'history' && selectedFeedback ? "max-w-4xl" : "max-w-2xl"
        )}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Support & Feedback</h1>
          
          <div className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-white/5 p-1 rounded-xl w-fit mx-auto">
            <button
              onClick={() => { setActiveTab('submit'); setSelectedFeedback(null); }}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === 'submit' ? "bg-white dark:bg-white/10 shadow-sm dark:shadow-none text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Submit Feedback
            </button>
            <button
              onClick={() => { setActiveTab('history'); setSelectedFeedback(null); }}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === 'history' ? "bg-white dark:bg-white/10 shadow-sm dark:shadow-none text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              My History
            </button>
          </div>
        </div>

        {activeTab === 'submit' && (
          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-3xl p-12 text-center flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">Thank you!</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">Your feedback has been successfully submitted. Our team will review it shortly.</p>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20 }}
                onSubmit={handleSubmit}
                className="bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-3xl p-6 md:p-8 space-y-6"
              >
                {errorMsg && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                    {errorMsg}
                  </div>
                )}

                {/* Category Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Category</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {CATEGORIES.map((cat) => {
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200",
                            isSelected 
                              ? "bg-[#6B46C1]/10 border-[#6B46C1] shadow-[0_0_15px_rgba(107,70,193,0.15)]" 
                              : "bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#222]"
                          )}
                        >
                          <cat.icon size={20} className={isSelected ? cat.color : ""} />
                          <span className={cn("text-xs font-medium text-center", isSelected ? "text-gray-900 dark:text-white" : "")}>{cat.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>



                {category === 'Payment Issue' && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Payment Issue Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {['Refund Request', 'Subscription Not Added', 'Other'].map((sub) => (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setSubCategory(sub)}
                          className={cn(
                            "py-2.5 px-4 rounded-xl border text-sm transition-all duration-200 text-center",
                            subCategory === sub 
                              ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                              : "bg-white dark:bg-[#1A1A1A] border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 text-gray-500 dark:text-gray-400"
                          )}
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Subject */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                  <input 
                    type="text" 
                    required
                    maxLength={100}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief summary of your feedback" 
                    className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/5 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-500 dark:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#6B46C1]/50 focus:ring-1 focus:ring-[#6B46C1]/50 transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex justify-between">
                    <span>Description</span>
                    <span className="text-gray-600 font-normal">{description.length}/1000</span>
                  </label>
                  <textarea 
                    required
                    maxLength={1000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please provide as much detail as possible..." 
                    className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/5 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder:text-gray-500 dark:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#6B46C1]/50 focus:ring-1 focus:ring-[#6B46C1]/50 transition-all min-h-[150px] resize-y"
                  />
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">How would you rate your experience? (Optional)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={(e) => {
                          const btns = e.currentTarget.parentElement?.children;
                          if (btns) {
                            for(let i=0; i<btns.length; i++) {
                              if (i < star) btns[i].classList.add('hover-active');
                              else btns[i].classList.remove('hover-active');
                            }
                          }
                        }}
                        onMouseLeave={(e) => {
                          const btns = e.currentTarget.parentElement?.children;
                          if (btns) {
                            for(let i=0; i<btns.length; i++) {
                              btns[i].classList.remove('hover-active');
                            }
                          }
                        }}
                        className="p-2 -ml-2 text-gray-600 transition-colors [&.hover-active]:text-yellow-500"
                      >
                        <Star size={28} className={cn(
                          "transition-all", 
                          rating && rating >= star ? "fill-yellow-500 text-yellow-500" : ""
                        )} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
                  <p className="text-xs text-gray-500 max-w-[60%]">
                    System information (browser, device) will be included automatically to help us investigate issues.
                  </p>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-[#6B46C1] to-[#E23A5D] hover:opacity-90 text-gray-900 dark:text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Submit Feedback
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        )}

        {activeTab === 'history' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col md:flex-row gap-6 h-[600px]"
          >
            {/* List */}
            <div className={cn(
              "flex flex-col bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-3xl overflow-hidden transition-all duration-300",
              selectedFeedback ? "hidden md:flex w-1/3" : "w-full"
            )}>
              <div className="p-4 border-b border-gray-200 dark:border-white/5 font-bold text-gray-900 dark:text-white">Your Tickets</div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {isLoadingHistory ? (
                  <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : feedbacks.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">You haven't submitted any feedback yet.</div>
                ) : (
                  feedbacks.map(f => (
                    <button
                      key={f.id}
                      onClick={() => loadFeedbackDetails(f)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl mb-2 transition-colors",
                        selectedFeedback?.id === f.id ? "bg-white dark:bg-white/10 shadow-sm dark:shadow-none" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[70%]">{f.subject}</span>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-medium",
                          f.status === 'Resolved' ? "bg-emerald-500/10 text-emerald-500" :
                          f.status === 'Open' ? "bg-blue-500/10 text-blue-500" :
                          "bg-amber-500/10 text-amber-500"
                        )}>{f.status}</span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center justify-between">
                        <span>{f.category}</span>
                        <span>{new Date(f.created_at).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Detail */}
            {selectedFeedback && (
              <div className="flex-1 flex flex-col bg-gray-100 dark:bg-[#111] border border-gray-200 dark:border-white/5 rounded-3xl overflow-hidden h-full">
                <div className="p-5 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedFeedback(null)} className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">{selectedFeedback.subject}</h3>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                        <span className="px-1.5 py-0.5 bg-white/5 rounded">{selectedFeedback.category}</span>
                        <span>{new Date(selectedFeedback.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                  {/* Original Request */}
                  <div className="bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/5 rounded-2xl p-4">
                    <div className="flex gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-white dark:bg-white/10 shadow-sm dark:shadow-none flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0">
                        <User size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white mb-2">You</div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedFeedback.description}</div>
                      </div>
                    </div>
                  </div>

                  {/* Message Thread */}
                  {messages.map(msg => (
                    <div key={msg.id} className="flex gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        msg.is_admin ? "bg-[#6B46C1] text-gray-900 dark:text-white" : "bg-white dark:bg-white/10 shadow-sm dark:shadow-none text-gray-500 dark:text-gray-400"
                      )}>
                        {msg.is_admin ? <Shield size={16} /> : <User size={16} />}
                      </div>
                      <div className={cn(
                        "rounded-2xl p-4 text-sm max-w-[85%]",
                        msg.is_admin ? "bg-white dark:bg-[#1A1A1A] border border-[#6B46C1]/20 text-gray-200" : "bg-white dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/5 text-gray-200"
                      )}>
                        <div className="flex items-center gap-2 mb-1.5 text-[10px]">
                          <span className={cn("font-bold", msg.is_admin ? "text-[#6B46C1]" : "text-gray-500 dark:text-gray-400")}>
                            {msg.is_admin ? 'Auralis Support' : 'You'}
                          </span>
                          <span className="text-gray-600">{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.message}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                {selectedFeedback.status !== 'Closed' && selectedFeedback.status !== 'Resolved' && (
                  <div className="p-4 border-t border-gray-200 dark:border-white/5 bg-[#0A0A0A]">
                    <div className="relative">
                      <textarea 
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your reply..."
                        className="w-full bg-white dark:bg-[#1A1A1A] border border-gray-300 dark:border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-[#6B46C1]/50 focus:ring-1 focus:ring-[#6B46C1]/50 min-h-[60px] resize-none"
                      />
                      <button 
                        onClick={sendReply}
                        disabled={!replyText.trim()}
                        className="absolute bottom-3 right-3 p-2 bg-white dark:bg-white/10 shadow-sm dark:shadow-none text-gray-900 dark:text-white rounded-lg disabled:opacity-50 hover:bg-white/20 transition-colors"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

