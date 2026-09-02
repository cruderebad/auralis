import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, AlertTriangle, MessageSquare, Info, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export function NotificationsTab() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!profile) return;
      setLoading(true);
      
      const notifs: any[] = [];
      
      // 1. Pack Deadline (3 days before end)
      if (profile.plan_expires_at) {
        const timeDiff = profile.plan_expires_at - Date.now();
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && daysLeft <= 3) {
          notifs.push({
            id: 'deadline-' + profile.plan_expires_at,
            type: 'warning',
            title: 'Subscription Expiring Soon',
            message: `Your ${profile.plan?.split('|')[0] || 'plan'} will expire in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Renew now to keep your benefits.`,
            date: new Date().toISOString(),
            action: undefined
          });
        }
      }

      // 2. Feedback Replies
      try {
        const { data: userFeedbacks } = await supabase
          .from('feedback')
          .select('id, subject')
          .eq('user_id', profile.id);
          
        if (userFeedbacks && userFeedbacks.length > 0) {
          const feedbackIds = userFeedbacks.map(f => f.id);
          const { data: replies } = await supabase
            .from('feedback_messages')
            .select('*, feedback:feedback_id(subject)')
            .in('feedback_id', feedbackIds)
            .eq('is_admin', true)
            .order('created_at', { ascending: false })
            .limit(10);
            
          if (replies) {
            replies.forEach(reply => {
              notifs.push({
                id: 'reply-' + reply.id,
                type: 'info',
                title: 'New Feedback Reply',
                message: `An admin replied to your feedback: "${reply.feedback?.subject || 'Ticket'}"`,
                date: reply.created_at,
                action: { label: 'View', onClick: () => navigate('/feedback') }
              });
            });
          }
        }
      } catch (err) {
        console.error('Error fetching feedback replies:', err);
      }

      // 3. Global Announcements
      try {
        const { data: announcements, error } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (!error && announcements) {
          announcements.forEach(ann => {
            notifs.push({
              id: 'ann-' + ann.id,
              type: 'announcement',
              title: ann.title || 'Announcement',
              message: ann.message || ann.content,
              date: ann.created_at
            });
          });
        } else {
           // Fallback global announcement
           notifs.push({
              id: 'ann-welcome',
              type: 'announcement',
              title: 'Welcome to the new platform!',
              message: 'We have updated our export engine and added new Brand Kit features. Check them out!',
              date: new Date(Date.now() - 86400000).toISOString()
           });
        }
      } catch (err) {
         // Fallback
      }
      
      // Sort notifications by date desc
      notifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setNotifications(notifs);
      setLoading(false);
    };

    fetchNotifications();
  }, [profile, navigate]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'info': return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'announcement': return <Bell className="w-5 h-5 text-purple-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Stay updated with the latest news and alerts.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0A0A0A] rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">You're all caught up!</h3>
            <p className="text-gray-500 max-w-sm">No new notifications at the moment.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {notifications.map(notif => (
              <motion.div 
                key={notif.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex gap-4 sm:gap-6"
              >
                <div className="shrink-0 mt-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    notif.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/10' :
                    notif.type === 'info' ? 'bg-blue-100 dark:bg-blue-500/10' :
                    'bg-purple-100 dark:bg-purple-500/10'
                  }`}>
                    {getIcon(notif.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-1">
                    <h4 className="text-base font-bold text-gray-900 dark:text-white truncate">
                      {notif.title}
                    </h4>
                    <span className="text-xs font-medium text-gray-400 whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    {notif.message}
                  </p>
                  {notif.action && (
                    <button 
                      onClick={notif.action.onClick}
                      className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${
                        notif.type === 'warning' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/30' :
                        'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30'
                      }`}
                    >
                      {notif.action.label}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
