import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, DollarSign, TrendingUp, Activity, UserPlus, CreditCard, AlertTriangle, RefreshCcw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { cn } from '../../lib/utils';

const COLORS = ['#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899'];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    newUsersToday: 0,
    totalRevenue: 0,
    revenueToday: 0,
    successfulPayments: 0,
    failedPayments: 0,
  });
  
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [planDistribution, setPlanDistribution] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [usersRes, paymentsRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/payments')
        ]);
        
        if (!usersRes.ok || !paymentsRes.ok) throw new Error('Failed to fetch data');
        
        const usersData = await usersRes.json();
        const paymentsData = await paymentsRes.json();
        
        const validUsers = usersData.users || [];
        const validPayments = paymentsData.payments || [];
        const todayStr = new Date().toISOString().split('T')[0];
        
        let newUsersToday = 0;
        const usersByDate: Record<string, number> = {};
        const plansCount: Record<string, number> = { 'Free': 0, 'Creator': 0, 'Pro': 0, 'Studio': 0 };
        
        validUsers.forEach(u => {
          // Plans
          let rawPlan = (u.plan || 'Free').split('|')[0];
          let plan = rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1).toLowerCase();
          plansCount[plan] = (plansCount[plan] || 0) + 1;
          
          if (u.created_at) {
            const dateStr = u.created_at.split('T')[0];
            if (dateStr === todayStr) {
              newUsersToday++;
            }
            usersByDate[dateStr] = (usersByDate[dateStr] || 0) + 1;
          }
        });
        
        // Cumulative Users Growth
        let runningTotalUsers = 0;
        const sortedDates = Object.keys(usersByDate).sort();
        const growthChart = sortedDates.map(date => {
          runningTotalUsers += usersByDate[date];
          return {
            date,
            users: runningTotalUsers,
            newUsers: usersByDate[date]
          };
        }).slice(-30); // Last 30 days of data

        // Process Payments Data
        let totalRev = 0;
        let revToday = 0;
        let successCount = 0;
        let failedCount = 0;
        
        const revByDate: Record<string, number> = {};
        
        validPayments.forEach(p => {
          const status = p.status?.toLowerCase() || 'pending';
          if (status === 'paid' || status === 'success') {
            successCount++;
            const amountInDollars = (p.amount || 0) / 100;
            totalRev += amountInDollars;
            
            if (p.created_at) {
              const dateStr = p.created_at.split('T')[0];
              if (dateStr === todayStr) revToday += amountInDollars;
              
              revByDate[dateStr] = (revByDate[dateStr] || 0) + amountInDollars;
            }
          } else if (status === 'failed' || status === 'declined') {
            failedCount++;
          }
        });
        
        // Revenue Chart Data (Last 30 days)
        const allRevDates = Object.keys(revByDate).sort();
        const revChart = allRevDates.map(date => ({
          date,
          revenue: revByDate[date]
        })).slice(-30);

        setStats({
          totalUsers: validUsers.length,
          newUsersToday,
          totalRevenue: totalRev,
          revenueToday: revToday,
          successfulPayments: successCount,
          failedPayments: failedCount,
        });
        
        setUserGrowthData(growthChart);
        setRevenueData(revChart);
        
        const pd = Object.keys(plansCount).map(key => ({
          name: key,
          value: plansCount[key]
        })).filter(item => item.value > 0);
        setPlanDistribution(pd);

      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 rounded-full border-2 border-[#6B46C1] border-t-transparent animate-spin" />
          Loading analytics from database...
        </div>
      </div>
    );
  }

  const overviewCards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'New Users (Today)', value: stats.newUsersToday.toLocaleString(), icon: UserPlus, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Revenue (Today)', value: `$${stats.revenueToday.toFixed(2)}`, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Successful Payments', value: stats.successfulPayments.toLocaleString(), icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { label: 'Failed Payments', value: stats.failedPayments.toLocaleString(), icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-white">Platform Analytics</h2>
          <p className="text-gray-400 text-sm mt-1">Real-time data from Supabase</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {overviewCards.map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-[#111] border border-white/5 rounded-2xl p-5 relative overflow-hidden group"
          >
            <div className={cn("p-2 rounded-xl mb-3 w-fit", card.bg, card.color)}>
              <card.icon size={20} />
            </div>
            <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">{card.label}</h3>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            
            <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <card.icon size={80} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#111] border border-white/5 rounded-2xl p-5"
        >
          <h3 className="text-lg font-bold text-white mb-4">Revenue Over Time (30 Days)</h3>
          <div className="h-72">
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenueReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" tick={{fill: '#888', fontSize: 12}} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" tick={{fill: '#888', fontSize: 12}} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#E5E7EB' }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenueReal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                <DollarSign size={32} className="mb-2 opacity-50" />
                <p>No revenue data available</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* User Growth Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#111] border border-white/5 rounded-2xl p-5"
        >
          <h3 className="text-lg font-bold text-white mb-4">User Growth (30 Days)</h3>
          <div className="h-72">
            {userGrowthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="colorUsersReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis dataKey="date" stroke="#666" tick={{fill: '#888', fontSize: 12}} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" tick={{fill: '#888', fontSize: 12}} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#E5E7EB' }}
                  />
                  <Area type="monotone" dataKey="users" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorUsersReal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                <Users size={32} className="mb-2 opacity-50" />
                <p>No user data available</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Plan Distribution */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-[#111] border border-white/5 rounded-2xl p-5 lg:col-span-2"
        >
          <h3 className="text-lg font-bold text-white mb-4">Plan Distribution</h3>
          <div className="h-72">
            {planDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {planDistribution.map((entry, index) => (
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
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <p>No plan data available</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
