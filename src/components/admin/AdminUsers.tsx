import { useConfirm } from '../../context/ConfirmContext';
import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, ShieldOff, Edit, Trash2, ArrowUpCircle, ArrowDownCircle, Zap, Eye, Key, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';


export default function AdminUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('All');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, alert } = useConfirm();
  const [timeModalUser, setTimeModalUser] = useState<any>(null);
  const [timeDays, setTimeDays] = useState<string>("30");
  const [isSubmittingTime, setIsSubmittingTime] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdatePlan = async (user: any, newPlanType: string) => {
    let timestamp = "";
    if (user.plan && user.plan.includes('|')) {
       timestamp = user.plan.split('|')[1];
    }
    
    let finalPlan = newPlanType;
    if (timestamp && newPlanType !== 'Free') {
       finalPlan = `${newPlanType}|${timestamp}`;
    }
    
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: finalPlan })
      });
      if (!res.ok) throw new Error('Failed to update plan');
      setUsers(users.map(u => u.id === user.id ? { ...u, plan: finalPlan } : u));
    } catch (err) {
      console.error('Error updating plan:', err);
      alert('Failed to update plan.');
    }
  };

  const handleSaveTime = async () => {
    if (!timeModalUser) return;
    const days = parseInt(timeDays, 10);
    if (isNaN(days)) return;
    
    let currentPlan = "Free";
    let currentExpiry = Date.now();
    if (timeModalUser.plan && timeModalUser.plan.includes('|')) {
       const parts = timeModalUser.plan.split('|');
       currentPlan = parts[0];
       currentExpiry = parseInt(parts[1], 10);
       if (isNaN(currentExpiry)) currentExpiry = Date.now();
    } else if (timeModalUser.plan && timeModalUser.plan !== 'Free') {
       currentPlan = timeModalUser.plan;
    }
    
    if (currentPlan === 'Free') {
       alert("Cannot add time to Free plan. Please upgrade the user first.");
       setTimeModalUser(null);
       return;
    }
    
    const baseTime = currentExpiry > Date.now() ? currentExpiry : Date.now();
    const newExpiry = baseTime + (days * 24 * 60 * 60 * 1000);
    const finalPlan = `${currentPlan}|${newExpiry}`;
    
    setIsSubmittingTime(true);
    try {
      const res = await fetch(`/api/admin/users/${timeModalUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: finalPlan })
      });
      if (!res.ok) throw new Error('Failed to update plan time');
      setUsers(users.map(u => u.id === timeModalUser.id ? { ...u, plan: finalPlan } : u));
      setTimeModalUser(null);
    } catch (err) {
      console.error('Error updating plan time:', err);
      alert('Failed to update plan time.');
    } finally {
      setIsSubmittingTime(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Failed to update role');
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Failed to update role.');
    }
  };

  const handleManageCredits = async (userId: string, currentCredits: number) => {
    const amountStr = prompt(`Enter new credit balance for user (current: ${currentCredits}):`, currentCredits.toString());
    if (amountStr === null) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount < 0) {
      alert('Please enter a valid positive number.');
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credits: amount })
      });
      if (!res.ok) throw new Error('Failed to update credits');
      setUsers(users.map(u => u.id === userId ? { ...u, credits: amount } : u));
    } catch (err) {
      console.error('Error updating credits:', err);
      alert('Failed to update credits.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    confirm({
      title: "Delete User",
      message: "Are you sure you want to permanently delete this user? This cannot be undone.",
      confirmText: "Delete User",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete user');
          setUsers(users.filter(u => u.id !== userId));
        } catch (err) {
          console.error('Error deleting user:', err);
          alert('Failed to delete user.');
        }
      }
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.includes(searchTerm);
    
    const userPlanName = (user.plan || 'Free').split('|')[0];
    const matchesPlan = filterPlan === 'All' || userPlanName.toLowerCase() === filterPlan.toLowerCase();
    
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, email or UID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#6B46C1]/50 focus:ring-1 focus:ring-[#6B46C1]/50 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-[#111] border border-white/10 rounded-xl p-1">
            {['All', 'Free', 'Creator', 'Pro', 'Studio'].map(plan => (
              <button
                key={plan}
                onClick={() => setFilterPlan(plan)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  filterPlan === plan 
                    ? "bg-white/10 text-white" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                {plan}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 bg-[#111] border border-white/10 hover:bg-white/5 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Filter size={16} />
            More Filters
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-400">User</th>
                <th className="px-6 py-4 font-medium text-gray-400">Plan & Credits</th>
                <th className="px-6 py-4 font-medium text-gray-400">Joined</th>
                <th className="px-6 py-4 font-medium text-gray-400">Role</th>
                <th className="px-6 py-4 font-medium text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-[#6B46C1] border-t-transparent animate-spin" />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No users found matching your criteria
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => (
                  <motion.tr 
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name || user.email || 'U'}&background=random`} 
                          alt="" 
                          className="w-10 h-10 rounded-full bg-white/10"
                        />
                        <div>
                          <div className="font-medium text-white">{user.full_name || 'Anonymous User'}</div>
                          <div className="text-xs text-gray-500">{user.email || 'No email provided'}</div>
                          <div className="text-[10px] text-gray-600 font-mono mt-0.5">{user.id.substring(0, 12)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {(() => {
                          const planName = (user.plan || 'Free').split('|')[0];
                          let colorClass = "bg-gray-500/10 text-gray-400";
                          if (planName.toLowerCase() === 'studio') colorClass = "bg-amber-500/10 text-amber-500";
                          else if (planName.toLowerCase() === 'pro') colorClass = "bg-purple-500/10 text-purple-500";
                          else if (planName.toLowerCase() === 'creator') colorClass = "bg-blue-500/10 text-blue-500";
                          return (
                            <span className={cn(
                              "inline-flex items-center w-fit px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider",
                              colorClass
                            )}>
                              {planName}
                            </span>
                          );
                        })()}
                        <span className="text-xs font-mono text-gray-400">{user.credits} credits</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",
                        user.role === 'admin' ? "bg-red-500/10 text-red-500" : "text-gray-400"
                      )}>
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleManageCredits(user.id, user.credits || 0)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors tooltip-trigger" title="Manage Credits">
                          <Zap size={16} />
                        </button>
                        <div className="relative group">
                          <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <MoreVertical size={16} />
                          </button>
                          <div className="absolute right-0 top-full pt-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50">
                            <div className="w-48 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl py-1">
                              <button onClick={() => handleUpdatePlan(user, 'Creator')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"><ArrowUpCircle size={14} /> Set Creator</button>
                              <button onClick={() => handleUpdatePlan(user, 'Pro')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"><ArrowUpCircle size={14} /> Set Pro</button>
                              <button onClick={() => handleUpdatePlan(user, 'Studio')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"><ArrowUpCircle size={14} /> Set Studio</button>
                              <button onClick={() => handleUpdatePlan(user, 'Free')} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"><ArrowDownCircle size={14} /> Set Free</button>
                              <button onClick={() => handleToggleAdmin(user.id, user.role)} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"><Shield size={14} /> Toggle Admin</button>
                              <div className="h-px bg-white/10 my-1 mx-2"></div>
                              <button onClick={() => { setTimeDays("30"); setTimeModalUser(user); }} className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2"><Edit size={14} /> Edit Plan Duration</button>
                              <div className="h-px bg-white/10 my-1 mx-2"></div>
                              <button onClick={() => handleDeleteUser(user.id)} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-white/5 flex items-center gap-2"><Trash2 size={14} /> Delete Account</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
                      </div>
      </div>
      {timeModalUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-2">Edit Plan Duration</h3>
            <p className="text-gray-400 text-sm mb-4">Add or remove days from {timeModalUser.email || 'user'}'s plan.</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">Days to Add (can be negative)</label>
              <input 
                type="number" 
                value={timeDays} 
                onChange={e => setTimeDays(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-white/20"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setTimeModalUser(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTime}
                disabled={isSubmittingTime}
                className="bg-white text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
              >
                {isSubmittingTime ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
