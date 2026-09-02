import { useConfirm } from '../../context/ConfirmContext';
import React, { useState, useEffect } from 'react';
import { Plus, Tag, Trash2, Edit2, Percent, DollarSign, Calendar, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, alert } = useConfirm();
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);

  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_amount: '',
    expiry_date: '',
    usage_limit: '',
    min_purchase: '',
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/coupons');
      if (!res.ok) throw new Error('Failed to fetch coupons');
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (err) {
      console.error('Error fetching coupons:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSave = async () => {
    try {
      const payload = {
        code: formData.code.toUpperCase(),
        discount_type: formData.discount_type,
        discount_amount: parseFloat(formData.discount_amount),
        expiry_date: formData.expiry_date || null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        min_purchase: formData.min_purchase ? parseFloat(formData.min_purchase) : 0,
      };

      if (editingCoupon) {
        const res = await fetch(`/api/admin/coupons/${editingCoupon.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const error = !res.ok;
        if (error) throw error;
      } else {
        const res = await fetch('/api/admin/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const error = !res.ok;
        if (error) throw error;
      }

      setShowModal(false);
      setEditingCoupon(null);
      fetchCoupons();
    } catch (err) {
      console.error('Error saving coupon:', err);
      alert('Failed to save coupon.');
    }
  };

  const handleDelete = async (id: string) => {
    confirm({
      title: "Delete Coupon",
      message: "Are you sure you want to delete this coupon? This cannot be undone.",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete coupon');
          setCoupons(coupons.filter(c => c.id !== id));
        } catch (err) {
          console.error('Error deleting coupon:', err);
          alert('Failed to delete coupon.');
        }
      }
    });
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !active }) }); const error = !res.ok;
      if (error) throw error;
      setCoupons(coupons.map(c => c.id === id ? { ...c, active: !active } : c));
    } catch (err) {
      console.error('Error toggling coupon status:', err);
    }
  };

  const openModal = (coupon?: any) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_amount: coupon.discount_amount.toString(),
        expiry_date: coupon.expiry_date ? coupon.expiry_date.substring(0, 16) : '',
        usage_limit: coupon.usage_limit?.toString() || '',
        min_purchase: coupon.min_purchase?.toString() || '',
      });
    } else {
      setEditingCoupon(null);
      setFormData({
        code: '',
        discount_type: 'percentage',
        discount_amount: '',
        expiry_date: '',
        usage_limit: '',
        min_purchase: '',
      });
    }
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Discount Coupons</h2>
          <p className="text-sm text-gray-400">Manage promotional codes and discounts</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-[#6B46C1] hover:bg-[#5536A1] text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-purple-500/20"
        >
          <Plus size={16} />
          Create Coupon
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center text-gray-400 py-10">Loading coupons...</div>
        ) : coupons.length === 0 ? (
           <div className="col-span-full text-center text-gray-500 py-10">No coupons found. Create one to get started.</div>
        ) : coupons.map((coupon, i) => (
          <motion.div
            key={coupon.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "bg-[#111] border rounded-2xl p-5 relative overflow-hidden group transition-colors",
              coupon.active ? "border-white/10 hover:border-[#6B46C1]/50" : "border-white/5 opacity-60"
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-white font-mono font-bold tracking-wider group-hover:bg-white/10 transition-colors">
                <Tag size={14} className="text-[#6B46C1]" />
                {coupon.code}
                <button 
                  onClick={() => navigator.clipboard.writeText(coupon.code)}
                  className="ml-2 text-gray-400 hover:text-white"
                  title="Copy code"
                >
                  <Copy size={12} />
                </button>
              </div>
              <button 
                onClick={() => handleToggleActive(coupon.id, coupon.active)}
                className={cn(
                  "px-2 py-1 rounded text-xs font-bold uppercase tracking-wider",
                  coupon.active ? "bg-emerald-500/10 text-emerald-500" : "bg-gray-500/10 text-gray-500"
                )}
              >
                {coupon.active ? 'Active' : 'Inactive'}
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Discount</span>
                <span className="font-bold text-white text-lg flex items-center gap-1">
                  {coupon.discount_type === 'percentage' ? <Percent size={16} className="text-purple-400"/> : <DollarSign size={16} className="text-green-400"/>}
                  {coupon.discount_amount}{coupon.discount_type === 'percentage' ? '%' : ''}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Usage</span>
                <div className="text-sm">
                  <span className="text-white font-medium">{coupon.usage_count}</span>
                  <span className="text-gray-500"> / {coupon.usage_limit || '∞'}</span>
                </div>
              </div>

              {coupon.expiry_date && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Expires</span>
                  <span className="text-sm text-gray-300 flex items-center gap-1.5">
                    <Calendar size={14} />
                    {new Date(coupon.expiry_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openModal(coupon)} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <Edit2 size={14} /> Edit
              </button>
              <button onClick={() => handleDelete(coupon.id)} className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-6">{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Coupon Code *</label>
                  <input 
                    type="text" 
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-[#6B46C1] transition-colors uppercase"
                    placeholder="e.g. SUMMER2026"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Type *</label>
                    <select 
                      value={formData.discount_type}
                      onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#6B46C1] transition-colors appearance-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Amount *</label>
                    <input 
                      type="number" 
                      value={formData.discount_amount}
                      onChange={(e) => setFormData({...formData, discount_amount: e.target.value})}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#6B46C1] transition-colors"
                      placeholder="e.g. 20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Usage Limit (Optional)</label>
                  <input 
                    type="number" 
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({...formData, usage_limit: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#6B46C1] transition-colors"
                    placeholder="e.g. 100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Expiry Date (Optional)</label>
                  <input 
                    type="datetime-local" 
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#6B46C1] transition-colors"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!formData.code || !formData.discount_amount}
                  className="flex-1 bg-[#6B46C1] hover:bg-[#5536A1] text-white px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Coupon
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
