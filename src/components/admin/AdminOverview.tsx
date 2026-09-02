import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Activity, UserPlus, CreditCard, AlertTriangle, RefreshCcw, Star, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { cn } from '../../lib/utils';

const COLORS = ['#9CA3AF', '#3B82F6', '#8B5CF6', '#F59E0B'];

const StatCard: React.FC<{ stat: any, index: number }> = ({ stat, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-[#111] border border-white/5 rounded-2xl p-4 flex flex-col relative overflow-hidden group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-2 rounded-xl bg-white/5", stat.color)}>
          <stat.icon size={20} />
        </div>
        {stat.change && (
          <div className={cn(
            "text-xs font-bold px-2 py-1 rounded-full",
            stat.trend === 'up' ? "text-emerald-400 bg-emerald-400/10" : 
            stat.trend === 'down' ? "text-red-400 bg-red-400/10" : 
            "text-gray-400 bg-gray-400/10"
          )}>
            {stat.change}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">{stat.label}</h3>
        <p className="text-2xl font-bold text-white">{stat.value}</p>
      </div>
      
      {/* Tiny sparkline background effect */}
      <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <stat.icon size={100} />
      </div>
    </motion.div>
  );
};

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    free: 0,
    creator: 0,
    pro: 0,
    studio: 0,
    totalRevenue: 0,
    revenueToday: 0,
    failedPayments: 0,
  });
  const [growthData, setGrowthData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [usersRes, paymentsRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/payments')
        ]);
        
        if (!usersRes.ok || !paymentsRes.ok) throw new Error('Failed to fetch data');
        
        const usersData = await usersRes.json();
        const paymentsData = await paymentsRes.json();
        
        const validProfiles = usersData.users || [];
        const validPayments = paymentsData.payments || [];
        const todayStr = new Date().toISOString().split('T')[0];

        let free = 0, creator = 0, pro = 0, studio = 0;
        const usersByDate: Record<string, number> = {};
        const revByDate: Record<string, number> = {};

        validProfiles.forEach(user => {
          const plan = ((user.plan || 'Free').split('|')[0]).toLowerCase();
          if (plan === 'free') free++;
          else if (plan === 'creator') creator++;
          else if (plan === 'pro') pro++;
          else if (plan === 'studio') studio++;
          
          if (user.created_at) {
            const d = user.created_at.split('T')[0];
            usersByDate[d] = (usersByDate[d] || 0) + 1;
          }
        });

        let totalRevenue = 0;
        let revenueToday = 0;
        let failedPayments = 0;

        validPayments.forEach(p => {
          const status = (p.status || 'pending').toLowerCase();
          if (status === 'paid' || status === 'success') {
            const amt = (p.amount || 0) / 100;
            totalRevenue += amt;
            if (p.created_at) {
              const d = p.created_at.split('T')[0];
              if (d === todayStr) revenueToday += amt;
              revByDate[d] = (revByDate[d] || 0) + amt;
            }
          } else if (status === 'failed' || status === 'declined') {
            failedPayments++;
          }
        });

        // Merge chart data for last 30 days
        const allDatesSet = new Set([...Object.keys(usersByDate), ...Object.keys(revByDate)]);
        const allDates = Array.from(allDatesSet).sort().slice(-30);
        
        let runningUsers = 0;
        // recalculate running total up to start of 30 days window
        const sortedAllDates = Array.from(allDatesSet).sort();
        const cutoff = allDates.length > 0 ? allDates[0] : '';
        for (const d of sortedAllDates) {
          if (d < cutoff) runningUsers += (usersByDate[d] || 0);
        }

        const chartData = allDates.map(date => {
          runningUsers += (usersByDate[date] || 0);
          return {
            name: date,
            users: runningUsers,
            revenue: revByDate[date] || 0
          };
        });

        setStats({
          totalUsers: validProfiles.length,
          free,
          creator,
          pro,
          studio,
          totalRevenue,
          revenueToday,
          failedPayments,
        });
        
        setGrowthData(chartData);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  const STATS = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'text-blue-500', trend: 'neutral' },
    { label: 'Free Users', value: stats.free.toLocaleString(), icon: UserPlus, color: 'text-gray-400', trend: 'neutral' },
    { label: 'Pro Subscribers', value: stats.pro.toLocaleString(), icon: Star, color: 'text-purple-500', trend: 'neutral' },
    { label: 'Studio Subscribers', value: stats.studio.toLocaleString(), icon: Crown, color: 'text-yellow-500', trend: 'neutral' },
    { label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-500', trend: 'neutral' },
    { label: "Today's Revenue", value: `$${stats.revenueToday.toFixed(2)}`, icon: CreditCard, color: 'text-emerald-400', trend: 'neutral' },
    { label: 'Failed Payments', value: stats.failedPayments.toString(), icon: AlertTriangle, color: 'text-red-400', trend: 'neutral' },
  ];

  const planData = [
    { name: 'Free', value: stats.free },
    { name: 'Creator', value: stats.creator },
    { name: 'Pro', value: stats.pro },
    { name: 'Studio', value: stats.studio },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        Loading real-time data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {STATS.map((stat, i) => (
          <StatCard key={i} stat={stat} index={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Users Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#111] border border-white/5 rounded-2xl p-5"
        >
          <h3 className="text-lg font-bold text-white mb-4">Revenue & User Growth</h3>
          <div className="h-72">
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="name" stroke="#666" tick={{fill: '#888', fontSize: 12}} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#666" tick={{fill: '#888', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#666" tick={{fill: '#888', fontSize: 12}} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#E5E7EB' }}
                  />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                  <Area yAxisId="right" type="monotone" dataKey="users" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" name="Users" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No activity data yet
              </div>
            )}
          </div>
        </motion.div>

        {/* Users by Plan */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-[#111] border border-white/5 rounded-2xl p-5"
        >
          <h3 className="text-lg font-bold text-white mb-4">Users by Plan</h3>
          <div className="h-72 flex items-center justify-center">
            {planData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {planData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#E5E7EB' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-500">No data available</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
