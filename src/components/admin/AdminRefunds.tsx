import React, { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const fetchRefunds = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/refunds');
        if (!res.ok) throw new Error('Failed to fetch refunds');
        const data = await res.json();
        setRefunds(data.refunds || []);
      } catch (err) {
        console.error('Error fetching refunds:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRefunds();
  }, []);

  const filteredRefunds = refunds.filter(r => {
    const q = searchTerm.toLowerCase();
    return (
      (r.profiles?.email || '').toLowerCase().includes(q) ||
      (r.profiles?.full_name || '').toLowerCase().includes(q) ||
      (r.payment_id || '').toLowerCase().includes(q) ||
      (r.refund_id || '').toLowerCase().includes(q) ||
      (r.order_id || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Refund History</h2>
          <p className="text-sm text-gray-400">View all completed refunds across the platform</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, email, payment ID, refund ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#6B46C1]/50 focus:ring-1 focus:ring-[#6B46C1]/50 transition-all"
          />
        </div>
      </div>

      <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-400">Date</th>
                <th className="px-6 py-4 font-medium text-gray-400">Customer</th>
                <th className="px-6 py-4 font-medium text-gray-400">Payment ID</th>
                <th className="px-6 py-4 font-medium text-gray-400">Refund ID</th>
                <th className="px-6 py-4 font-medium text-gray-400">Amount</th>
                <th className="px-6 py-4 font-medium text-gray-400">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-[#6B46C1] border-t-transparent animate-spin" />
                      Loading refunds...
                    </div>
                  </td>
                </tr>
              ) : filteredRefunds.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No refunds found.
                  </td>
                </tr>
              ) : (
                filteredRefunds.map((refund, idx) => (
                  <motion.tr 
                    key={refund.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(refund.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{refund.profiles?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{refund.profiles?.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {refund.payment_id?.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-purple-400">
                      {refund.refund_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {(refund.amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'INR' })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300">{refund.reason || 'Not specified'}</div>
                      {refund.notes && <div className="text-xs text-gray-500 truncate max-w-[200px]">{refund.notes}</div>}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
