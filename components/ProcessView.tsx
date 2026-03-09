
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  TouchSensor,
  MouseSensor,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { ProcessItem, ProcessSection, InventoryItem } from '../types';
import { Icons, getProductLabel } from '../constants';

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
    // 只有當點擊的是文字區域且不是在拖拽時才處理
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    if (Math.abs(walk) > 5) {
      e.preventDefault();
      e.stopPropagation(); // 阻止拖拽感應器
      containerRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
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
  subView: 'all' | ProcessSection;
  items: ProcessItem[];
  inventory: InventoryItem[];
  onUpdateItems: (items: ProcessItem[] | ((prev: ProcessItem[]) => ProcessItem[])) => void;
  onMoveItem: (id: string, qty: number) => void;
  onInventoryPut: (id: string, qty: number) => void;
  onDeleteItem: (id: string) => void;
  onDeleteInventory: (id: string) => void;
}

const ProcessCard = ({ item, section, onTransferClick, onPutClick, onUpdate, onUpdateNote, onUpdateFormula, onTogglePreparing, onDelete, inventory, onOpenDateSelector, isDragging }: any) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const total = item.quantity;

  // 檢查是否允許轉移 (預備組限定: 必須是目標日期的前一天)
  const isTransferAllowed = useMemo(() => {
    if (section !== 'prep' || !item.targetDate) return true;
    
    try {
      // 獲取今天日期 (不含時間)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 獲取目標日期 (不含時間)
      const target = new Date(item.targetDate);
      if (isNaN(target.getTime())) return true;
      target.setHours(0, 0, 0, 0);
      
      // 計算目標日期的前一天
      const dayBefore = new Date(target);
      dayBefore.setDate(dayBefore.getDate() - 1);
      
      return today.getTime() >= dayBefore.getTime();
    } catch (e) {
      console.error("Date calculation error:", e);
      return true;
    }
  }, [section, item.targetDate]);

  // 獲取對應的庫存屬性
  const invItem = inventory.find((i: any) => i.id === item.inventoryId);
  const attribute = invItem?.attribute;

  // 計算公式總和
  const calculateTotal = (formula: string) => {
    const matches = formula.match(/[+-]?\d+/g);
    if (!matches) return 0;
    return matches.reduce((acc: number, curr: string) => acc + parseInt(curr), 0);
  };

  return (
    <div className={`p-3 border-2 rounded-2xl shadow-sm flex flex-col gap-2 group transition-all ${
      isDragging
        ? 'bg-blue-600/10 border-blue-400 shadow-xl shadow-blue-500/20 scale-[1.02]'
        : item.isPreparing 
          ? 'bg-rose-950/40 border-rose-600/50 hover:border-rose-500' 
          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
    }`}>
      <div className="flex justify-between items-center px-1 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1 rounded-lg hover:bg-slate-800 transition-all ${isExpanded ? 'text-blue-400' : 'text-slate-600'}`}
          >
            <Icons.ChevronDown className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex flex-col min-w-0 flex-1">
            <ScrollableText text={item.name} className="text-[13px] font-black text-white" />
            {item.createdAt && <span className="text-[9px] text-slate-500 font-bold">{item.createdAt}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 總數顯示 */}
          <div className="bg-slate-900 border border-slate-800 h-[26px] min-w-[26px] px-1.5 flex items-center justify-center rounded-lg shadow-inner">
            <span className="text-[13px] font-black text-white leading-none">{total}</span>
          </div>

          <div className="flex gap-1.5">
            {/* 備註按鈕 */}
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`h-[26px] w-[26px] flex items-center justify-center rounded-lg border transition-all ${
                item.note 
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icons.Orders className="w-3 h-3" />
            </button>
            {/* 日曆按鈕 */}
            <button 
              onClick={() => onOpenDateSelector(item)}
              className={`h-[26px] w-[26px] flex items-center justify-center rounded-lg border transition-all ${
                item.targetDate 
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title={item.targetDate ? `目標日期: ${item.targetDate}` : '設定目標日期'}
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
              {/* 備註輸入框 + 轉移按鈕 */}
              <div className="px-1 flex items-end gap-2">
                <div className="flex-1">
                  <p className="text-[8px] text-slate-500 font-black mb-1 ml-1 uppercase tracking-widest">備註內容</p>
                  <input 
                    type="text"
                    placeholder="輸入備註..."
                    value={item.note || ''}
                    onChange={(e) => onUpdateNote(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300 font-bold focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-slate-700"
                  />
                </div>
                <div className="flex gap-1.5">
                  {section !== 'packaging' ? (
                    <button 
                      onClick={() => onTransferClick(item.id, total)} 
                      disabled={!isTransferAllowed}
                      className={`px-4 py-2 text-[11px] font-black rounded-xl shadow-lg active:scale-95 transition-all ${
                        isTransferAllowed 
                          ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20' 
                          : 'bg-rose-600 text-white cursor-not-allowed opacity-80'
                      }`}
                    >
                      轉移
                    </button>
                  ) : (
                    <button 
                      onClick={() => onPutClick(item.id, total)} 
                      className="px-4 py-2 bg-emerald-600 text-[11px] font-black rounded-xl hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                    >
                      完成
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[8px] text-slate-500 font-black mb-1 ml-1 uppercase tracking-widest">數量計算 (支援 100+20)</p>
                  <input 
                    type="text"
                    value={item.formula || item.quantity || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9+-]/g, '');
                      const newTotal = calculateTotal(val);
                      onUpdateFormula(val, newTotal);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-blue-400 font-black focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button 
                  onClick={() => onTogglePreparing(!item.isPreparing)}
                  className={`self-end px-4 py-2.5 text-[11px] font-black rounded-xl transition-all border ${
                    item.isPreparing 
                      ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/20' 
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  備貨中
                </button>
                <button 
                  onClick={() => {
                    if (isConfirmingDelete) {
                      onDelete(item.id);
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

const SortableProcessCard = (props: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 0 : undefined,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div {...attributes} {...listeners} className="touch-none">
        <ProcessCard {...props} isDragging={isDragging} />
      </div>
    </div>
  );
};

export const ProcessView: React.FC<Props> = ({ subView, items, inventory, onUpdateItems, onMoveItem, onInventoryPut, onDeleteItem, onDeleteInventory }) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 300, // 手機端稍微增加延遲以防誤觸
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      onUpdateItems((prevItems: ProcessItem[]) => {
        const oldIndex = prevItems.findIndex((item) => item.id === active.id);
        const newIndex = prevItems.findIndex((item) => item.id === over.id);
        return arrayMove(prevItems, oldIndex, newIndex);
      });
    }
  };

  // Modal 狀態管理
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [putModalOpen, setPutModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  
  const [activeSection, setActiveSection] = useState<ProcessSection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [addQty, setAddQty] = useState<string>('1');

  // 日期選擇專用狀態
  const [targetDateItem, setTargetDateItem] = useState<ProcessItem | null>(null);
  const [tempDate, setTempDate] = useState('');

  // 歷史紀錄篩選
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(new Date().toISOString().split('T')[0]);

  // 轉移專用狀態
  const [targetTransferItem, setTargetTransferItem] = useState<ProcessItem | null>(null);
  const [transferInputQty, setTransferInputQty] = useState<string>('0');
  const [maxTransferQty, setMaxTransferQty] = useState(0);

  // 完成專用狀態
  const [targetPutItem, setTargetPutItem] = useState<ProcessItem | null>(null);
  const [putInputQty, setPutInputQty] = useState<string>('0');
  const [maxPutQty, setMaxPutQty] = useState(0);

  const categories = ['all', '理想櫃', '牆櫃', '其他鐵櫃'];

  const sections: { key: ProcessSection; label: string; color: string }[] = [
    { key: 'prep', label: '預備組', color: 'bg-slate-500' },
    { key: 'shell', label: '桶身組', color: 'bg-blue-500' },
    { key: 'packaging', label: '包裝組', color: 'bg-amber-500' },
  ];

  const filteredSections = subView === 'all' ? sections : sections.filter(s => s.key === subView);

  const filteredInventory = useMemo(() => {
    return inventory.filter(i => {
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           i.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || i.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [inventory, searchTerm, selectedCategory]);

  const handleOpenAdd = (sec: ProcessSection) => {
    setActiveSection(sec);
    setAddModalOpen(true);
    setSelectedItem(null);
    setSearchTerm('');
    setAddQty('1');
  };

  const handleAddItem = () => {
    if (!selectedItem || !activeSection) return;
    const qty = parseInt(addQty) || 0;
    if (qty <= 0) return;

    onUpdateItems(prev => [
      ...prev,
      { 
        id: `pi-${Date.now()}`, 
        inventoryId: selectedItem.id, 
        name: selectedItem.name, 
        quantity: qty, 
        formula: qty.toString(),
        section: activeSection 
      }
    ]);

    setAddModalOpen(false);
  };

  const handleTransferClick = (id: string, currentTotal: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    setTargetTransferItem(item);
    setMaxTransferQty(currentTotal);
    setTransferInputQty(currentTotal.toString());
    setTransferModalOpen(true);
  };

  const handleConfirmTransfer = () => {
    if (!targetTransferItem) return;
    const qty = parseInt(transferInputQty) || 0;
    if (qty <= 0 || qty > maxTransferQty) return;

    onMoveItem(targetTransferItem.id, qty);
    setTransferModalOpen(false);
    setTargetTransferItem(null);
  };

  const handlePutClick = (id: string, currentTotal: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    setTargetPutItem(item);
    setMaxPutQty(currentTotal);
    setPutInputQty(currentTotal.toString());
    setPutModalOpen(true);
  };

  const handleConfirmPut = () => {
    if (!targetPutItem) return;
    const qty = parseInt(putInputQty) || 0;
    if (qty <= 0 || qty > maxPutQty) return;

    onInventoryPut(targetPutItem.id, qty);
    setPutModalOpen(false);
    setTargetPutItem(null);
  };

  const handleOpenDateSelector = (item: ProcessItem) => {
    setTargetDateItem(item);
    setTempDate(item.targetDate || new Date().toISOString().split('T')[0]);
    setDateModalOpen(true);
  };

  const handleConfirmDate = () => {
    if (!targetDateItem) return;
    onUpdateItems(prev => prev.map(pi => pi.id === targetDateItem.id ? { ...pi, targetDate: tempDate } : pi));
    setDateModalOpen(false);
    setTargetDateItem(null);
  };

  return (
    <>
      <DndContext 
        sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className={`grid grid-cols-1 ${subView === 'all' ? 'lg:grid-cols-2' : 'lg:grid-cols-1'} gap-4`}>
        {filteredSections.map(sec => {
          const sectionItems = items.filter(i => i.section === sec.key);

          return (
            <div key={sec.key} className="bg-slate-900/50 border border-slate-800 rounded-[32px] p-4 flex flex-col overflow-hidden shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${sec.color} shadow-lg shadow-${sec.color.split('-')[1]}-500/40`}></div>
                  {sec.label}
                  <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded uppercase font-black tracking-widest">
                    {sectionItems.length}
                  </span>
                </h3>
                <div className="flex gap-2">
                  {sec.key === 'packaging' && (
                    <button 
                      onClick={() => setHistoryModalOpen(true)}
                      className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-white transition-all shadow-lg active:scale-95 border border-slate-700"
                      title="查看歷史入庫紀錄"
                    >
                      <Icons.Calendar />
                    </button>
                  )}
                  <button 
                    onClick={() => handleOpenAdd(sec.key)} 
                    className="p-2.5 bg-slate-800 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-lg active:scale-95 border border-slate-700"
                  >
                    <Icons.Plus />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                <SortableContext 
                  items={sectionItems.map(i => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sectionItems.map(item => (
                    <SortableProcessCard 
                      key={item.id} 
                      item={item} 
                      section={sec.key}
                      onTransferClick={handleTransferClick}
                      onPutClick={handlePutClick}
                      onDelete={onDeleteItem}
                      onUpdate={(newQty: number) => onUpdateItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, quantity: newQty } : pi))}
                      onUpdateNote={(newNote: string) => onUpdateItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, note: newNote } : pi))}
                      onUpdateFormula={(newFormula: string, newTotal: number) => onUpdateItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, formula: newFormula, quantity: newTotal } : pi))}
                      onTogglePreparing={(isPrep: boolean) => onUpdateItems(prev => prev.map(pi => pi.id === item.id ? { ...pi, isPreparing: isPrep } : pi))}
                      onOpenDateSelector={handleOpenDateSelector}
                      inventory={inventory}
                    />
                  ))}
                </SortableContext>
                {sectionItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20 border-2 border-dashed border-slate-800 rounded-[32px]">
                    <p className="text-xs font-black uppercase tracking-widest">目前無待處理項</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0',
            },
          },
        }),
      }}>
        {activeId ? (
          <div className="w-full shadow-2xl pointer-events-none">
            <ProcessCard 
              item={items.find(i => i.id === activeId)} 
              section={items.find(i => i.id === activeId)?.section}
              inventory={inventory}
              isDragging={true}
              onTransferClick={() => {}}
              onPutClick={() => {}}
              onDelete={() => {}}
              onUpdate={() => {}}
              onUpdateNote={() => {}}
              onUpdateFormula={() => {}}
              onTogglePreparing={() => {}}
              onOpenDateSelector={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>

    {/* 歷史紀錄 Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[120] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
            <div className="flex justify-between items-center mb-6 sm:mb-10">
              <div>
                <h3 className="text-xl sm:text-3xl font-black text-white">完成組歷史紀錄</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">※ 系統自動保存 28 天內的資料</p>
              </div>
              <button onClick={() => setHistoryModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-6 sm:space-y-8">
              <div className="bg-slate-950/80 border border-slate-800 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] flex flex-col items-center">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 sm:mb-4">選擇查詢日期</label>
                <input 
                  type="date" 
                  className="bg-transparent border-none text-white text-3xl sm:text-4xl font-black outline-none focus:ring-0 text-center w-full"
                  value={selectedHistoryDate}
                  onChange={(e) => setSelectedHistoryDate(e.target.value)}
                />
              </div>

              <div className="border-2 border-dashed border-slate-800 rounded-[24px] sm:rounded-[40px] p-4 sm:p-6 max-h-[40vh] sm:max-h-[350px] overflow-y-auto space-y-4 scrollbar-hide bg-slate-950/30">
                {items.filter(i => i.section === 'completed' && i.createdAt === selectedHistoryDate).length > 0 ? (
                  items.filter(i => i.section === 'completed' && i.createdAt === selectedHistoryDate).map(item => (
                    <div key={item.id} className="p-4 sm:p-5 bg-slate-950 border border-slate-800 rounded-2xl sm:rounded-3xl flex justify-between items-center shadow-lg">
                      <div>
                        <p className="text-base sm:text-lg font-black text-white">{item.name}</p>
                        <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase mt-1">入庫時間: {item.createdAt}</p>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-emerald-500 bg-emerald-500/10 px-3 sm:px-4 py-1 rounded-xl">x{item.quantity}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-16 sm:py-20 text-center text-slate-700 font-black uppercase tracking-widest text-xs sm:text-sm">
                    該日期無任何完成紀錄
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <p className="text-[10px] sm:text-xs text-blue-400/80 font-black mb-4 sm:mb-6 uppercase tracking-wider">
                  當包裝組完成入庫後，該日期的完成紀錄會新增這筆資料
                </p>
                <button 
                  onClick={() => setHistoryModalOpen(false)}
                  className="w-full py-4 sm:py-5 bg-slate-800 text-white rounded-[20px] sm:rounded-[28px] font-black text-sm sm:text-base uppercase shadow-xl hover:bg-slate-700 transition-all active:scale-95 border border-slate-700"
                >
                  關閉視窗
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新增貨品 Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg sm:text-xl font-black text-white">
                {!selectedItem ? `新增品項到 ${sections.find(s => s.key === activeSection)?.label}` : '確認數量'}
              </h3>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-500 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            {!selectedItem ? (
              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                        selectedCategory === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-500 hover:text-white'
                      }`}
                    >
                      {cat === 'all' ? '全部' : cat}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
                    <Icons.Search />
                  </div>
                  <input 
                    type="text" 
                    placeholder="搜尋貨品名稱..." 
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-[350px] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                  {filteredInventory.map(inv => (
                    <div 
                      key={inv.id}
                      className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-left hover:border-blue-600 hover:bg-blue-600/5 transition-all group flex justify-between items-center"
                    >
                      <button 
                        onClick={() => setSelectedItem(inv)}
                        className="flex-1 text-left"
                      >
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
                      </button>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedItem(inv)}
                          className="p-2 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                        >
                          <Icons.Plus />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-6 bg-blue-600/10 border border-blue-600/20 rounded-3xl">
                  <p className="text-[10px] text-blue-500 font-black uppercase mb-1">已選擇貨品</p>
                  <p className="text-2xl font-black text-white">{selectedItem.name}</p>
                </div>
                <div>
                  <label className="text-sm font-black text-slate-400 mb-2 block">輸入數量</label>
                  <input 
                    type="text" inputMode="numeric"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-3xl font-black text-center text-white focus:ring-2 focus:ring-blue-600 outline-none"
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value.replace(/[^0-9]/g, ''))}
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setSelectedItem(null)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-sm uppercase">返回</button>
                  <button onClick={handleAddItem} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:bg-blue-500">確認加入</button>
                </div>
              </div>
            )}
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
                {parseInt(transferInputQty) > 0 && parseInt(transferInputQty) < maxTransferQty && (
                  <p className="text-[10px] text-amber-500 font-black mt-2 text-center uppercase">※ 將進行部分轉移 (保留 {maxTransferQty - parseInt(transferInputQty)} 個在原組)</p>
                )}
              </div>

              <button 
                onClick={handleConfirmTransfer}
                disabled={parseInt(transferInputQty) <= 0}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-base uppercase shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                確認轉移至 {targetTransferItem.section === 'prep' ? '桶身組' : targetTransferItem.section === 'shell' ? '包裝組' : '完成組'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 完成確認 Modal */}
      {putModalOpen && targetPutItem && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg sm:text-xl font-black text-white">確認完成數量</h3>
              <button onClick={() => setPutModalOpen(false)} className="text-slate-500 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl">
                <p className="text-sm font-black text-white mb-1">{targetPutItem.name}</p>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">目前待處理總數</p>
                  <p className="text-lg font-black text-emerald-500">{maxPutQty}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 mb-2 block uppercase tracking-widest">欲完成入庫數量</label>
                <input 
                  type="text" inputMode="numeric"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 px-6 text-4xl font-black text-center text-emerald-400 focus:ring-2 focus:ring-emerald-600 outline-none shadow-inner"
                  value={putInputQty}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    const n = parseInt(val) || 0;
                    setPutInputQty(Math.min(n, maxPutQty).toString());
                  }}
                  autoFocus
                />
                {parseInt(putInputQty) > 0 && parseInt(putInputQty) < maxPutQty && (
                  <p className="text-[10px] text-amber-500 font-black mt-2 text-center uppercase">※ 將進行部分完成 (保留 {maxPutQty - parseInt(putInputQty)} 個在包裝組)</p>
                )}
              </div>

              <button 
                onClick={handleConfirmPut}
                disabled={parseInt(putInputQty) <= 0}
                className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-base uppercase shadow-2xl shadow-emerald-600/30 hover:bg-emerald-500 transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                確認完成並入庫
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
