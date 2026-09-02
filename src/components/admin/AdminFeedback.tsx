import { useConfirm } from '../../context/ConfirmContext';
import React, { useState, useEffect } from 'react';
import { Search, Filter, MessageSquare, AlertCircle, CheckCircle, Clock, Star, ChevronDown, Reply } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export default function AdminFeedback() {
  const { alert } = useConfirm();

  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [userPayments, setUserPayments] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const { profile } = useAuth();

  useEffect(() => {
    fetchFeedback();
  }, [filterStatus]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/feedback');
      if (!res.ok) throw new Error('Failed to fetch feedback');
      const data = await res.json();
      let fData = data.feedback || [];
      if (filterStatus !== 'All') {
        fData = fData.filter((item: any) => item.status === filterStatus);
      }
      setFeedback(fData);
    } catch (error) {
      console.error('Error fetching feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (feedbackId: string) => {
    try {
      const res = await fetch(`/api/admin/feedback-messages/${feedbackId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchUserPayments = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/payments`);
      if (res.ok) {
        const data = await res.json();
        setUserPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching user payments:', error);
    }
  };

  useEffect(() => {
    if (selectedFeedback && selectedFeedback.user_id) {
       fetchUserPayments(selectedFeedback.user_id);
    } else {
       setUserPayments([]);
    }
  }, [selectedFeedback]);

  const handleSelectFeedback = (f: any) => {
    setSelectedFeedback(f);
    setAdminNote(f.admin_notes || '');
    fetchMessages(f.id);
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/admin/feedback/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      setFeedback(feedback.map(f => f.id === id ? { ...f, status } : f));
      if (selectedFeedback?.id === id) {
        setSelectedFeedback({ ...selectedFeedback, status });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updatePriority = async (id: string, priority: string) => {
    try {
      await fetch(`/api/admin/feedback/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priority }) });
      setFeedback(feedback.map(f => f.id === id ? { ...f, priority } : f));
      if (selectedFeedback?.id === id) {
        setSelectedFeedback({ ...selectedFeedback, priority });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveAdminNote = async () => {
    if (!selectedFeedback) return;
    try {
      await fetch(`/api/admin/feedback/${selectedFeedback.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ admin_notes: adminNote }) });
      setFeedback(feedback.map(f => f.id === selectedFeedback.id ? { ...f, admin_notes: adminNote } : f));
      alert('Note saved!');
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
        is_admin: true
      };
      const res = await fetch(`/api/admin/feedback-messages/${selectedFeedback.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: replyText }) }); const data = res.ok ? await res.json() : null; const error = !res.ok;
      
      if (!error && data) {
        setMessages([...messages, data]);
        setReplyText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Feedback List */}
      <div className={cn("flex flex-col bg-[#111] border border-white/5 rounded-2xl overflow-hidden", selectedFeedback ? "w-1/3 hidden lg:flex" : "w-full")}>
        <div className="p-4 border-b border-white/5 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search feedback..." 
              className="w-full bg-black/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#6B46C1]/50 focus:ring-1 focus:ring-[#6B46C1]/50"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
            {['All', 'Open', 'Investigating', 'Waiting for User', 'Resolved', 'Closed'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors",
                  filterStatus === status 
                    ? "bg-white/10 text-white" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#6B46C1] border-t-transparent rounded-full animate-spin" />
              Loading feedback...
            </div>
          ) : feedback.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No feedback matching criteria. (Make sure you've run the SQL migration to create the table).
            </div>
          ) : (
            feedback.map(item => (
              <button 
                key={item.id}
                onClick={() => handleSelectFeedback(item)}
                className={cn(
                  "w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-colors",
                  selectedFeedback?.id === item.id && "bg-white/5 border-l-2 border-l-[#6B46C1]"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                    item.status === 'Open' ? "bg-emerald-500/10 text-emerald-500" :
                    item.status === 'Resolved' ? "bg-blue-500/10 text-blue-500" :
                    item.status === 'Closed' ? "bg-gray-500/10 text-gray-400" :
                    "bg-amber-500/10 text-amber-500"
                  )}>
                    {item.status}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="font-medium text-white text-sm mb-1 line-clamp-1">{item.subject}</h4>
                <p className="text-xs text-gray-400 line-clamp-2 mb-3">{item.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 bg-white/5 rounded text-[10px]">{item.category}</span>
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px]",
                      item.priority === 'Critical' ? "text-red-400 bg-red-400/10" :
                      item.priority === 'High' ? "text-orange-400 bg-orange-400/10" :
                      item.priority === 'Medium' ? "text-yellow-400 bg-yellow-400/10" :
                      "text-gray-400 bg-gray-400/10"
                    )}>{item.priority}</span>
                  </div>
                  {item.rating && (
                    <div className="flex items-center gap-0.5 text-yellow-500">
                      <Star size={10} className="fill-yellow-500" />
                      <span>{item.rating}</span>
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Feedback Detail */}
      {selectedFeedback ? (
        <div className="flex-1 flex flex-col bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex flex-col md:flex-row gap-6 md:items-start justify-between">
            <div className="flex-1">
              <button 
                className="lg:hidden text-gray-400 hover:text-white mb-4 flex items-center gap-1 text-sm"
                onClick={() => setSelectedFeedback(null)}
              >
                &larr; Back to list
              </button>
              <h2 className="text-xl font-bold text-white mb-2">{selectedFeedback.subject}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                  <img 
                    src={selectedFeedback.user?.avatar_url || `https://ui-avatars.com/api/?name=${selectedFeedback.user?.full_name || 'U'}&background=random`} 
                    alt="" 
                    className="w-6 h-6 rounded-full bg-white/10"
                  />
                  <span className="font-medium text-white">{selectedFeedback.user?.full_name || 'Anonymous'}</span>
                </div>
                <span>•</span>
                <span>{selectedFeedback.user?.email}</span>
                <span>•</span>
                {(() => {
                  const planString = selectedFeedback.user?.plan || 'Free';
                  const planName = planString.split('|')[0];
                  let planExpiry = '';
                  if (planString.includes('|')) {
                     const ts = parseInt(planString.split('|')[1], 10);
                     if (!isNaN(ts)) {
                        planExpiry = new Date(ts).toLocaleDateString();
                     }
                  }
                  return (
                    <span className="px-2 py-0.5 bg-white/5 rounded-md text-xs flex gap-1 items-center">
                      <span className={cn("font-bold", planName.toLowerCase() === 'studio' ? 'text-amber-500' : planName.toLowerCase() === 'pro' ? 'text-purple-500' : planName.toLowerCase() === 'creator' ? 'text-blue-500' : 'text-gray-400')}>{planName}</span>
                      {planExpiry && <span className="text-gray-500 ml-1">until {planExpiry}</span>}
                    </span>
                  );
                })()}
                <span>•</span>
                <span>{new Date(selectedFeedback.created_at).toLocaleString()}</span>
              </div>
              <div className="bg-black/30 rounded-xl p-4 text-sm text-gray-300 leading-relaxed border border-white/5 whitespace-pre-wrap">
                {selectedFeedback.description}
              </div>
            </div>
            
            {/* Meta panel */}
            <div className="w-full md:w-64 space-y-4 shrink-0">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Status</label>
                <select 
                  value={selectedFeedback.status}
                  onChange={(e) => updateStatus(selectedFeedback.id, e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#6B46C1]/50"
                >
                  <option value="Open">Open</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Waiting for User">Waiting for User</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Priority</label>
                <select 
                  value={selectedFeedback.priority}
                  onChange={(e) => updatePriority(selectedFeedback.id, e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#6B46C1]/50"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              {selectedFeedback.metadata && Object.keys(selectedFeedback.metadata).length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Device Info</label>
                  <div className="bg-[#1A1A1A] rounded-lg p-3 text-[10px] font-mono text-gray-400 space-y-1 border border-white/5">
                    {Object.entries(selectedFeedback.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="opacity-70">{key}:</span>
                        <span className="text-white text-right max-w-[120px] truncate" title={String(value)}>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            
              {userPayments.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">User Payments</label>
                  <div className="bg-[#1A1A1A] rounded-lg p-3 text-[10px] font-mono text-gray-400 space-y-2 border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                    {userPayments.map(payment => (
                      <div key={payment.id} className="flex flex-col gap-1 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium capitalize">{payment.package}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold",
                            (payment.status || 'pending').toLowerCase() === 'paid' || (payment.status || 'pending').toLowerCase() === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                            (payment.status || 'pending').toLowerCase() === 'refunded' ? "bg-purple-500/10 text-purple-500" :
                            (payment.status || 'pending').toLowerCase() === 'pending' ? "bg-amber-500/10 text-amber-500" :
                            "bg-red-500/10 text-red-500"
                          )}>
                            {payment.status || 'pending'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center opacity-70">
                          <span>₹{(payment.amount / 100).toFixed(2)}</span>
                          <span>{new Date(payment.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Internal Notes */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                <label className="text-xs font-bold text-amber-500/70 uppercase tracking-wider mb-2 block flex items-center justify-between">
                  <span>Internal Admin Notes</span>
                  <button onClick={saveAdminNote} className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 rounded text-[10px] transition-colors">Save Note</button>
                </label>
                <textarea 
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Private notes only visible to admins..."
                  className="w-full bg-black/20 border border-amber-500/10 rounded-lg p-3 text-sm text-amber-500/90 focus:outline-none focus:border-amber-500/30 min-h-[80px]"
                />
              </div>

              {/* Message Thread */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white border-b border-white/5 pb-2">Conversation History</h3>
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-4">No messages yet.</p>
                ) : (
                  messages.map(msg => (
                    <div key={msg.id} className={cn(
                      "flex gap-3 max-w-[80%]",
                      msg.is_admin ? "ml-auto flex-row-reverse" : ""
                    )}>
                      <img 
                        src={msg.user?.avatar_url || `https://ui-avatars.com/api/?name=${msg.user?.full_name || 'U'}&background=random`} 
                        alt="" 
                        className="w-8 h-8 rounded-full bg-white/10 shrink-0"
                      />
                      <div className={cn(
                        "rounded-2xl p-4 text-sm",
                        msg.is_admin ? "bg-[#6B46C1] text-white rounded-tr-none" : "bg-[#1A1A1A] border border-white/5 text-gray-200 rounded-tl-none"
                      )}>
                        <div className="flex items-center gap-2 mb-1.5 opacity-70 text-[10px]">
                          <span className="font-bold">{msg.user?.full_name || (msg.is_admin ? 'Admin' : 'User')}</span>
                          <span>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.message}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Reply Box */}
            <div className="p-4 border-t border-white/5 bg-[#0A0A0A]">
              <div className="relative">
                <textarea 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                  placeholder="Type a reply to the user... (Press Enter to send)"
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#6B46C1]/50 focus:ring-1 focus:ring-[#6B46C1]/50 resize-none min-h-[80px]"
                />
                <button 
                  onClick={sendReply}
                  disabled={!replyText.trim()}
                  className="absolute bottom-3 right-3 p-2 bg-[#6B46C1] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#5B3CA1] transition-colors"
                >
                  <Reply size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-[#111] border border-white/5 rounded-2xl text-center p-8">
          <MessageSquare className="w-16 h-16 text-white/10 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Select a feedback ticket</h2>
          <p className="text-gray-500 max-w-sm">Click on any feedback item in the list to view its details, conversation history, and take action.</p>
        </div>
      )}
    </div>
  );
}
