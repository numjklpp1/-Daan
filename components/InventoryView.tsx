
import React, { useState, useMemo } from 'react';
import { InventoryItem } from '../types';
import { Icons } from '../constants';

interface Props {
  subView: 'cabinet' | 'door';
  inventory: InventoryItem[];
  searchTerm: string;
  onSearch: (s: string) => void;
  onUpdateStock: (id: string, delta: number) => void;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
}

export const InventoryView: React.FC<Props> = ({ 
  subView,
  inventory, 
  searchTerm, 
  onSearch, 
  onUpdateStock,
  onAddItem,
  onUpdateItem,
  onDeleteItem
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Modal 表單狀態
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '理想櫃',
    attribute: '' as any,
    unit: '個',
    h: 0,
    w: 0,
    d: 0,
    weight: 0,
    quantity: 0
  });

  const filtered = useMemo(() => {
    return inventory.filter(i => {
      const matchSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          i.sku.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (subView === 'cabinet') return ['理想櫃', '牆櫃', '其他鐵櫃'].includes(i.category);
      if (subView === 'door') return i.category === '門框' || i.category === '門';
      return false;
    });
  }, [inventory, searchTerm, subView]);

  const idealItems = useMemo(() => filtered.filter(i => i.category === '理想櫃'), [filtered]);
  const wallItems = useMemo(() => filtered.filter(i => i.category === '牆櫃'), [filtered]);
  const otherItems = useMemo(() => filtered.filter(i => i.category === '其他鐵櫃'), [filtered]);
  const doorItems = useMemo(() => filtered.filter(i => i.category === '門框' || i.category === '門'), [filtered]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      sku: '',
      category: subView === 'door' ? '門' : '理想櫃',
      attribute: '',
      unit: '個',
      h: 0,
      w: 0,
      d: 0,
      weight: 0,
      quantity: 0
    });
    setModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      sku: item.sku,
      category: item.category,
      attribute: item.attribute || '',
      unit: item.unit,
      h: item.dimensions.h,
      w: item.dimensions.w,
      d: item.dimensions.d,
      weight: item.weight,
      quantity: item.quantity
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    const itemData = {
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      attribute: formData.attribute || undefined,
      unit: formData.unit,
      dimensions: {
        h: formData.h,
        w: formData.w,
        d: formData.d
      },
      weight: formData.weight,
      quantity: formData.quantity,
      volume: (formData.h * formData.w * formData.d) / 1000000000 // 假設單位是 mm 轉為 m3
    };

    if (editingItem) {
      onUpdateItem({ ...itemData, id: editingItem.id });
    } else {
      onAddItem(itemData);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (editingItem && window.confirm('確定要刪除此貨品嗎？')) {
      onDeleteItem(editingItem.id);
      setModalOpen(false);
    }
  };

  const InventoryTable = ({ items, title }: { items: InventoryItem[], title?: string }) => (
    <div className="bg-slate-900 rounded-[32px] border border-slate-800 overflow-hidden shadow-2xl flex flex-col h-full">
      {title && (
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/20 flex items-center justify-between">
          <h4 className="text-sm font-black text-white uppercase tracking-widest">{title}</h4>
          <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded-full font-black">{items.length}</span>
        </div>
      )}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="divide-y divide-slate-800/50">
          {items.map(item => (
            <div key={item.id} className="px-4 py-3 hover:bg-slate-800/30 transition-colors group flex items-center gap-3">
              {/* Left: Name and Attribute */}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-white text-[13px] truncate">{item.name}</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter truncate">{item.sku}</p>
                </div>
                {item.attribute && (
                  <span className={`flex-shrink-0 text-[8px] px-1 py-0.5 rounded font-black uppercase tracking-widest ${
                    item.attribute === '抽屜' ? 'bg-amber-500/20 text-amber-500' : 'bg-purple-500/20 text-purple-500'
                  }`}>
                    {item.attribute}
                  </span>
                )}
              </div>

              {/* Middle: Quantity Input (Right of Name) */}
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={item.quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    onUpdateItem({ ...item, quantity: Math.max(0, val) });
                  }}
                  className="w-10 bg-slate-950 border border-slate-800 rounded-lg text-center text-[13px] font-black text-white outline-none focus:border-blue-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-8 shadow-inner"
                />
              </div>

              {/* Right: Stepper (Vertical) and Settings */}
              <div className="flex items-center gap-2">
                {/* Vertical Stepper Buttons */}
                <div className="flex flex-col bg-slate-950 border border-slate-800 rounded-lg overflow-hidden w-8 h-8 shadow-inner">
                  <button 
                    onClick={() => onUpdateStock(item.id, 1)}
                    className="flex-1 flex items-center justify-center hover:bg-slate-800 text-slate-500 hover:text-blue-400 transition-colors border-b border-slate-800 active:bg-slate-700"
                  >
                    <Icons.ChevronDown className="w-2.5 h-2.5 rotate-180" />
                  </button>
                  <button 
                    onClick={() => onUpdateStock(item.id, -1)}
                    className="flex-1 flex items-center justify-center hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors active:bg-slate-700"
                  >
                    <Icons.ChevronDown className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Settings Button */}
                <button 
                  onClick={() => openEditModal(item)}
                  className="h-8 w-8 flex items-center justify-center bg-slate-800 border border-slate-700 text-slate-400 rounded-lg hover:text-blue-400 hover:border-blue-400/50 transition-all shadow-sm active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="py-12 text-center opacity-30">
               <p className="text-sm font-black uppercase tracking-widest">無庫存紀錄</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in h-full flex flex-col">
      <div className="flex items-center gap-4">
        <div className="bg-slate-900 p-4 rounded-[28px] border border-slate-800 flex items-center gap-4 shadow-xl flex-1">
          <div className="bg-slate-950 flex-1 flex items-center px-4 py-3 rounded-2xl border border-slate-800 focus-within:border-blue-500/50 transition-all">
            <Icons.Search />
            <input 
              type="text" 
              placeholder={`搜尋 SKU 或 貨品名稱...`} 
              className="bg-transparent border-none outline-none flex-1 ml-3 text-sm font-medium text-white"
              value={searchTerm}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
        <button 
          onClick={openAddModal}
          className="w-16 h-16 bg-blue-600 rounded-[28px] flex items-center justify-center text-white shadow-xl hover:bg-blue-500 transition-all active:scale-95"
        >
          <Icons.Plus />
        </button>
      </div>
      
      {subView === 'cabinet' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto pr-1 scrollbar-hide">
            <InventoryTable items={idealItems} title="理想櫃" />
          </div>
          <div className="overflow-y-auto pr-1 scrollbar-hide">
            <InventoryTable items={wallItems} title="牆櫃" />
          </div>
          <div className="overflow-y-auto pr-1 scrollbar-hide">
            <InventoryTable items={otherItems} title="其他鐵櫃" />
          </div>
        </div>
      ) : subView === 'door' ? (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-hide">
          <InventoryTable items={doorItems} title="門框" />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-hide">
          <InventoryTable items={filtered} />
        </div>
      )}

      {/* 新增/編輯 Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] scrollbar-hide">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-white">{editingItem ? '編輯貨品設定' : '新增庫存貨品'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">類別</label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {['理想櫃', '牆櫃', '其他鐵櫃', '門框'].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setFormData({...formData, category: cat})}
                        className={`py-2 rounded-xl font-black text-[10px] transition-all flex items-center justify-center gap-2 ${formData.category === cat ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">屬性</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['', '抽屜', '加框'].map(attr => (
                      <button 
                        key={attr}
                        onClick={() => setFormData({...formData, attribute: attr as any})}
                        className={`py-2 rounded-xl font-black text-[10px] transition-all flex items-center justify-center gap-2 ${formData.attribute === attr ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}
                      >
                        {attr || '無屬性'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">貨品名稱</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">SKU 編碼</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-mono text-sm focus:ring-2 focus:ring-blue-600 outline-none uppercase"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">庫存數量</label>
                  <input 
                    type="number" 
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-white font-black focus:ring-2 focus:ring-blue-600 outline-none"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="p-6 bg-slate-950 border border-slate-800 rounded-[32px] space-y-4">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest text-center border-b border-slate-800 pb-3">尺寸設定 (長 / 寬 / 高)</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-slate-600 uppercase mb-1 block">深度 (長)</label>
                    <input 
                      type="number" 
                      placeholder="D"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-center font-bold outline-none focus:border-blue-500"
                      value={formData.d}
                      onChange={(e) => setFormData({...formData, d: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-600 uppercase mb-1 block">寬度 (W)</label>
                    <input 
                      type="number" 
                      placeholder="W"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-center font-bold outline-none focus:border-blue-500"
                      value={formData.w}
                      onChange={(e) => setFormData({...formData, w: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-600 uppercase mb-1 block">高度 (H)</label>
                    <input 
                      type="number" 
                      placeholder="H"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-center font-bold outline-none focus:border-blue-500"
                      value={formData.h}
                      onChange={(e) => setFormData({...formData, h: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                {editingItem && (
                  <button 
                    onClick={handleDelete}
                    className="px-6 py-4 bg-rose-600/10 text-rose-500 border border-rose-600/20 rounded-2xl font-black text-sm uppercase hover:bg-rose-600 hover:text-white transition-all flex items-center gap-2"
                  >
                    <Icons.Trash /> 刪除貨品
                  </button>
                )}
                <div className="flex-1 flex gap-4">
                  <button 
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-sm uppercase hover:bg-slate-700 transition-all"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleSave}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95"
                  >
                    儲存設定
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
