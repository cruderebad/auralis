import { useConfirm } from '../../context/ConfirmContext';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Check, X, Loader2 } from 'lucide-react';

export default function AdminSubscriptions() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Package Form State
  const [pkgId, setPkgId] = useState('');
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('');
  const [price, setPrice] = useState<number | string>(0);
  const [credits, setCredits] = useState<number | string>(0);
  const [color, setColor] = useState('gray');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [isOneTime, setIsOneTime] = useState(false);
  const [allowCoupons, setAllowCoupons] = useState(true);
  const [allowTiers, setAllowTiers] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');

  const [saving, setSaving] = useState(false);
  const { confirm, alert } = useConfirm();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/packages', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPackages(Object.values(data));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg: any) => {
    setPkgId(pkg.id);
    setName(pkg.name);
    setPlan(pkg.plan);
    setPrice(pkg.price);
    setCredits(pkg.credits);
    setColor(pkg.color || 'gray');
    setTagline(pkg.tagline || '');
    setDescription(pkg.description || '');
    setIsOneTime(pkg.is_one_time || false);
    setAllowCoupons(pkg.allow_coupons ?? true);
    setAllowTiers(pkg.allow_tiers ?? false);
    setFeatures(pkg.features || []);
    setEditingId(pkg.id);
    setShowForm(true);
  };

  const handleCreate = () => {
    setPkgId('');
    setName('');
    setPlan('');
    setPrice("");
    setCredits("");
    setColor('gray');
    setTagline('');
    setDescription('');
    setIsOneTime(false);
    setAllowCoupons(true);
    setAllowTiers(false);
    setFeatures([]);
    setEditingId(null);
    setShowForm(true);
  };

  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setFeatures([...features, featureInput.trim()]);
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgId.trim()) return alert("Package ID is required", "Error");
    
    setSaving(true);
    try {
      // get current packages map
      const pkgsObj: any = {};
      packages.forEach(p => pkgsObj[p.id] = p);
      
      pkgsObj[pkgId] = {
        id: pkgId,
        name,
        plan,
        price: Number(price),
        credits: Number(credits),
        color,
        tagline,
        description,
        is_one_time: isOneTime,
        allow_coupons: allowCoupons,
        allow_tiers: allowTiers,
        features
      };

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pkgsObj)
      });
      
      if (res.ok) {
        setShowForm(false);
        fetchPackages();
      } else {
        const errText = await res.text();
        alert("Failed to save package: " + errText, "Error");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    confirm({
      title: "Delete Package",
      message: "Are you sure you want to delete this package?",
      confirmText: "Delete",
      onConfirm: async () => {
        try {
          const pkgsObj: any = {};
          packages.forEach(p => {
            if (p.id !== id) pkgsObj[p.id] = p;
          });
          
          const session = await supabase.auth.getSession();
          const token = session.data.session?.access_token;
          await fetch('/api/packages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(pkgsObj)
          });
          
          fetchPackages();
        } catch (e) {
          alert("Error deleting package", "Error");
        }
      }
    });
    // the rest of the old function will be ignored since we return
    try {
      const pkgsObj: any = {};
      packages.forEach(p => {
        if (p.id !== id) pkgsObj[p.id] = p;
      });
      
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      await fetch('/api/packages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pkgsObj)
      });
      
      fetchPackages();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#6B46C1]" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Subscriptions</h2>
          <p className="text-gray-400 text-sm mt-1">Manage plans, credits, and package tiers.</p>
        </div>
        {!showForm && (
          <button 
            onClick={handleCreate}
            className="flex items-center gap-2 bg-[#6B46C1] hover:bg-[#5b3aa8] text-white px-4 py-2 rounded-xl transition-colors text-sm font-medium"
          >
            <Plus size={16} /> Add Package
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">{editingId ? 'Edit Package' : 'Create Package'}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Package ID (e.g. launch)</label>
                <input type="text" required disabled={!!editingId} value={pkgId} onChange={e => setPkgId(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#6B46C1] disabled:opacity-50" placeholder="e.g. basic, pro, launch" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Display Name</label>
                <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#6B46C1]" placeholder="e.g. Pro Plan" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Plan Name (For Auth/DB matching)</label>
                <input type="text" required value={plan} onChange={e => setPlan(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#6B46C1]" placeholder="e.g. Pro, Special Offer" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Price (in Paise, ₹1 = 100)</label>
                <input type="number" required value={price} onChange={e => setPrice(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#6B46C1]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Credits</label>
                <input type="number" required value={credits} onChange={e => setCredits(e.target.value === "" ? "" : Number(e.target.value))} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#6B46C1]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Banner Color (Presets)</label>
                <select value={color} onChange={e => setColor(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#6B46C1]">
                  <option value="gray">Gray (Standard)</option>
                  <option value="emerald">Emerald (Green)</option>
                  <option value="yellow">Yellow (Gold)</option>
                  <option value="purple">Purple</option>
                  <option value="blue">Blue</option>
                  <option value="red">Red</option>
                  <option value="orange">Orange</option>
                  <option value="indigo">Indigo</option>
                  <option value="pink">Pink</option>
                  <option value="teal">Teal</option>
                  <option value="cyan">Cyan</option>
                </select>
              </div>
                            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Tagline (Badge Text)</label>
                <input type="text" value={tagline} onChange={e => setTagline(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#6B46C1]" placeholder="e.g. Black Friday Offer" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#6B46C1]" placeholder="e.g. For serious professionals." />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="isOneTime" checked={isOneTime} onChange={e => setIsOneTime(e.target.checked)} className="w-4 h-4 rounded bg-[#1A1A1A] border-white/10 text-[#6B46C1] focus:ring-[#6B46C1] focus:ring-offset-0" />
                <label htmlFor="isOneTime" className="text-sm font-medium text-gray-400 cursor-pointer">One-Time Offer (Disappears after purchase)</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="allowCoupons" checked={allowCoupons} onChange={e => setAllowCoupons(e.target.checked)} className="w-4 h-4 rounded bg-[#1A1A1A] border-white/10 text-[#6B46C1] focus:ring-[#6B46C1] focus:ring-offset-0" />
                <label htmlFor="allowCoupons" className="text-sm font-medium text-gray-400 cursor-pointer">Allow Coupons to be Applied</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="allowTiers" checked={allowTiers} onChange={e => setAllowTiers(e.target.checked)} className="w-4 h-4 rounded bg-[#1A1A1A] border-white/10 text-[#6B46C1] focus:ring-[#6B46C1] focus:ring-offset-0" />
                <label htmlFor="allowTiers" className="text-sm font-medium text-gray-400 cursor-pointer">Allow Credit Tiers (600, 1200, 2300)</label>
              </div>

            </div>

            <div className="pt-4 border-t border-white/5">
              <label className="block text-sm font-medium text-gray-400 mb-3">Included Features (Checkmarks)</label>

              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2">Quick Feature Presets</p>
                <div className="flex flex-wrap gap-2">
                  {['4K Export', '60 FPS Export', 'Brand Kit Access', 'No Watermark'].map(preset => (
                    <button type="button" key={preset} onClick={() => { if (!features.includes(preset)) setFeatures([...features, preset]); }} className="text-xs bg-[#222] border border-white/10 px-2 py-1 rounded-md hover:bg-white/10 text-gray-300">
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                <input type="text" value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }} className="flex-1 bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#6B46C1]" placeholder="Add a feature (e.g. 'Unlimited exports')" />
                <button type="button" onClick={handleAddFeature} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">Add</button>
              </div>
              <ul className="space-y-2">
                {features.map((feat, i) => (
                  <li key={i} className="flex items-center justify-between bg-[#1A1A1A] px-4 py-2 rounded-lg border border-white/5">
                    <span className="text-sm text-gray-300 flex items-center gap-2"><Check size={14} className="text-[#6B46C1]" /> {feat}</span>
                    <button type="button" onClick={() => handleRemoveFeature(i)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                  </li>
                ))}
                {features.length === 0 && <p className="text-sm text-gray-500">No features added yet.</p>}
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
              <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="bg-[#6B46C1] hover:bg-[#5b3aa8] disabled:opacity-50 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Package'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.length === 0 && <p className="text-gray-500 text-sm col-span-full">No packages found.</p>}
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-[#111] rounded-2xl border border-white/10 p-6 flex flex-col relative overflow-hidden group hover:border-[#6B46C1]/50 transition-colors">
              {pkg.tagline && (
                <div className="absolute top-0 right-0 bg-[#6B46C1] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  {pkg.tagline}
                </div>
              )}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                  <p className="text-xs text-gray-400">ID: {pkg.id}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(pkg)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(pkg.id)} className="p-1.5 bg-white/5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              <div className="text-2xl font-extrabold text-white mb-1">
                ₹{pkg.price / 100}
              </div>
              <p className="text-sm text-gray-400 mb-4">{pkg.credits} Credits {pkg.is_one_time && <span className="text-[#6B46C1] font-medium">(One-Time)</span>}</p>

              <div className="space-y-2 mt-auto">
                <p className="text-xs text-gray-500 mb-2 uppercase font-bold tracking-wider">Features</p>
                {pkg.features?.slice(0, 3).map((feat: string, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check size={14} className="text-[#6B46C1] shrink-0" />
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
                {pkg.features?.length > 3 && (
                  <p className="text-xs text-gray-500">+{pkg.features.length - 3} more features</p>
                )}
                {(!pkg.features || pkg.features.length === 0) && (
                  <p className="text-xs text-gray-600">No features listed.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
