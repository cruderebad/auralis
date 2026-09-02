import { useConfirm } from '../../context/ConfirmContext';
import React, { useState, useEffect } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, XCircle, Search, Filter, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminPayments() {
  const { alert } = useConfirm();

  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundType, setRefundType] = useState('full');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('User Requested');
  const [refundNotes, setRefundNotes] = useState('');
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/payments');
      if (!res.ok) throw new Error('Failed to fetch payments');
      const data = await res.json();
      const validData = data.payments || [];
      setPayments(validData);
      
      let totalRev = 0, success = 0, pending = 0, failed = 0;
      const revByDate: Record<string, number> = {};
      
      validData.forEach((p: any) => {
        const status = p.status?.toLowerCase() || 'pending';
        if (status === 'paid' || status === 'success') {
          success++;
          const amountInDollars = (p.amount || 0) / 100;
          totalRev += amountInDollars;
          if (p.created_at) {
            const dateStr = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            revByDate[dateStr] = (revByDate[dateStr] || 0) + amountInDollars;
          }
        } else if (status === 'failed' || status === 'declined') {
          failed++;
        } else if (status === 'refunded') {
          // You might want to categorize refunded differently
        } else {
          pending++;
        }
      });
      
      setStats({
        totalRevenue: totalRev,
        successfulPayments: success,
        pendingPayments: pending,
        failedPayments: failed,
      });
      
      const recentDates = Object.keys(revByDate).slice(0, 14).reverse();
      const cData = recentDates.map(date => ({ name: date, revenue: revByDate[date] }));
      setChartData(cData.length === 0 ? [{ name: 'Mon', revenue: 0 }, { name: 'Tue', revenue: 0 }] : cData);
      
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefundSubmit = async () => {
    if (!selectedPayment) return;
    setIsProcessingRefund(true);
    try {
      const payload: any = {
         reason: refundReason,
         notes: refundNotes,
         isPartial: refundType === 'partial'
      };
      if (refundType === 'partial') {
         const amt = parseFloat(refundAmount) * 100; // to paise
         if (isNaN(amt) || amt <= 0 || amt > selectedPayment.amount) {
            throw new Error('Invalid refund amount');
         }
         payload.amount = amt;
      }
      
      const res = await fetch(`/api/admin/payments/${selectedPayment.id}/refund`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refund failed');
      
      alert('Payment refunded successfully');
      setIsRefundModalOpen(false);
      setSelectedPayment(null);
      fetchPayments();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const getStatusBadge = (payment: any) => {
    const status = payment.status?.toLowerCase() || 'pending';
    const refundStatus = payment.refund_status;
    
    if (status === 'refunded' || refundStatus === 'fully_refunded') return { label: 'Refunded', classes: 'bg-blue-500/10 text-blue-500' };
    if (refundStatus === 'partially_refunded') return { label: 'Partial Refund', classes: 'bg-orange-500/10 text-orange-500' };
    if (status === 'paid' || status === 'success') return { label: 'Captured', classes: 'bg-emerald-500/10 text-emerald-500' };
    if (status === 'authorized') return { label: 'Authorized', classes: 'bg-yellow-500/10 text-yellow-500' };
    if (status === 'failed' || status === 'declined') return { label: 'Failed', classes: 'bg-red-500/10 text-red-500' };
    return { label: 'Pending', classes: 'bg-amber-500/10 text-amber-500' };
  };

  const filteredPayments = payments.filter(p => {
    const email = p.profiles?.email || '';
    const name = p.profiles?.full_name || '';
    const refundId = p.refund_id || '';
    const q = searchTerm.toLowerCase();
    
    const matchesSearch = email.toLowerCase().includes(q) || 
                          name.toLowerCase().includes(q) ||
                          p.id.toLowerCase().includes(q) ||
                          refundId.toLowerCase().includes(q);
                          
    let matchesStatus = true;
    if (statusFilter !== 'All') {
      const badge = getStatusBadge(p).label;
      if (statusFilter === 'Captured' && badge !== 'Captured') matchesStatus = false;
      if (statusFilter === 'Refunded' && badge !== 'Refunded') matchesStatus = false;
      if (statusFilter === 'Partial Refund' && badge !== 'Partial Refund') matchesStatus = false;
      if (statusFilter === 'Pending' && badge !== 'Pending') matchesStatus = false;
      if (statusFilter === 'Failed' && badge !== 'Failed') matchesStatus = false;
    }
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Payments</h2>
          <p className="text-sm text-gray-400">Manage transactions, refunds, and revenue</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, email, order ID, payment ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#6B46C1]/50 focus:ring-1 focus:ring-[#6B46C1]/50 transition-all"
          />
        </div>
        
        <div className="flex bg-[#111] border border-white/10 rounded-xl p-1 overflow-x-auto max-w-full">
          {['All', 'Captured', 'Refunded', 'Partial Refund', 'Pending', 'Failed'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
                statusFilter === status 
                  ? "bg-white/10 text-white" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white/5 border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-medium text-gray-400">User</th>
                <th className="px-6 py-4 font-medium text-gray-400">Plan</th>
                <th className="px-6 py-4 font-medium text-gray-400">Amount</th>
                <th className="px-6 py-4 font-medium text-gray-400">Status</th>
                <th className="px-6 py-4 font-medium text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-[#6B46C1] border-t-transparent animate-spin" />
                      Loading payments...
                    </div>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment, idx) => {
                  const badge = getStatusBadge(payment);
                  
                  return (
                    <motion.tr 
                      key={payment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setSelectedPayment(payment)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{payment.profiles?.full_name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{payment.profiles?.email || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 capitalize text-gray-300">
                        {payment.package || 'Custom'}
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        {(payment.amount / 100).toLocaleString('en-US', { style: 'currency', currency: payment.currency || 'USD' })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          badge.classes
                        )}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(payment.created_at).toLocaleString()}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Panel for Payment Details */}
      <AnimatePresence>
        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedPayment(null)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-[#111] border-l border-white/10 h-full overflow-y-auto flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#111]/95 backdrop-blur z-10">
                <h3 className="text-lg font-bold text-white">Payment Details</h3>
                <button onClick={() => setSelectedPayment(null)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-8 flex-1">
                {/* User Info */}
                <section>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">User Information</h4>
                  <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4 space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Name</div>
                      <div className="text-sm font-medium text-white">{selectedPayment.profiles?.full_name || 'Unknown'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Email</div>
                      <div className="text-sm font-medium text-white">{selectedPayment.profiles?.email || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">User ID</div>
                      <div className="text-xs font-mono text-gray-400 truncate">{selectedPayment.user_id}</div>
                    </div>
                  </div>
                </section>

                {/* Purchase Info */}
                <section>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Purchase Information</h4>
                  <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Plan Name</span>
                      <span className="text-sm font-medium text-white capitalize">{selectedPayment.package}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Amount</span>
                      <span className="text-sm font-medium text-white">
                        {(selectedPayment.amount / 100).toLocaleString('en-US', { style: 'currency', currency: selectedPayment.currency || 'USD' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Purchase Time</span>
                      <span className="text-sm text-white">{new Date(selectedPayment.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </section>

                {/* Transaction Info */}
                <section>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Transaction Information</h4>
                  <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4 space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Transaction ID</div>
                      <div className="text-xs font-mono text-gray-400 break-all">{selectedPayment.id || 'N/A'}</div>
                    </div>
                    {selectedPayment.refund_id && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Refund ID</div>
                        <div className="text-xs font-mono text-purple-400 break-all">{selectedPayment.refund_id}</div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Status */}
                <section>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Current Status</h4>
                  <div className="flex gap-2">
                    <span className={cn(
                      "inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider",
                      getStatusBadge(selectedPayment).classes
                    )}>
                      {getStatusBadge(selectedPayment).label}
                    </span>
                  </div>
                </section>

                {/* Refund Section */}
                <section>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Refund Management</h4>
                  
                  {['paid', 'success'].includes(selectedPayment.status?.toLowerCase()) && selectedPayment.refund_status !== 'fully_refunded' ? (
                    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4 flex flex-col items-start gap-4">
                      {selectedPayment.refund_status === 'partially_refunded' && (
                        <div className="w-full p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-xs text-orange-400">
                          This payment has already been partially refunded.
                        </div>
                      )}
                      <button 
                        onClick={() => {
                          setIsRefundModalOpen(true);
                          setRefundType('full');
                          setRefundAmount(((selectedPayment.amount - (selectedPayment.refund_amount || 0)) / 100).toString());
                          setRefundConfirmed(false);
                          setRefundNotes('');
                        }}
                        className="px-4 py-2.5 bg-white text-black hover:bg-gray-200 font-bold rounded-lg text-sm transition-colors w-full"
                      >
                        Refund Payment
                      </button>
                    </div>
                  ) : selectedPayment.refund_status === 'fully_refunded' || selectedPayment.status === 'refunded' ? (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-xs text-blue-400/70">Refund Amount</span>
                        <span className="text-sm font-medium text-blue-400">
                          {((selectedPayment.refund_amount || selectedPayment.amount) / 100).toLocaleString('en-US', { style: 'currency', currency: selectedPayment.currency || 'USD' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-blue-400/70">Refunded On</span>
                        <span className="text-sm text-blue-400">{selectedPayment.refunded_at ? new Date(selectedPayment.refunded_at).toLocaleString() : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-blue-400/70">Reason</span>
                        <span className="text-sm text-blue-400">{selectedPayment.refund_reason || 'N/A'}</span>
                      </div>
                      <button disabled className="w-full py-2.5 bg-white/5 text-gray-500 font-medium rounded-lg text-sm mt-2 cursor-not-allowed">
                        Already Refunded
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
                      <p className="text-sm text-gray-500">Only successful payments can be refunded.</p>
                    </div>
                  )}
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Refund Modal */}
      <AnimatePresence>
        {isRefundModalOpen && selectedPayment && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !isProcessingRefund && setIsRefundModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-white/10">
                <h3 className="text-xl font-bold text-white">Issue Refund</h3>
              </div>
              
              <div className="p-5 space-y-5 overflow-y-auto">
                <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4 text-sm space-y-2">
                  <div className="flex justify-between text-gray-400">
                    <span>Customer</span>
                    <span className="text-white font-medium">{selectedPayment.profiles?.full_name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Email</span>
                    <span className="text-white">{selectedPayment.profiles?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Original Amount</span>
                    <span className="text-white font-medium">
                      {(selectedPayment.amount / 100).toLocaleString('en-US', { style: 'currency', currency: selectedPayment.currency || 'USD' })}
                    </span>
                  </div>
                  {selectedPayment.refund_amount > 0 && (
                    <div className="flex justify-between text-orange-400">
                      <span>Already Refunded</span>
                      <span className="font-medium">
                        {(selectedPayment.refund_amount / 100).toLocaleString('en-US', { style: 'currency', currency: selectedPayment.currency || 'USD' })}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-bold text-white mb-3 block">Refund Type</label>
                  <div className="flex gap-3">
                    <label className={cn(
                      "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all text-sm font-medium",
                      refundType === 'full' ? "bg-[#6B46C1]/20 border-[#6B46C1] text-[#6B46C1]" : "bg-[#1A1A1A] border-white/10 text-gray-400 hover:bg-white/5"
                    )}>
                      <input 
                        type="radio" 
                        name="refundType" 
                        value="full" 
                        checked={refundType === 'full'} 
                        onChange={() => {
                          setRefundType('full');
                          setRefundAmount(((selectedPayment.amount - (selectedPayment.refund_amount || 0)) / 100).toString());
                        }} 
                        className="hidden" 
                      />
                      Full Refund
                    </label>
                    <label className={cn(
                      "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all text-sm font-medium",
                      refundType === 'partial' ? "bg-[#6B46C1]/20 border-[#6B46C1] text-[#6B46C1]" : "bg-[#1A1A1A] border-white/10 text-gray-400 hover:bg-white/5"
                    )}>
                      <input 
                        type="radio" 
                        name="refundType" 
                        value="partial" 
                        checked={refundType === 'partial'} 
                        onChange={() => setRefundType('partial')} 
                        className="hidden" 
                      />
                      Partial Refund
                    </label>
                  </div>
                </div>

                {refundType === 'partial' && (
                  <div>
                    <label className="text-sm font-bold text-white mb-2 block">Refund Amount (₹)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      max={((selectedPayment.amount - (selectedPayment.refund_amount || 0)) / 100)}
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#6B46C1] transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum amount: {((selectedPayment.amount - (selectedPayment.refund_amount || 0)) / 100).toFixed(2)}</p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-bold text-white mb-2 block">Reason</label>
                  <select 
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#6B46C1] transition-colors"
                  >
                    <option value="Duplicate Purchase">Duplicate Purchase</option>
                    <option value="User Requested">User Requested</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Fraud Prevention">Fraud Prevention</option>
                    <option value="Billing Error">Billing Error</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-white mb-2 block">Optional Notes</label>
                  <textarea 
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    placeholder="Internal notes about this refund..."
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#6B46C1] transition-colors resize-none h-24 custom-scrollbar"
                  />
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                  <div>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={refundConfirmed}
                        onChange={(e) => setRefundConfirmed(e.target.checked)}
                        className="mt-1"
                      />
                      <span className="text-sm font-medium text-red-200">
                        I understand this action cannot be undone and funds will be returned to the customer.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="p-5 border-t border-white/10 flex gap-3 bg-[#111]">
                <button 
                  onClick={() => setIsRefundModalOpen(false)}
                  disabled={isProcessingRefund}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRefundSubmit}
                  disabled={!refundConfirmed || isProcessingRefund || (refundType === 'partial' && (!refundAmount || parseFloat(refundAmount) <= 0))}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessingRefund ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Refund'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
