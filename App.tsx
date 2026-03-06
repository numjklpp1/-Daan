
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ViewType, InventoryItem, Order, Trip, OrderStatus, TripStatus, ProcessItem, ProcessSection, StackingItemStatus, VehicleProfile, DoorFrame, PartsSection, DoorFrameSection } from './types';
import { Icons, getProductLabel } from './constants';
import { calculateStacking } from './services/stackingLogic';

// 導入重構後的子模組
import { DashboardView } from './components/DashboardView';
import { ProcessView } from './components/ProcessView';
import { TripsView } from './components/TripsView';
import { StackingView } from './components/StackingView';
import { OrdersView } from './components/OrdersView';
import { InventoryView } from './components/InventoryView';
import { DoorFrameView } from './components/DoorFrameView';

const MenuDrawer = ({ activeView, onViewChange, processSubView, setProcessSubView, partsSubView, setPartsSubView, inventorySubView, setInventorySubView, isMenuOpen, onToggleMenu }: any) => {
  const menuItems = [
    { id: 'dashboard', label: '總覽儀表板', icon: <Icons.Dashboard /> },
    { id: 'process', label: '流程管理', icon: <Icons.Stacking />, hasSub: true },
    { id: 'parts', label: '零件管理', icon: <Icons.DoorFrame />, hasSub: true },
    { id: 'trips', label: '車趟排程', icon: <Icons.Truck /> },
    { id: 'stacking', label: '疊貨管理', icon: <Icons.Stacking /> },
    { id: 'orders', label: '訂單管理', icon: <Icons.Orders /> },
    { id: 'inventory', label: '庫存', icon: <Icons.Inventory />, hasSub: true },
  ];

  if (!isMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onToggleMenu}></div>
      
      {/* Drawer Content */}
      <div className="relative w-72 bg-slate-950 border-r border-slate-800 h-full shadow-2xl animate-in slide-in-from-left duration-300 p-6 flex flex-col">
        <div className="mb-12 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-600/20">昌</div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">昌儲 TripFlow</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">系統導航選單</p>
          </div>
        </div>
        
        <nav className="space-y-2 flex-1 overflow-y-auto scrollbar-hide">
          {menuItems.map(item => (
            <div key={item.id}>
              <button
                onClick={() => {
                  onViewChange(item.id as ViewType);
                  // 如果該分類有下分支，點擊大分類時不關閉側邊欄
                  const hasSubBranches = ['process', 'parts', 'inventory'].includes(item.id);
                  if (!hasSubBranches) {
                    onToggleMenu();
                  }
                }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                  activeView === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="flex-shrink-0">{item.icon}</div>
                <span className="font-bold text-base">{item.label}</span>
              </button>
              
              {item.id === 'process' && activeView === 'process' && (
                <div className="mt-2 ml-6 border-l-2 border-slate-800 pl-6 space-y-2 py-2">
                  {(['all', 'prep', 'shell', 'packaging'] as const).map(sub => (
                    <button
                      key={sub}
                      onClick={() => {
                        setProcessSubView(sub);
                        onToggleMenu();
                      }}
                      className={`w-full text-left px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        processSubView === sub ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      • {sub === 'all' ? '全部顯示' : sub === 'prep' ? '預備組' : sub === 'shell' ? '桶身組' : '包裝組'}
                    </button>
                  ))}
                </div>
              )}

              {item.id === 'parts' && activeView === 'parts' && (
                <div className="mt-2 ml-6 border-l-2 border-slate-800 pl-6 space-y-4 py-2">
                  {/* Door Frame Branch */}
                  <div>
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-2 ml-2">門框</p>
                    <div className="space-y-1">
                      {(['door-all', 'door-prep', 'door-done', 'door-stock'] as const).map(sub => (
                        <button
                          key={sub}
                          onClick={() => {
                            setPartsSubView(sub);
                            onToggleMenu();
                          }}
                          className={`w-full text-left px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            partsSubView === sub ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          • {sub === 'door-all' ? '全部顯示' : sub === 'door-prep' ? '預備組' : sub === 'door-done' ? '門框製作' : '門框成品'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Drawer Branch */}
                  <div>
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-2 ml-2">抽屜</p>
                    <div className="space-y-1">
                      {(['drawer-all', 'drawer-prep', 'drawer-done', 'drawer-stock'] as const).map(sub => (
                        <button
                          key={sub}
                          onClick={() => {
                            setPartsSubView(sub);
                            onToggleMenu();
                          }}
                          className={`w-full text-left px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            partsSubView === sub ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-white'
                          }`}
                        >
                          • {sub === 'drawer-all' ? '全部顯示' : sub === 'drawer-prep' ? '預備組' : sub === 'drawer-done' ? '抽屜製作' : '抽屜成品'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {item.id === 'inventory' && activeView === 'inventory' && (
                <div className="mt-2 ml-6 border-l-2 border-slate-800 pl-6 space-y-2 py-2">
                  {(['cabinet', 'door'] as const).map(sub => (
                    <button
                      key={sub}
                      onClick={() => {
                        setInventorySubView(sub);
                        onToggleMenu();
                      }}
                      className={`w-full text-left px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        inventorySubView === sub ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-white'
                      }`}
                    >
                      • {sub === 'cabinet' ? '櫃子' : '門框'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
};

const Header = ({ title, onToggleMenu }: { title: string, onToggleMenu: () => void }) => (
  <header className="h-24 bg-black border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-40 backdrop-blur-md">
    <div className="flex items-center gap-8">
      <button 
        onClick={onToggleMenu}
        className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95"
      >
        昌
      </button>
      <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-4 border-l pl-6 border-slate-800">
        <div className="text-right hidden sm:block">
          <p className="text-base font-black leading-tight text-white">管理員</p>
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">系統總監</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shadow-inner">
          <img src="https://picsum.photos/48/48" alt="Avatar" />
        </div>
      </div>
    </div>
  </header>
);

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('process');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [processSubView, setProcessSubView] = useState<'all' | ProcessSection>('all');
  const [partsSubView, setPartsSubView] = useState<PartsSection>('door-all');
  const [inventorySubView, setInventorySubView] = useState<'cabinet' | 'door'>('cabinet');
  
  const [inventory, setInventory] = useState<InventoryItem[]>([
    // 理想櫃
    ...['138(F把)', '138', 'UC2(70.5)', 'UC2', 'UC3', 'UD2(70.5)', 'UD2(F把)', 'UD2', 'UD3(F把)', 'UD3', 'UD3A', 'UD3A(70.5)', 'UD4', 'UD4A', 'UD4B', 'UD6', 'UN2', 'UN3', 'UP2', 'UP3', 'US2(70.5)', 'US2', 'US3', 'UG2A', 'UG3A'].map(name => ({
      id: `i-${name}`,
      sku: name,
      name: name,
      quantity: 0,
      unit: '個',
      category: '理想櫃',
      attribute: (['138(F把)', '138', 'UC2(70.5)', 'UC2', 'UC3', 'UD2(70.5)', 'UD2(F把)', 'UD2', 'UD3(F把)', 'UD3', 'UD3A', 'UD3A(70.5)', 'UD4', 'UD4A', 'UD4B', 'UD6', 'UP2', 'UP3'].includes(name) ? '抽屜' : (['UG2A', 'UG3A'].includes(name) ? '加框' : undefined)) as any,
      dimensions: { h: 0, w: 0, d: 0 },
      weight: 0,
      volume: 0
    })),
    // 牆櫃
    ...['AC2(70.5)', 'AC2', 'AC3', 'AD2(70.5)', 'AD2', 'AD3', 'AD3A', 'AD3A(70.5)', 'AD4', 'AD4B', 'AD6', 'AN1U', 'AO1H', 'AO1U', 'AO2B', 'AO2U', 'AO3B', 'AO3U', 'AO4B', 'AO4B2', 'AO5S', 'AS1H', 'AS1U', 'AS2B', 'AS2B(70.5)', 'AS2U', 'AS3B', 'AS3U', 'AK2B', 'AK2U', 'AK3B', 'AK3U'].map(name => ({
      id: `i-${name}`,
      sku: name,
      name: name,
      quantity: 0,
      unit: '個',
      category: '牆櫃',
      attribute: (['AC2(70.5)', 'AC2', 'AC3', 'AD2(70.5)', 'AD2', 'AD3', 'AD3A', 'AD3A(70.5)', 'AD4', 'AD4B', 'AD6'].includes(name) ? '抽屜' : (['AK2B', 'AK2U', 'AK3B', 'AK3U'].includes(name) ? '加框' : undefined)) as any,
      dimensions: { h: 0, w: 0, d: 0 },
      weight: 0,
      volume: 0
    })),
    // 其他鐵櫃
    ...['CB2(70.5)', 'CB2', 'CB3', 'CB4', 'CT2(70.5)', 'CT2', 'CT3', 'CT4', 'CB2(2S1L)', 'CB2(4S)', 'CB3(2S12L)', 'CB3(4S1L)', 'CB3(6S)', 'CB4(2S3L)', 'CB4(4S2L)', 'CB4(6S1L)', 'CB4(8S)', 'DU11809M', 'DU118M', 'DU8809M', 'DU88M', 'KS118', 'KS88', 'R3M106', 'R3M180', '3M2T', 'R3M74', 'R3M90', '3M3T', '6M2T', '6M4T', 'R4M106', '4M106S', '4M2T', 'R4M74', '4M74S', 'R4M90', '4M3T', 'TaMh', 'TaS', 'TaL2T', 'TaL3T', 'TaMs', 'DU118G', 'DU88G', 'KG118', 'KG88', '4M106G', '4M74G'].map(name => ({
      id: `i-${name}`,
      sku: name,
      name: name,
      quantity: 0,
      unit: '個',
      category: '其他鐵櫃',
      attribute: (['CB2(70.5)', 'CB2', 'CB3', 'CB4', 'CT2(70.5)', 'CT2', 'CT3', 'CT4', 'CB2(2S1L)', 'CB2(4S)', 'CB3(2S12L)', 'CB3(4S1L)', 'CB3(6S)', 'CB4(2S3L)', 'CB4(4S2L)', 'CB4(6S1L)', 'CB4(8S)'].includes(name) ? '抽屜' : (['DU118G', 'DU88G', 'KG118', 'KG88', '4M106G', '4M74G'].includes(name) ? '加框' : undefined)) as any,
      dimensions: { h: 0, w: 0, d: 0 },
      weight: 0,
      volume: 0
    })),
    // 門框
    ...['UG2A', 'UG3A', 'AK2B', 'AK2U', 'AK3B', 'AK3U', 'DU118G', 'DU88G', 'KG118', 'KG88', '4M106G', '4M74G'].map(name => ({
      id: `i-df-${name}`,
      sku: name,
      name: name,
      quantity: 0,
      unit: '個',
      category: '門框',
      attribute: '加框' as any,
      dimensions: { h: 0, w: 0, d: 0 },
      weight: 0,
      volume: 0
    }))
  ]);

  const [doorFrames, setDoorFrames] = useState<DoorFrame[]>([]);

  const [orders, setOrders] = useState<Order[]>([
    { id: 'o1', orderNumber: 'ORD-2025-001', customerName: '台積中心', status: OrderStatus.PENDING, items: [{ id: 'oi1', inventoryId: 'i1', name: 'US2 桶身', quantity: 30, stackingStatus: '標準' }], createdAt: '2025-05-19', region: '新竹' },
    { id: 'o2', orderNumber: 'ORD-2025-002', customerName: '聯發大樓', status: OrderStatus.PENDING, items: [{ id: 'oi2', inventoryId: 'i2', name: 'AO4B 側板', quantity: 20, stackingStatus: '標準' }], createdAt: '2025-05-20', region: '新竹' },
  ]);

  const [trips, setTrips] = useState<Trip[]>([
    { id: 't1', tripNumber: 'TRP-001', driverName: '阿豪', status: TripStatus.SCHEDULED, date: '2025-05-20', orderIds: ['o1'], vehicleId: 'v1' }
  ]);

  const [processItems, setProcessItems] = useState<ProcessItem[]>([]);
  const syncedProcessItemsRef = useRef<Set<string>>(new Set());
  const isInitialLoadComplete = useRef(false);

  const [selectedTripId, setSelectedTripId] = useState<string | null>('t1');
  const [inventorySearch, setInventorySearch] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // 從資料庫獲取庫存
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [invRes, procRes, doorRes] = await Promise.all([
          fetch('/api/inventory'),
          fetch('/api/process-items'),
          fetch('/api/door-frames')
        ]);

        const invData = await invRes.json();
        const procData = await procRes.json();
        const doorData = await doorRes.json();

        if (invData && invData.length > 0) {
          setInventory(invData);
        } else {
          await fetch('/api/inventory/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: inventory })
          });
        }

        if (procData && procData.length > 0) {
          setProcessItems(procData);
          const syncedIds = new Set<string>();
          procData.forEach((item: any) => {
            if (item.section !== 'prep') syncedIds.add(item.id);
          });
          syncedProcessItemsRef.current = syncedIds;
        }

        if (doorData && doorData.length > 0) {
          setDoorFrames(doorData);
        }

        isInitialLoadComplete.current = true;
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchAll();
  }, []);

  // 同步流程管理到資料庫
  useEffect(() => {
    if (!isInitialLoadComplete.current) return;
    const sync = async () => {
      try {
        await fetch('/api/process-items/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: processItems })
        });
      } catch (error) {
        console.error('Failed to sync process items:', error);
      }
    };
    sync();
  }, [processItems]);

  // 同步零件管理到資料庫
  useEffect(() => {
    if (!isInitialLoadComplete.current) return;
    const sync = async () => {
      try {
        await fetch('/api/door-frames/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: doorFrames })
        });
      } catch (error) {
        console.error('Failed to sync door frames:', error);
      }
    };
    sync();
  }, [doorFrames]);

  // 28天自動刪除邏輯
  useEffect(() => {
    const today = new Date();
    setProcessItems(prev => {
      const toDelete = prev.filter(item => {
        if (item.section !== 'completed' || !item.createdAt) return false;
        const createdDate = new Date(item.createdAt);
        const diffTime = Math.abs(today.getTime() - createdDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 28;
      });

      toDelete.forEach(item => {
        fetch(`/api/process-items/${item.id}`, { method: 'DELETE' }).catch(err => console.error(err));
      });

      return prev.filter(item => {
        if (item.section !== 'completed' || !item.createdAt) return true;
        const createdDate = new Date(item.createdAt);
        const diffTime = Math.abs(today.getTime() - createdDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 28;
      });
    });
  }, []);

  const currentTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId]);
  const currentVehicle: VehicleProfile = { id: 'v1', driverName: '阿豪', plateNumber: 'HA-8888', maxVolume: 62.35, dimensions: { l: 855, w: 255, h: 286 } };
  const tripOrders = useMemo(() => orders.filter(o => currentTrip?.orderIds.includes(o.id)), [orders, currentTrip]);
  const currentVolume = useMemo(() => tripOrders.reduce((acc, o) => acc + o.items.reduce((sum, i) => sum + (i.quantity * (inventory.find(inv => inv.id === i.inventoryId)?.volume || 0)), 0), 0), [tripOrders, inventory]);

  const handleUpdateStock = async (id: string, delta: number) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i));
    try {
      await fetch('/api/inventory/update-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryId: id, quantityChange: delta })
      });
    } catch (error) {
      console.error('Failed to update stock on server:', error);
    }
  };

  const handleAddItem = async (item: Omit<InventoryItem, 'id'>) => {
    const newItem = { ...item, id: `i${Date.now()}` };
    setInventory(prev => [...prev, newItem]);
    try {
      await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [newItem] })
      });
    } catch (error) {
      console.error('Failed to add item to server:', error);
    }
  };

  const handleUpdateItem = async (item: InventoryItem) => {
    setInventory(prev => prev.map(i => i.id === item.id ? item : i));
    try {
      await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [item] })
      });
    } catch (error) {
      console.error('Failed to update item on server:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
    try {
      await fetch(`/api/inventory/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Failed to delete item on server:', error);
    }
  };

  const handleUpdateProcessItems = (update: ProcessItem[] | ((prev: ProcessItem[]) => ProcessItem[])) => {
    setProcessItems(update);
  };

  const handleDeleteProcessItem = async (id: string) => {
    setProcessItems(prev => prev.filter(i => i.id !== id));
    try {
      await fetch(`/api/process-items/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete process item:', error);
    }
  };

  // 自動同步流程管理到零件管理
  useEffect(() => {
    let hasNewParts = false;
    const newParts: DoorFrame[] = [];
    const updatedQtyMap = new Map<string, number>();

    processItems.forEach(item => {
      const label = getProductLabel(item.name);
      if (label === '抽屜' || label === '加框') {
        // 如果是新項目，則新增
        if (item.section === 'prep' && !syncedProcessItemsRef.current.has(item.id)) {
          const invItem = inventory.find(i => i.id === item.inventoryId);
          const newPart: DoorFrame = {
            id: `df-${Date.now()}-${Math.random()}`,
            sku: invItem?.sku || '',
            name: item.name,
            category: label === '抽屜' ? 'drawer' : 'door',
            section: 'prep',
            material: '鋁製',
            direction: '左開',
            color: '預設色',
            quantity: item.quantity,
            formula: item.quantity.toString(),
            dimensions: invItem?.dimensions || { h: 0, w: 0, d: 0 },
            createdAt: new Date().toISOString().split('T')[0],
            sourceProcessItemId: item.id
          };
          newParts.push(newPart);
          syncedProcessItemsRef.current.add(item.id);
          hasNewParts = true;
        } else {
          // 記錄已存在項目的最新數量
          updatedQtyMap.set(item.id, item.quantity);
        }
      }
    });

    if (hasNewParts || updatedQtyMap.size > 0) {
      setDoorFrames(current => {
        let changed = false;
        let next = current.map(df => {
          if (df.sourceProcessItemId && updatedQtyMap.has(df.sourceProcessItemId)) {
            const newQty = updatedQtyMap.get(df.sourceProcessItemId)!;
            // 只同步預備組的數量，且數量有變動時才更新
            if (df.section === 'prep' && df.quantity !== newQty) {
              changed = true;
              return { ...df, quantity: newQty, formula: newQty.toString() };
            }
          }
          return df;
        });

        if (newParts.length > 0) {
          next = [...next, ...newParts];
          changed = true;
        }

        return changed ? next : current;
      });
    }
  }, [processItems, inventory]);

  const handleProcessMove = (id: string, moveQty: number) => {
    setProcessItems(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;
      
      let nextSection: ProcessSection = 'shell';
      if (item.section === 'prep') nextSection = 'shell';
      else if (item.section === 'shell') nextSection = 'packaging';
      else if (item.section === 'packaging') nextSection = 'completed'; // 內部流轉至 hidden section

      const today = new Date().toISOString().split('T')[0];
      const newItem: ProcessItem = { 
        ...item, 
        id: `pi-${Date.now()}`, 
        section: nextSection, 
        quantity: moveQty,
        formula: moveQty.toString(),
        createdAt: (nextSection === 'completed' || nextSection === 'packaging') ? today : undefined
      };
      
      const remainingQty = Math.max(0, item.quantity - moveQty);

      if (remainingQty === 0) {
        fetch(`/api/process-items/${id}`, { method: 'DELETE' }).catch(err => console.error(err));
        return [...prev.filter(i => i.id !== id), newItem];
      } else {
        return prev.map(i => i.id === id ? { ...i, quantity: remainingQty, formula: remainingQty.toString() } : i).concat(newItem);
      }
    });
  };

  const handleInventoryPut = (id: string, qty: number) => {
    const item = processItems.find(i => i.id === id);
    if (!item) return;

    handleUpdateStock(item.inventoryId, qty);
    const today = new Date().toISOString().split('T')[0];

    setProcessItems(prev => {
      const currentItem = prev.find(i => i.id === id);
      if (!currentItem) return prev;
      
      const newItem: ProcessItem = { 
        ...currentItem, 
        id: `pi-${Date.now()}`, 
        section: 'completed' as ProcessSection, 
        quantity: qty,
        createdAt: today
      };
      
      const remainingQty = Math.max(0, currentItem.quantity - qty);

      if (remainingQty === 0) {
        fetch(`/api/process-items/${id}`, { method: 'DELETE' }).catch(err => console.error(err));
        return [...prev.filter(i => i.id !== id), newItem];
      } else {
        return prev.map(i => i.id === id ? { ...i, quantity: remainingQty } : i).concat(newItem);
      }
    });
  };

  const handleCalculateStacking = () => {
    const result = calculateStacking(currentVehicle, tripOrders, inventory);
    setOrders(prev => prev.map(o => {
      const updated = result.updatedOrders.find(u => u.id === o.id);
      return updated ? updated : o;
    }));
  };

  const handlePartMove = (id: string, moveQty: number) => {
    const item = doorFrames.find(f => f.id === id);
    if (!item) return;
    
    let nextSection: DoorFrameSection = 'done';
    if (item.section === 'prep') nextSection = 'done';
    else if (item.section === 'done') nextSection = 'stock';
    else return; // 已經在成品組，無法再轉移

    const today = new Date().toISOString().split('T')[0];

    setDoorFrames(prev => {
      const currentItem = prev.find(f => f.id === id);
      if (!currentItem) return prev;
      
      const newItem: DoorFrame = { 
        ...currentItem, 
        id: `df-${Date.now()}`, 
        section: nextSection, 
        quantity: moveQty,
        isPreparing: false, // 轉移後重置備貨狀態
        formula: moveQty.toString(), // 轉移後將計算公式設為轉移數量
        createdAt: today // 更新進入該階段的日期
      };

      const remainingQty = Math.max(0, currentItem.quantity - moveQty);

      if (remainingQty === 0) {
        fetch(`/api/door-frames/${id}`, { method: 'DELETE' }).catch(err => console.error(err));
        return [...prev.filter(f => f.id !== id), newItem];
      } else {
        return prev.map(f => f.id === id ? { ...f, quantity: remainingQty, formula: remainingQty.toString() } : f).concat(newItem);
      }
    });
  };

  const handlePartToInventory = async (frame: DoorFrame, qty: number) => {
    const targetCategory = frame.category === 'door' ? '門框' : '理想櫃';
    let targetId = '';
    
    // 1. 更新庫存管理中的數量
    setInventory(prev => {
      const existingItem = prev.find(i => i.sku === frame.sku && i.category === targetCategory);
      if (existingItem) {
        targetId = existingItem.id;
        return prev.map(i => i.id === existingItem.id ? { ...i, quantity: i.quantity + qty } : i);
      } else {
        const newId = `i-${Date.now()}`;
        targetId = newId;
        const newItem: InventoryItem = {
          id: newId,
          sku: frame.sku,
          name: frame.name,
          quantity: qty,
          unit: '個',
          category: targetCategory,
          attribute: frame.category === 'door' ? '加框' : '抽屜',
          dimensions: frame.dimensions,
          weight: 0,
          volume: (frame.dimensions.h * frame.dimensions.w * frame.dimensions.d) / 1000000000
        };
        
        // 非同步同步到伺服器
        fetch('/api/inventory/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [newItem] })
        }).catch(err => console.error('Failed to sync new item:', err));
        
        return [...prev, newItem];
      }
    });

    // 如果是現有項目，更新庫存
    if (targetId && !targetId.startsWith('i-17')) { // 簡單檢查是否為現有項目
       fetch('/api/inventory/update-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventoryId: targetId, quantityChange: qty })
      }).catch(err => console.error('Failed to update stock:', err));
    }

    // 2. 更新零件管理中的數量 (移除已入庫的零件)
    setDoorFrames(prev => {
      const remainingQty = Math.max(0, frame.quantity - qty);
      if (remainingQty === 0) {
        fetch(`/api/door-frames/${frame.id}`, { method: 'DELETE' }).catch(err => console.error(err));
        return prev.filter(f => f.id !== frame.id);
      } else {
        return prev.map(f => f.id === frame.id ? { ...f, quantity: remainingQty, formula: remainingQty.toString() } : f);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <MenuDrawer 
        activeView={activeView} 
        onViewChange={setActiveView} 
        processSubView={processSubView} 
        setProcessSubView={setProcessSubView}
        partsSubView={partsSubView}
        setPartsSubView={setPartsSubView}
        inventorySubView={inventorySubView}
        setInventorySubView={setInventorySubView}
        isMenuOpen={isMenuOpen}
        onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
      />
      
      <div className="min-h-screen flex flex-col bg-black">
        <Header 
          title={
            activeView === 'dashboard' ? '營運總覽' :
            activeView === 'process' ? '流程管理' :
            activeView === 'parts' ? (partsSubView.startsWith('door') ? '門框管理' : '抽屜管理') :
            activeView === 'trips' ? '配送排程' :
            activeView === 'stacking' ? '疊貨模擬' :
            activeView === 'orders' ? '訂單池' : '庫存管理'
          } 
          onToggleMenu={() => setIsMenuOpen(!isMenuOpen)}
        />
        
        <main className="flex-1 p-4 overflow-y-auto scrollbar-hide bg-black">
          {activeView === 'dashboard' && <DashboardView orders={orders} trips={trips} inventory={inventory} />}
          {activeView === 'process' && (
            <ProcessView 
              subView={processSubView} 
              items={processItems} 
              inventory={inventory}
              onUpdateItems={handleUpdateProcessItems}
              onMoveItem={handleProcessMove}
              onInventoryPut={handleInventoryPut}
              onDeleteItem={handleDeleteProcessItem}
              onDeleteInventory={handleDeleteItem}
            />
          )}
          {activeView === 'parts' && (
            <DoorFrameView 
              subView={partsSubView}
              doorFrames={doorFrames}
              inventory={inventory}
              onAdd={(f) => {
                const id = `df-${Date.now()}`;
                setDoorFrames([...doorFrames, { ...f, id, section: 'prep' }]);
              }}
              onUpdate={(f) => setDoorFrames(doorFrames.map(df => df.id === f.id ? f : df))}
              onDelete={(id) => {
                fetch(`/api/door-frames/${id}`, { method: 'DELETE' }).catch(err => console.error(err));
                setDoorFrames(doorFrames.filter(df => df.id !== id));
              }}
              onQuickUpdate={(id, delta) => setDoorFrames(doorFrames.map(df => df.id === id ? { ...df, quantity: Math.max(0, df.quantity + delta) } : df))}
              onMovePart={handlePartMove}
              onInventoryPut={handlePartToInventory}
            />
          )}
          {activeView === 'trips' && (
            <TripsView 
              date={calendarDate} 
              onChangeDate={setCalendarDate} 
              trips={trips} 
              onAddTrip={(d) => console.log('Add trip on', d)}
              onSelectTrip={(id) => { setSelectedTripId(id); setActiveView('stacking'); }}
            />
          )}
          {activeView === 'stacking' && (
            <StackingView 
              currentTrip={currentTrip} 
              vehicle={currentVehicle} 
              tripOrders={tripOrders} 
              inventory={inventory}
              volume={currentVolume}
              onCalculate={handleCalculateStacking}
              onAddOrder={() => console.log('Add order')}
              onUpdateStatus={(oId, iId, status) => {
                setOrders(prev => prev.map(o => o.id === oId ? { ...o, items: o.items.map(i => i.id === iId ? { ...i, stackingStatus: status } : i) } : o));
              }}
            />
          )}
          {activeView === 'orders' && <OrdersView orders={orders} onAddOrder={() => console.log('New Order')} />}
          {activeView === 'inventory' && (
            <InventoryView 
              subView={inventorySubView}
              inventory={inventory} 
              searchTerm={inventorySearch} 
              onSearch={setInventorySearch} 
              onUpdateStock={handleUpdateStock} 
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          )}
        </main>
      </div>
    </div>
  );
}
