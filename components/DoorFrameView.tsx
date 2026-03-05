
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DoorFrame, PartsSection, DoorFrameSection, InventoryItem } from '../types';
import { Icons } from '../constants';

const ScrollableText = ({ text, className }: { text: string; className?: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);
    return () => {
      window.removeEventListener('resize', checkOverflow);
      clearTimeout(timer);
    };
  }, [text]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isOverflowing || !containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
    containerRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-x-auto scrollbar-hide ${className} ${isOverflowing ? 'cursor-grab active:cursor-grabbing' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div 
        ref={textRef}
        className="whitespace-nowrap inline-block"
      >
        {text}
      </div>
    </div>
  );
};

interface Props {
  subView: PartsSection;
  doorFrames: DoorFrame[];
  inventory: InventoryItem[];
  onAdd: (frame: Omit<DoorFrame, 'id' | 'section'>) => void;
  onUpdate: (frame: DoorFrame) => void;
  onDelete: (id: string) => void;
  onQuickUpdate: (id: string, delta: number) => void;
  onMovePart: (id: string, qty: number) => void;
  onInventoryPut: (frame: DoorFrame, qty: number) => void;
}

const DRAWER_CONFIGS: Record<string, string> = {
  'UD2': 'udL:2',
  '(AD)UD2': '(ad)udL:2',
  'UD2(AD)': 'ud(ad)L:2',
  'UD3': 'udL:3',
  '(AD)UD3': '(ad)udL:3',
  'UD3(AD)': 'ud(ad)L:3',
  '138': 'udL:4',
  '(AD)138': '(ad)udL:4',
  '138(AD)': 'ud(ad)L:4',
  'UC2(70.5)': 'udL:1 udC:1',
  'UC2': 'udL:1 udC:1',
  'UC3': 'udL:2 udP:1',
  'UP2': 'udC:2',
  'UP3': 'udC:3',
  'UD3A': 'udL:1 udS:2',
  'UD4': 'udL:2 udS:2',
  'UD4A': 'udM:4',
  'UD4B': 'udS:4',
  'UD6': 'udS:6',
  'UD2 F把': 'udF:2',
  'UD3 F把': 'udF:3',
  'AD2': 'adL:2',
  'AD3': 'adL:3',
  'AC2(70.5)': 'adL:1 adC:1',
  'AC2': 'adL:1 adC:1',
  'AC3': 'adL:2 adC:1',
  'AD3A': 'adL:1 adS:2',
  'AD4': 'adL:2 adS:2',
  'AD4B': 'adS:4',
  'AD6': 'adS:6',
  'CB2': 'cbL:2',
  'CB3': 'cbL:3',
  'CB4': 'cbL:4',
  'CT2': 'ctL:2',
  'CT3': 'ctL:3',
  'CT4': 'ctL:4',
  'CB2(2S1L)': 'cbL:1 cbS:2',
  'CB2(4S)': 'cbS:4',
  'CB3(2S12L)': 'cbL:2 cbS:2',
  'CB3(4S1L)': 'cbL:1 cbS:4',
  'CB3(6S)': 'cbS:6',
  'CB4(2S3L)': 'cbL:3 cbS:2',
  'CB4(4S2L)': 'cbL:2 cbS:4',
  'CB4(6S1L)': 'cbL:1 cbS:6',
  'CB4(8S)': 'cbS:8',
};

const PartCard = ({ frame, section, onTransferClick, onPutClick, onUpdate, onUpdateNote, onUpdateFormula, onDelete, onOpenDateSelector }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const total = frame.quantity;

  const calculateTotal = (formula: string) => {
    const matches = formula.match(/[+-]?\d+/g);
    if (!matches) return 0;
    return matches.reduce((acc: number, curr: string) => acc + parseInt(curr), 0);
  };

  const isStock = section === 'stock';

  const getDrawerInfo = (name: string, multiplier: number) => {
    let baseConfig = '';
    if (DRAWER_CONFIGS[name]) {
      baseConfig = DRAWER_CONFIGS[name];
    } else {
      const key = Object.keys(DRAWER_CONFIGS).find(k => name.includes(k));
      baseConfig = key ? DRAWER_CONFIGS[key] : '';
    }

    if (!baseConfig) return null;

    // Multiply the numbers in the config
    return baseConfig.replace(/(\d+)/g, (match) => (parseInt(match) * multiplier).toString());
  };

  const drawerInfo = frame.category === 'drawer' ? getDrawerInfo(frame.name, total) : null;

  const canRotate = [
    'UD2', '(AD)UD2', 'UD2(AD)',
    'UD3', '(AD)UD3', 'UD3(AD)',
    '138', '(AD)138', '138(AD)'
  ].includes(frame.name);

  const handleRotateName = () => {
    const baseNames = ['UD2', 'UD3', '138'];
    const currentName = frame.name;
    const base = baseNames.find(b => [b, `(AD)${b}`, `${b}(AD)`].includes(currentName));
    if (!base) return;

    const variations = [base, `(AD)${base}`, `${base}(AD)`];
    const currentIndex = variations.indexOf(currentName);
    const nextIndex = (currentIndex + 1) % variations.length;
    const nextName = variations[nextIndex];

    onUpdate({ ...frame, name: nextName });
  };

  return (
    <div className="p-3 border-2 rounded-2xl shadow-sm flex flex-col gap-2 group transition-all bg-slate-950 border-slate-800 hover:border-slate-700">
      <div className="flex justify-between items-center px-1 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1 rounded-lg hover:bg-slate-800 transition-all ${isExpanded ? 'text-blue-400' : 'text-slate-600'}`}
          >
            <Icons.ChevronDown className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex flex-col min-w-0 flex-1">
            <ScrollableText text={frame.name} className="text-[13px] font-black text-white" />
            {frame.createdAt && <span className="text-[9px] text-slate-500 font-bold">{frame.createdAt}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-900 border border-slate-800 h-[26px] min-w-[26px] px-1.5 flex items-center justify-center rounded-lg shadow-inner">
            <span className="text-[13px] font-black text-white leading-none">{total}</span>
          </div>

          <div className="flex gap-1.5">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`h-[26px] w-[26px] flex items-center justify-center rounded-lg border transition-all ${
                frame.note 
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icons.Orders className="w-3 h-3" />
            </button>
            <button 
              onClick={() => onOpenDateSelector(frame)}
              className={`h-[26px] w-[26px] flex items-center justify-center rounded-lg border transition-all ${
                frame.targetDate 
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icons.Calendar className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 pt-3 border-t border-slate-800/50">
              {drawerInfo && (
                <div className="px-1">
                  <p className="text-[8px] text-slate-500 font-black mb-1 ml-1 uppercase tracking-widest">抽屜組成數量</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-blue-600/10 border border-blue-500/30 rounded-xl px-3 py-2 flex items-center gap-2">
                      <span className="text-xs font-black text-blue-400 tracking-wider">{drawerInfo}</span>
                    </div>
                    {canRotate && (
                      <button 
                        onClick={handleRotateName}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all shadow-lg shadow-emerald-600/10 active:scale-90"
                      >
                        <Icons.Refresh className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="px-1 flex items-end gap-2">
                <div className="flex-1">
                  <p className="text-[8px] text-slate-500 font-black mb-1 ml-1 uppercase tracking-widest">備註內容</p>
                  <input 
                    type="text"
                    placeholder="輸入備註..."
                    value={frame.note || ''}
                    onChange={(e) => onUpdateNote(frame.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300 font-bold focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-700"
                  />
                </div>
                <div className="flex gap-1.5">
                  {!isStock ? (
                    <button 
                      onClick={() => onTransferClick(frame.id, total)} 
                      className="px-4 py-2 bg-blue-600 text-white text-[11px] font-black rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                    >
                      轉移
                    </button>
                  ) : (
                    <button 
                      onClick={() => onPutClick(frame, total)} 
                      className="px-4 py-2 bg-emerald-600 text-white text-[11px] font-black rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                      確認
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[8px] text-slate-500 font-black mb-1 ml-1 uppercase tracking-widest">數量計算</p>
                  <input 
                    type="text"
                    value={frame.formula || frame.quantity || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9+-]/g, '');
                      const newTotal = calculateTotal(val);
                      onUpdateFormula(frame.id, val, newTotal);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-blue-400 font-black focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button 
                  onClick={() => {
                    if (isConfirmingDelete) {
                      onDelete(frame.id);
                    } else {
                      setIsConfirmingDelete(true);
                      setTimeout(() => setIsConfirmingDelete(false), 3000);
                    }
                  }}
                  className={`self-end p-2.5 border rounded-xl transition-all ${
                    isConfirmingDelete 
                      ? 'bg-rose-600 text-white border-rose-500 animate-pulse' 
                      : 'bg-rose-600/10 text-rose-500 border-rose-600/20 hover:bg-rose-600 hover:text-white'
                  }`}
                >
                  {isConfirmingDelete ? <span className="text-[10px] font-black px-1">確認?</span> : <Icons.Trash />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const DoorFrameView: React.FC<Props> = ({ subView, doorFrames, inventory, onAdd, onUpdate, onDelete, onQuickUpdate, onMovePart, onInventoryPut }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  
  const [editingFrame, setEditingFrame] = useState<DoorFrame | null>(null);
  const [targetTransferItem, setTargetTransferItem] = useState<DoorFrame | null>(null);
  const [targetDateItem, setTargetDateItem] = useState<DoorFrame | null>(null);
  const [tempDate, setTempDate] = useState('');
  const [transferInputQty, setTransferInputQty] = useState('0');
  const [maxTransferQty, setMaxTransferQty] = useState(0);

  const [invSearchTerm, setInvSearchTerm] = useState('');
  const [selectedInvItem, setSelectedInvItem] = useState<InventoryItem | null>(null);
  const [addQty, setAddQty] = useState('1');

  // 標籤邏輯
  const getProductLabel = (name: string) => {
    const drawerItems = [
      '138(F把)', '138', 'UC2(70.5)', 'UC2', 'UC3', 'UD2(70.5)',
      'UD2(F把)', 'UD2', 'UD3(F把)', 'UD3', 'UD3A', 'UD3A(70.5)',
      'UD4', 'UD4A', 'UD4B', 'UD6', 'UP2', 'UP3', 'AC2(70.5)', 'AC2', 'AC3', 'AD2(70.5)', 'AD2', 'AD3', 'AD3A', 'AD3A(70.5)', 'AD4', 'AD4B', 'AD6', 'CB2(70.5)', 'CB2', 'CB3', 'CB4', 'CT2(70.5)', 'CT2',
      'CT3', 'CT4'
    ];
    const framedItems = [
      'UG2A', 'UG3A', 'AK2B', 'AK2U', 'AK3B', 'AK3U', 'DU118G',
      'DU88G', 'KG118', 'KG88', '4M106G', '4M74G'
    ];

    if (drawerItems.some(item => name.includes(item))) return '抽屜';
    if (framedItems.some(item => name.includes(item))) return '加框';
    return null;
  };

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'door' as DoorFrame['category'],
    material: '鋁製' as DoorFrame['material'],
    direction: '左開' as DoorFrame['direction'],
    color: '極簡白',
    quantity: 0,
    h: 2100,
    w: 900,
    d: 100
  });

  const currentCategory = subView.startsWith('door') ? 'door' : 'drawer';

  const sections = useMemo(() => {
    const allSections = [
      { key: 'prep' as DoorFrameSection, label: '1. 預備組', color: 'bg-slate-500' },
      { 
        key: 'done' as DoorFrameSection, 
        label: currentCategory === 'door' ? '2. 門框製作' : '2. 抽屜製作', 
        color: 'bg-amber-500' 
      },
      { 
        key: 'stock' as DoorFrameSection, 
        label: currentCategory === 'door' ? '3. 門框成品' : '3. 抽屜成品', 
        color: 'bg-emerald-500' 
      },
    ];

    if (subView.endsWith('-all')) return allSections;
    if (subView.endsWith('-prep')) return allSections.filter(s => s.key === 'prep');
    if (subView.endsWith('-done')) return allSections.filter(s => s.key === 'done');
    if (subView.endsWith('-stock')) return allSections.filter(s => s.key === 'stock');
    
    return allSections;
  }, [subView, currentCategory]);

  const filtered = useMemo(() => {
    return doorFrames.filter(f => f.category === currentCategory);
  }, [doorFrames, currentCategory]);

  const filteredInventory = useMemo(() => {
    const drawerItems = [
      '138(F把)', '138', 'UC2(70.5)', 'UC2', 'UC3', 'UD2(70.5)',
      'UD2(F把)', 'UD2', 'UD3(F把)', 'UD3', 'UD3A', 'UD3A(70.5)',
      'UD4', 'UD4A', 'UD4B', 'UD6', 'UP2', 'UP3', 'AC2(70.5)', 'AC2', 'AC3', 'AD2(70.5)', 'AD2', 'AD3', 'AD3A', 'AD3A(70.5)', 'AD4', 'AD4B', 'AD6', 'CB2(70.5)', 'CB2', 'CB3', 'CB4', 'CT2(70.5)', 'CT2',
      'CT3', 'CT4'
    ];
    const framedItems = [
      'UG2A', 'UG3A', 'AK2B', 'AK2U', 'AK3B', 'AK3U', 'DU118G',
      'DU88G', 'KG118', 'KG88', '4M106G', '4M74G'
    ];

    return inventory.filter(i => {
      const matchSearch = i.name.toLowerCase().includes(invSearchTerm.toLowerCase()) || 
                          i.sku.toLowerCase().includes(invSearchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (currentCategory === 'drawer') {
        return drawerItems.some(item => i.name.includes(item));
      } else {
        // door view
        const isDoorRelated = i.category === '門框' || i.category === '門' || i.name.includes('門') || i.name.includes('框');
        return isDoorRelated;
      }
    });
  }, [inventory, invSearchTerm, currentCategory]);

  const openEdit = (frame: DoorFrame) => {
    setEditingFrame(frame);
    setFormData({
      sku: frame.sku,
      name: frame.name,
      category: frame.category,
      material: frame.material,
      direction: frame.direction,
      color: frame.color,
      quantity: frame.quantity,
      h: frame.dimensions.h,
      w: frame.dimensions.w,
      d: frame.dimensions.d
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    const data = {
      sku: formData.sku,
      name: formData.name,
      category: formData.category,
      material: formData.material,
      direction: formData.direction,
      color: formData.color,
      quantity: formData.quantity,
      formula: formData.quantity.toString(),
      dimensions: { h: formData.h, w: formData.w, d: formData.d }
    };

    if (editingFrame) {
      onUpdate({ ...data, id: editingFrame.id, section: editingFrame.section, note: editingFrame.note, formula: editingFrame.formula, isPreparing: editingFrame.isPreparing, createdAt: editingFrame.createdAt, targetDate: editingFrame.targetDate });
    } else {
      onAdd({ ...data, createdAt: new Date().toISOString().split('T')[0] });
    }
    setModalOpen(false);
  };

  const handleTransferClick = (id: string, currentTotal: number) => {
    const frame = doorFrames.find(f => f.id === id);
    if (!frame) return;
    setTargetTransferItem(frame);
    setMaxTransferQty(currentTotal);
    setTransferInputQty(currentTotal.toString());
    setTransferModalOpen(true);
  };

  const handleConfirmTransfer = () => {
    if (!targetTransferItem) return;
    const qty = parseInt(transferInputQty) || 0;
    onMovePart(targetTransferItem.id, qty);
    setTransferModalOpen(false);
    setTargetTransferItem(null);
  };

  const handleOpenDateSelector = (frame: DoorFrame) => {
    setTargetDateItem(frame);
    setTempDate(frame.targetDate || new Date().toISOString().split('T')[0]);
    setDateModalOpen(true);
  };

  const handleConfirmDate = () => {
    if (!targetDateItem) return;
    onUpdate({ ...targetDateItem, targetDate: tempDate });
    setDateModalOpen(false);
    setTargetDateItem(null);
  };

  const handleInventoryAdd = () => {
    if (!selectedInvItem) return;
    onAdd({
      sku: selectedInvItem.sku,
      name: selectedInvItem.name,
      category: currentCategory,
      material: '鋁製',
      direction: '左開',
      color: '預設色',
      quantity: parseInt(addQty) || 0,
      formula: (parseInt(addQty) || 0).toString(),
      dimensions: selectedInvItem.dimensions
    });
    setInventoryModalOpen(false);
    setSelectedInvItem(null);
    setAddQty('1');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className={`grid grid-cols-1 ${subView === 'all' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-4`}>
      {sections.map(sec => {
        const sectionParts = filtered.filter(f => f.section === sec.key);

        return (
          <div key={sec.key} className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-4 flex flex-col overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${sec.color} shadow-lg shadow-${sec.color.split('-')[1]}-500/40`}></div>
                {sec.label}
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded uppercase font-black tracking-widest">
                  {sectionParts.length}
                </span>
              </h3>
              {sec.key === 'prep' && (
                <button 
                  onClick={() => setInventoryModalOpen(true)}
                  className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg active:scale-95 border border-slate-700"
                >
                  <Icons.Plus />
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-hide pb-6">
                {sectionParts.map(frame => (
                  <PartCard 
                    key={frame.id} 
                    frame={frame} 
                    section={sec.key}
                    onTransferClick={handleTransferClick}
                    onPutClick={onInventoryPut}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    onUpdateNote={(id: string, note: string) => {
                      const f = doorFrames.find(x => x.id === id);
                      if (f) onUpdate({ ...f, note });
                    }}
                    onUpdateFormula={(id: string, formula: string, quantity: number) => {
                      const f = doorFrames.find(x => x.id === id);
                      if (f) onUpdate({ ...f, formula, quantity });
                    }}
                    onOpenDateSelector={handleOpenDateSelector}
                  />
                ))}
                {sectionParts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 opacity-20 border-2 border-dashed border-slate-800 rounded-[24px]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-center">目前無待處理零件</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 庫存選取 Modal */}
      {inventoryModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-white">
                {!selectedInvItem ? '從庫存新增製作需求' : '確認製作數量'}
              </h3>
              <button onClick={() => { setInventoryModalOpen(false); setSelectedInvItem(null); }} className="text-slate-500 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            {!selectedInvItem ? (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                    <Icons.Search />
                  </div>
                  <input 
                    type="text" 
                    placeholder="搜尋門框/抽屜貨品..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    autoFocus
                    value={invSearchTerm}
                    onChange={(e) => setInvSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                  {filteredInventory.map(inv => (
                    <button 
                      key={inv.id}
                      onClick={() => setSelectedInvItem(inv)}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left hover:border-blue-600 hover:bg-blue-600/5 transition-all group flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-white group-hover:text-blue-400">{inv.name}</p>
                          {getProductLabel(inv.name) && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${
                              getProductLabel(inv.name) === '抽屜' ? 'bg-amber-500/20 text-amber-500' : 'bg-purple-500/20 text-purple-500'
                            }`}>
                              {getProductLabel(inv.name)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{inv.sku}</p>
                      </div>
                      <Icons.Plus />
                    </button>
                  ))}
                  {filteredInventory.length === 0 && (
                    <p className="text-center py-10 text-slate-600 text-xs font-black uppercase tracking-widest">找不到相關貨品</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 bg-blue-600/10 border border-blue-600/20 rounded-3xl">
                  <p className="text-[10px] text-blue-500 font-black uppercase mb-1">已選擇貨品</p>
                  <p className="text-2xl font-black text-white">{selectedInvItem.name}</p>
                  <p className="text-xs text-slate-500 mt-1">現有庫存：{selectedInvItem.quantity}</p>
                </div>
                <div>
                  <label className="text-sm font-black text-slate-400 mb-2 block">預備製作數量</label>
                  <input 
                    type="text" inputMode="numeric"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-3xl font-black text-center text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value.replace(/[^0-9]/g, ''))}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setSelectedInvItem(null)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-sm uppercase">返回</button>
                  <button onClick={handleInventoryAdd} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-500">確認加入預備組</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 轉移確認 Modal */}
      {transferModalOpen && targetTransferItem && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg sm:text-xl font-black text-white">確認轉移數量</h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-500 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                <p className="text-sm font-black text-white mb-1">{targetTransferItem.name}</p>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">目前可用總數</p>
                  <p className="text-lg font-black text-blue-500">{maxTransferQty}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 mb-2 block uppercase tracking-widest">欲轉移數量</label>
                <input 
                  type="text" inputMode="numeric"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-4xl font-black text-center text-blue-400 focus:ring-2 focus:ring-blue-600 outline-none shadow-inner"
                  value={transferInputQty}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    const n = parseInt(val) || 0;
                    setTransferInputQty(Math.min(n, maxTransferQty).toString());
                  }}
                  autoFocus
                />
              </div>

              <button 
                onClick={handleConfirmTransfer}
                disabled={parseInt(transferInputQty) <= 0}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-base uppercase shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                確認轉移至 {targetTransferItem.section === 'prep' ? (currentCategory === 'door' ? '門框製作' : '抽屜製作') : (currentCategory === 'door' ? '門框成品' : '抽屜成品')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 日期選擇 Modal */}
      {dateModalOpen && targetDateItem && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[130] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <div className="flex justify-between items-center mb-8 sm:mb-10">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">設定目標日期</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{targetDateItem.name}</p>
              </div>
              <button onClick={() => setDateModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-6 sm:space-y-8">
              <div className="bg-slate-950/80 border border-slate-800 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] flex flex-col items-center shadow-inner">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4 sm:mb-6">點擊日期進行修改</label>
                <input 
                  type="date" 
                  className="bg-transparent border-none text-white text-3xl sm:text-4xl font-black outline-none focus:ring-0 text-center w-full cursor-pointer"
                  value={tempDate}
                  onChange={(e) => setTempDate(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setDateModalOpen(false)}
                  className="flex-1 py-4 sm:py-5 bg-slate-800 text-slate-400 rounded-[20px] sm:rounded-[28px] font-black text-sm sm:text-base uppercase hover:bg-slate-700 transition-all active:scale-95 border border-slate-700"
                >
                  取消
                </button>
                <button 
                  onClick={handleConfirmDate}
                  className="flex-1 py-4 sm:py-5 bg-blue-600 text-white rounded-[20px] sm:rounded-[28px] font-black text-sm sm:text-base uppercase shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95"
                >
                  確認設定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 編輯零件規格 Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 p-10 rounded-[48px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-3xl font-black text-white">{editingFrame ? '編輯零件規格' : '新增零件確認'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">分類</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setFormData({...formData, category: 'door'})}
                    className={`py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 ${formData.category === 'door' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}
                  >
                    門框
                  </button>
                  <button 
                    onClick={() => setFormData({...formData, category: 'drawer'})}
                    className={`py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 ${formData.category === 'drawer' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}
                  >
                    抽屜
                  </button>
                </div>
              </div>

              <div className="col-span-2 space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">零件名稱 / 型號描述</label>
                <input 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">零件編號 (SKU)</label>
                <input 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-mono uppercase focus:ring-2 focus:ring-blue-600 outline-none"
                  value={formData.sku}
                  onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">材質</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none"
                  value={formData.material}
                  onChange={e => setFormData({...formData, material: e.target.value as any})}
                >
                  <option>木質</option>
                  <option>鋁製</option>
                  <option>鋼製</option>
                  <option>其他</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">屬性/方向</label>
                <div className="grid grid-cols-3 gap-2">
                  {['左開', '右開', '雙開'].map(d => (
                    <button 
                      key={d}
                      onClick={() => setFormData({...formData, direction: d as any})}
                      className={`py-3 rounded-xl font-black text-xs transition-all ${formData.direction === d ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">顏色名稱</label>
                <input 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-blue-600 outline-none"
                  value={formData.color}
                  onChange={e => setFormData({...formData, color: e.target.value})}
                />
              </div>

              <div className="col-span-2 p-8 bg-slate-950 border border-slate-800 rounded-[32px] space-y-6">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest text-center border-b border-slate-800 pb-4">零件尺寸 (mm)</p>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-2 block">高度 (H)</label>
                    <input type="number" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-center font-black outline-none focus:border-blue-500" value={formData.h} onChange={e => setFormData({...formData, h: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-2 block">寬度 (W)</label>
                    <input type="number" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-center font-black outline-none focus:border-blue-500" value={formData.w} onChange={e => setFormData({...formData, w: parseInt(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase mb-2 block">厚度 (D)</label>
                    <input type="number" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-center font-black outline-none focus:border-blue-500" value={formData.d} onChange={e => setFormData({...formData, d: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
              </div>

              <div className="col-span-2 flex gap-4 mt-4">
                {editingFrame && (
                  <button onClick={() => { onDelete(editingFrame.id); setModalOpen(false); }} className="px-8 py-5 bg-rose-600/10 text-rose-500 border border-rose-600/20 rounded-2xl font-black text-sm uppercase hover:bg-rose-600 hover:text-white transition-all">
                    刪除此零件
                  </button>
                )}
                <button onClick={() => setModalOpen(false)} className="flex-1 py-5 bg-slate-800 text-slate-400 rounded-2xl font-black text-sm uppercase">取消</button>
                <button onClick={handleSave} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-2xl shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all">
                  儲存並更新資料
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
