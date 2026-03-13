
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
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
                  {/* All Parts Branch */}
                  <button
                    onClick={() => {
                      setPartsSubView('all-all');
                      onToggleMenu();
                    }}
                    className={`w-full text-left px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      partsSubView === 'all-all' ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    • 全部零件顯示
                  </button>

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
  
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('tripflow_inventory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved inventory', e);
      }
    }
    return [
      // 理想櫃
      ...['138(F把)', '138', 'UC2(70.5)', 'UC2', 'UC3', 'UD2(70.5)', 'UD2(F把)', 'UD2', 'UD3(F把)', 'UD3', 'UD3A', 'UD3A(70.5)', 'UD4', 'UD4A', 'UD4B', 'UD6', 'UG2A', 'UG3A', 'UN2', 'UN3', 'UP2', 'UP3', 'US2(70.5)', 'US2', 'US3'].map(name => ({
        id: `i-${name}`,
        sku: name,
        name: name,
        quantity: 0,
        unit: '個',
        category: '理想櫃',
        attribute: getProductLabel(name) as any,
        dimensions: { h: 0, w: 0, d: 0 },
        weight: 0,
        volume: 0
      })),
      // 牆櫃
      ...['AC2(70.5)', 'AC2', 'AC3', 'AD2(70.5)', 'AD2', 'AD3', 'AD3A', 'AD3A(70.5)', 'AD4', 'AD4B', 'AD6', 'AK2B', 'AK2U', 'AK3B', 'AK3U', 'AN1U', 'AO1H', 'AO1U', 'AO2B', 'AO2U', 'AO3B', 'AO3U', 'AO4B', 'AO4B2', 'AO5S', 'AS1H', 'AS1U', 'AS2B', 'AS2B(70.5)', 'AS2U', 'AS3B', 'AS3U'].map(name => ({
        id: `i-${name}`,
        sku: name,
        name: name,
        quantity: 0,
        unit: '個',
        category: '牆櫃',
        attribute: getProductLabel(name) as any,
        dimensions: { h: 0, w: 0, d: 0 },
        weight: 0,
        volume: 0
      })),
      // 其他鐵櫃
      ...['訂做', 'CB2(70.5)', 'CB2', 'CB3', 'CB4', 'CT2(70.5)', 'CT2', 'CT3', 'CT4', 'DU11809M', 'DU118G', 'DU118M', 'DU8809M', 'DU88G', 'DU88M', 'KG118', 'KG88', 'KS118', 'KS88', 'R3M106', 'R3M180', '3M2T', 'R3M74', 'R3M90', '3M3T', '6M2T', '6M4T', '4M106G', 'R4M106', '4M106S', '4M2T', '4M74G', 'R4M74', '4M74S', 'R4M90', '4M3T', 'TaMh', 'TaS', 'TaL2T', 'TaL3T', 'TaMs'].map(name => ({
        id: `i-${name}`,
        sku: name,
        name: name,
        quantity: 0,
        unit: '個',
        category: '其他鐵櫃',
        attribute: getProductLabel(name) as any,
        dimensions: { h: 0, w: 0, d: 0 },
        weight: 0,
        volume: 0
      })),
      // 門框 (零件庫存)
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
    ];
  });

  const [doorFrames, setDoorFrames] = useState<DoorFrame[]>(() => {
    const saved = localStorage.getItem('tripflow_doorFrames');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved doorFrames', e);
      }
    }
    return [];
  });
  const doorFramesRef = useRef<DoorFrame[]>([]);
  
  useEffect(() => {
    doorFramesRef.current = doorFrames;
    localStorage.setItem('tripflow_doorFrames', JSON.stringify(doorFrames));
  }, [doorFrames]);

  useEffect(() => {
    localStorage.setItem('tripflow_inventory', JSON.stringify(inventory));
  }, [inventory]);

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('tripflow_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved orders', e);
      }
    }
    return [
      { id: 'o1', orderNumber: 'ORD-2025-001', customerName: '台積中心', status: OrderStatus.PENDING, items: [{ id: 'oi1', inventoryId: 'i1', name: 'US2 桶身', quantity: 30, stackingStatus: '標準' }], createdAt: '2025-05-19', region: '新竹' },
      { id: 'o2', orderNumber: 'ORD-2025-002', customerName: '聯發大樓', status: OrderStatus.PENDING, items: [{ id: 'oi2', inventoryId: 'i2', name: 'AO4B 側板', quantity: 20, stackingStatus: '標準' }], createdAt: '2025-05-20', region: '新竹' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('tripflow_orders', JSON.stringify(orders));
  }, [orders]);

  const [trips, setTrips] = useState<Trip[]>(() => {
    const saved = localStorage.getItem('tripflow_trips');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved trips', e);
      }
    }
    return [
      { id: 't1', tripNumber: 'TRP-001', driverName: '阿豪', status: TripStatus.SCHEDULED, date: '2025-05-20', orderIds: ['o1'], vehicleId: 'v1' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('tripflow_trips', JSON.stringify(trips));
  }, [trips]);

  const [processItems, setProcessItems] = useState<ProcessItem[]>(() => {
    const saved = localStorage.getItem('tripflow_processItems');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error('Failed to parse saved processItems', e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('tripflow_processItems', JSON.stringify(processItems));
  }, [processItems]);
  const syncedProcessItemsRef = useRef<Set<string>>(new Set());
  const isInitialLoadComplete = useRef(false);

  // 用於防止無限同步迴圈的 Ref
  const lastProcessItemsJson = useRef<string>('');
  const lastDoorFramesJson = useRef<string>('');
  const lastOrdersJson = useRef<string>('');
  const lastTripsJson = useRef<string>('');
  const syncTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const [selectedTripId, setSelectedTripId] = useState<string | null>('t1');
  const [inventorySearch, setInventorySearch] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // 定義資料獲取函數
  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (Array.isArray(data)) {
        setInventory(data);
      } else {
        console.error('Inventory data is not an array:', data);
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  }, []);

  const fetchProcessItems = useCallback(async () => {
    try {
      const res = await fetch('/api/process-items');
      const data = await res.json();
      if (Array.isArray(data)) {
        const normalized = data.map((p: any) => ({
          ...p,
          isSyncedToParts: !!p.isSyncedToParts,
          isPreparing: !!p.isPreparing
        }));
        
        const json = JSON.stringify(normalized);
        if (json !== lastProcessItemsJson.current) {
          lastProcessItemsJson.current = json;
          setProcessItems(normalized);
        }
        
        // 更新同步 ID 集合
        const syncedIds = new Set<string>();
        normalized.forEach((item: any) => {
          if (item.section !== 'prep' || item.isSyncedToParts) {
            syncedIds.add(item.id);
          }
        });
        syncedProcessItemsRef.current = syncedIds;
      } else {
        console.error('Process items data is not an array:', data);
      }
    } catch (error) {
      console.error('Failed to fetch process items:', error);
    }
  }, []);

  const fetchDoorFrames = useCallback(async () => {
    try {
      const res = await fetch('/api/door-frames');
      const data = await res.json();
      if (Array.isArray(data)) {
        const json = JSON.stringify(data);
        if (json !== lastDoorFramesJson.current) {
          lastDoorFramesJson.current = json;
          setDoorFrames(data);
        }
      } else {
        console.error('Door frames data is not an array:', data);
      }
    } catch (error) {
      console.error('Failed to fetch door frames:', error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (Array.isArray(data)) {
        const json = JSON.stringify(data);
        if (json !== lastOrdersJson.current) {
          lastOrdersJson.current = json;
          setOrders(data);
        }
      } else {
        console.error('Orders data is not an array:', data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  }, []);

  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch('/api/trips');
      const data = await res.json();
      if (Array.isArray(data)) {
        const json = JSON.stringify(data);
        if (json !== lastTripsJson.current) {
          lastTripsJson.current = json;
          setTrips(data);
        }
      } else {
        console.error('Trips data is not an array:', data);
      }
    } catch (error) {
      console.error('Failed to fetch trips:', error);
    }
  }, []);

  // Socket.io 監聽器
  useEffect(() => {
    const socket = io();

    socket.on('inventory_updated', () => {
      console.log('Inventory updated remotely, re-fetching...');
      fetchInventory();
    });

    socket.on('process_items_updated', () => {
      console.log('Process items updated remotely, re-fetching...');
      fetchProcessItems();
    });

    socket.on('door_frames_updated', () => {
      console.log('Door frames updated remotely, re-fetching...');
      fetchDoorFrames();
    });

    socket.on('orders_updated', () => {
      console.log('Orders updated remotely, re-fetching...');
      fetchOrders();
    });

    socket.on('trips_updated', () => {
      console.log('Trips updated remotely, re-fetching...');
      fetchTrips();
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchInventory, fetchProcessItems, fetchDoorFrames, fetchOrders, fetchTrips]);

  // 從資料庫獲取庫存
  useEffect(() => {
    const fetchAll = async () => {
      try {
        await Promise.all([
          fetchInventory(),
          fetchProcessItems(),
          fetchDoorFrames(),
          fetchOrders(),
          fetchTrips()
        ]);
        isInitialLoadComplete.current = true;
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      }
    };
    fetchAll();
  }, [fetchInventory, fetchProcessItems, fetchDoorFrames, fetchOrders, fetchTrips]);

  // 同步流程管理到資料庫
  useEffect(() => {
    if (!isInitialLoadComplete.current) return;
    
    const json = JSON.stringify(processItems);
    if (json === lastProcessItemsJson.current) return;
    lastProcessItemsJson.current = json;

    clearTimeout(syncTimeoutRef.current['process']);
    syncTimeoutRef.current['process'] = setTimeout(async () => {
      try {
        await fetch('/api/process-items/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: processItems })
        });
      } catch (error) {
        console.error('Failed to sync process items:', error);
      }
    }, 500);
  }, [processItems]);

  // 同步零件管理到資料庫
  useEffect(() => {
    if (!isInitialLoadComplete.current) return;
    
    // 只同步數量大於 0 的項目
    const activeFrames = doorFrames.filter(f => f.quantity > 0);
    const json = JSON.stringify(activeFrames);
    if (json === lastDoorFramesJson.current) return;
    lastDoorFramesJson.current = json;

    clearTimeout(syncTimeoutRef.current['parts']);
    syncTimeoutRef.current['parts'] = setTimeout(async () => {
      try {
        await fetch('/api/door-frames/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: activeFrames })
        });
      } catch (error) {
        console.error('Failed to sync door frames:', error);
      }
    }, 500);
  }, [doorFrames]);

  // 同步訂單管理到資料庫
  useEffect(() => {
    if (!isInitialLoadComplete.current) return;
    
    const json = JSON.stringify(orders);
    if (json === lastOrdersJson.current) return;
    lastOrdersJson.current = json;

    clearTimeout(syncTimeoutRef.current['orders']);
    syncTimeoutRef.current['orders'] = setTimeout(async () => {
      try {
        await fetch('/api/orders/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: orders })
        });
      } catch (error) {
        console.error('Failed to sync orders:', error);
      }
    }, 500);
  }, [orders]);

  // 同步車趟排程到資料庫
  useEffect(() => {
    if (!isInitialLoadComplete.current) return;
    
    const json = JSON.stringify(trips);
    if (json === lastTripsJson.current) return;
    lastTripsJson.current = json;

    clearTimeout(syncTimeoutRef.current['trips']);
    syncTimeoutRef.current['trips'] = setTimeout(async () => {
      try {
        await fetch('/api/trips/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: trips })
        });
      } catch (error) {
        console.error('Failed to sync trips:', error);
      }
    }, 500);
  }, [trips]);

  // 零件堆疊邏輯：自動合併相同 SKU/名稱/分類/階段的項目
  useEffect(() => {
    if (!isInitialLoadComplete.current || doorFrames.length === 0) return;
    
    // 安全檢查：如果項目過多（例如發生無限迴圈），暫時跳過堆疊邏輯以防止瀏覽器當機
    if (doorFrames.length > 5000) {
      console.warn('Door frames count too high (>5000), skipping stacking logic for safety.');
      return;
    }

    const groups: Record<string, DoorFrame[]> = {};
    doorFrames.forEach(f => {
      // 預備組的項目（特別是從流程管理同步過來的）不參與自動合併，以維持 1:1 追蹤
      // 如果有備註，也不參與合併
      const key = (f.section === 'prep' || f.note)
        ? `unique-${f.id}` 
        : `${f.sku}-${f.name}-${f.category}-${f.section}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    
    let hasChanges = false;
    const nextFrames: DoorFrame[] = [];
    const idsToDelete: string[] = [];
    
    Object.values(groups).forEach(group => {
      let finalItem: DoorFrame | null = null;
      if (group.length > 1) {
        hasChanges = true;
        // 合併邏輯
        const merged = { ...group[0] };
        // 確保合併後的項目保留 sourceProcessItemId (如果有的話)
        if (!merged.sourceProcessItemId) {
          const itemWithSource = group.find(f => f.sourceProcessItemId);
          if (itemWithSource) merged.sourceProcessItemId = itemWithSource.sourceProcessItemId;
        }
        
        for (let i = 1; i < group.length; i++) {
          const f = group[i];
          merged.quantity += f.quantity;
          idsToDelete.push(f.id);
          if (f.note && !merged.note?.includes(f.note)) {
            merged.note = merged.note ? `${merged.note}; ${f.note}` : f.note;
          }
          if (f.targetDate && (!merged.targetDate || f.targetDate < merged.targetDate)) {
            merged.targetDate = f.targetDate;
          }
        }
        merged.formula = merged.quantity.toString();
        finalItem = merged;
      } else {
        finalItem = group[0];
      }

      if (finalItem && finalItem.quantity > 0) {
        nextFrames.push(finalItem);
      } else if (finalItem) {
        hasChanges = true;
        idsToDelete.push(finalItem.id);
      }
    });
    
    if (hasChanges) {
      setDoorFrames(nextFrames);
      // 註：不再需要個別呼叫 DELETE，因為 door-frames/sync 路由會自動處理不在清單中的項目
    }
  }, [doorFrames]);

  // 28天自動刪除邏輯 (流程管理) 與 90天自動刪除邏輯 (訂單與車趟)
  useEffect(() => {
    const today = new Date();
    
    // 流程管理清理
    setProcessItems(prev => {
      return prev.filter(item => {
        if (item.section !== 'completed' || !item.createdAt) return true;
        const createdDate = new Date(item.createdAt);
        const diffTime = Math.abs(today.getTime() - createdDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 28;
      });
    });

    // 訂單清理 (已送達且超過 90 天)
    setOrders(prev => {
      return prev.filter(order => {
        if (order.status !== OrderStatus.DELIVERED || !order.createdAt) return true;
        const createdDate = new Date(order.createdAt);
        const diffTime = Math.abs(today.getTime() - createdDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 90;
      });
    });

    // 車趟清理 (已完成且超過 90 天)
    setTrips(prev => {
      return prev.filter(trip => {
        if (trip.status !== TripStatus.COMPLETED || !trip.date) return true;
        const tripDate = new Date(trip.date);
        const diffTime = Math.abs(today.getTime() - tripDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 90;
      });
    });
  }, []);

  const currentTrip = useMemo(() => trips.find(t => t.id === selectedTripId), [trips, selectedTripId]);
  const currentVehicle: VehicleProfile = { id: 'v1', driverName: '阿豪', plateNumber: 'HA-8888', maxVolume: 62.35, dimensions: { l: 855, w: 255, h: 286 } };
  const tripOrders = useMemo(() => orders.filter(o => currentTrip?.orderIds.includes(o.id)), [orders, currentTrip]);
  const currentVolume = useMemo(() => tripOrders.reduce((acc, o) => acc + o.items.reduce((sum, i) => sum + (i.quantity * (inventory.find(inv => inv.id === i.inventoryId)?.volume || 0)), 0), 0), [tripOrders, inventory]);

  const handleUpdateStock = async (id: string, delta: number) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta), updatedAt: new Date().toISOString() } : i));
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
    const newItem = { ...item, id: `i${Date.now()}`, updatedAt: new Date().toISOString() };
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
    const itemWithTime = { ...item, updatedAt: new Date().toISOString() };
    setInventory(prev => prev.map(i => i.id === item.id ? itemWithTime : i));
    try {
      await fetch('/api/inventory/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [itemWithTime] })
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
    setProcessItems(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      // 為所有改變的項目更新時間戳
      return next.map(item => {
        const oldItem = prev.find(p => p.id === item.id);
        if (JSON.stringify(oldItem) !== JSON.stringify(item)) {
          return { ...item, updatedAt: new Date().toISOString() };
        }
        return item;
      });
    });
  };

  const handleClearPrepFrames = async () => {
    try {
      await fetch('/api/door-frames/clear-prep', { method: 'POST' });
      setDoorFrames(prev => prev.filter(df => df.section !== 'prep'));
    } catch (error) {
      console.error('Failed to clear prep frames:', error);
    }
  };

  const handleDeleteProcessItem = async (id: string) => {
    // 1. 刪除流程項目
    setProcessItems(prev => prev.filter(i => i.id !== id));
    
    // 2. 同步刪除零件管理中對應的卡片 (僅限還在預備組 'prep' 的卡片)
    setDoorFrames(prev => prev.filter(df => 
      !(df.sourceProcessItemId === id && df.section === 'prep')
    ));
    syncedProcessItemsRef.current.delete(id);
    
    try {
      // 3. 呼叫後端刪除流程項目
      await fetch(`/api/process-items/${id}`, { method: 'DELETE' });
      
      // 4. 呼叫後端刪除對應的零件卡片
      await fetch(`/api/door-frames/source/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete process item or synced frames:', error);
    }
  };

  // 自動同步流程管理到零件管理 (僅限新增對應貨品：加框與抽屜)
  useEffect(() => {
    if (!isInitialLoadComplete.current) return;
    
    let hasNewParts = false;
    const newParts: DoorFrame[] = [];
    const newlySyncedIds: string[] = [];

    processItems.forEach(item => {
      const label = getProductLabel(item.name);
      // 僅限「加框」與「抽屜」貨品
      if (label === '加框' || label === '抽屜') {
        const isAlreadySynced = syncedProcessItemsRef.current.has(item.id) || !!item.isSyncedToParts;
        
        // 額外檢查：如果 doorFrames 中已經存在該來源 ID 的項目，也視為已同步
        const existsInFrames = doorFramesRef.current.some(df => df.sourceProcessItemId === item.id);
        
        // 如果是新項目且在預備組，則新增
        if (item.section === 'prep' && !isAlreadySynced && !existsInFrames) {
          const invItem = inventory.find(i => i.id === item.inventoryId);
          const newPart: DoorFrame = {
            id: `df-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
            sourceProcessItemId: item.id,
            note: item.note
          };
          newParts.push(newPart);
          syncedProcessItemsRef.current.add(item.id);
          newlySyncedIds.push(item.id);
          hasNewParts = true;
        } else if (!item.isSyncedToParts && (isAlreadySynced || existsInFrames)) {
          // 如果還沒標記為 synced，補標記
          newlySyncedIds.push(item.id);
        }
      }
    });

    if (hasNewParts || newlySyncedIds.length > 0) {
      if (newlySyncedIds.length > 0) {
        setProcessItems(prev => prev.map(p => newlySyncedIds.includes(p.id) ? { ...p, isSyncedToParts: true } : p));
      }

      if (newParts.length > 0) {
        setDoorFrames(current => [...current, ...newParts]);
      }
    }
  }, [processItems, inventory]);

  const handleProcessMove = (id: string, moveQty: number) => {
    setProcessItems(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;

      // 如果處於「備貨中」，禁止進入下一階段
      if (item.isPreparing) {
        alert('該貨品目前處於「備貨中」，無法轉移至下一階段。請先確認門框零件庫存。');
        return prev;
      }
      
      let nextSection: ProcessSection = 'shell';
      if (item.section === 'prep') nextSection = 'shell';
      else if (item.section === 'shell') nextSection = 'packaging';
      else if (item.section === 'packaging') nextSection = 'completed'; // 內部流轉至 hidden section

      const today = new Date().toISOString().split('T')[0];
      const isFullMove = moveQty === item.quantity;
      
      const newItem: ProcessItem = { 
        ...item, 
        id: isFullMove ? item.id : `pi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
        section: nextSection, 
        quantity: moveQty,
        formula: moveQty.toString(),
        createdAt: (nextSection === 'completed' || nextSection === 'packaging') ? today : undefined,
        updatedAt: new Date().toISOString()
      };
      
      const remainingQty = Math.max(0, item.quantity - moveQty);

      if (remainingQty === 0) {
        // 全量轉移，直接更新該項目的 section，不刪除舊 ID
        return prev.map(i => i.id === id ? newItem : i);
      } else {
        // 部分轉移，保留原項目並新增一個新 ID 的項目
        return prev.map(i => i.id === id ? { ...i, quantity: remainingQty, formula: remainingQty.toString(), updatedAt: new Date().toISOString() } : i).concat(newItem);
      }
    });
  };

  // 自動取消「備貨中」狀態：當門框庫存更新且足以供應預備組需求時
  useEffect(() => {
    if (!isInitialLoadComplete.current) return;

    const itemsToDeduct: { inventoryId: string, quantity: number }[] = [];

    setProcessItems(prev => {
      let hasChanges = false;
      const next = prev.map(item => {
        // 只針對「預備組」且標記為「備貨中」的項目
        if (item.section === 'prep' && item.isPreparing) {
          const label = getProductLabel(item.name);
          if (label === '加框') {
            const invItem = inventory.find(i => i.id === item.inventoryId);
            if (invItem) {
              // 尋找對應的門框零件庫存
              const dfItem = inventory.find(i => i.sku === invItem.sku && i.category === '門框');
              // 如果庫存大於等於需求量，自動取消備貨中並準備扣除庫存
              if (dfItem && dfItem.quantity >= item.quantity) {
                hasChanges = true;
                itemsToDeduct.push({ inventoryId: dfItem.id, quantity: item.quantity });
                return { ...item, isPreparing: false };
              }
            }
          }
        }
        return item;
      });

      return hasChanges ? next : prev;
    });

    // 處理剛轉為正常的項目庫存扣除
    if (itemsToDeduct.length > 0) {
      setInventory(prevInv => {
        let nextInv = [...prevInv];
        itemsToDeduct.forEach(deduction => {
          const target = nextInv.find(i => i.id === deduction.inventoryId);
          if (target) {
            // 發送 API 請求更新資料庫
            fetch('/api/inventory/update-stock', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ inventoryId: target.id, quantityChange: -deduction.quantity })
            }).catch(err => console.error('Failed to update door frame stock on transition:', err));
            
            nextInv = nextInv.map(i => i.id === target.id ? { ...i, quantity: Math.max(0, i.quantity - deduction.quantity) } : i);
          }
        });
        return nextInv;
      });
    }
  }, [inventory]);

  const handleAddProcessItem = (item: Omit<ProcessItem, 'id'>) => {
    const id = `pi-${Date.now()}`;
    const newItem = { ...item, id, updatedAt: new Date().toISOString() };
    
    setProcessItems(prev => [...prev, newItem]);

    // 如果是「加框」貨品且加入「預備組」，且「不是備貨中」，扣掉「門框」類別的庫存
    if (item.section === 'prep' && !item.isPreparing) {
      const label = getProductLabel(item.name);
      if (label === '加框') {
        setInventory(prevInv => {
          const invItem = prevInv.find(i => i.id === item.inventoryId);
          if (invItem) {
            const dfItem = prevInv.find(i => i.sku === invItem.sku && i.category === '門框');
            if (dfItem) {
              // 發送 API 請求更新資料庫
              fetch('/api/inventory/update-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inventoryId: dfItem.id, quantityChange: -item.quantity })
              }).catch(err => console.error('Failed to update door frame stock:', err));
              
              // 更新本地狀態
              return prevInv.map(i => i.id === dfItem.id ? { ...i, quantity: Math.max(0, i.quantity - item.quantity) } : i);
            }
          }
          return prevInv;
        });
      }
    }
  };

  const handleInventoryPut = (id: string, qty: number) => {
    const item = processItems.find(i => i.id === id);
    if (!item) {
      console.error('Item not found in processItems:', id);
      return;
    }

    console.log('Handling inventory put for:', item.name, 'qty:', qty);

    // 1. 更新櫃子庫存
    handleUpdateStock(item.inventoryId, qty);
    
    // 2. 取消在此處扣除門框數量，已改為在預備組新增時扣除

    const today = new Date().toISOString().split('T')[0];

    setProcessItems(prev => {
      const currentItem = prev.find(i => i.id === id);
      if (!currentItem) return prev;
      
      const isFullPut = qty === currentItem.quantity;
      const newItem: ProcessItem = { 
        ...currentItem, 
        id: isFullPut ? currentItem.id : `pi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
        section: 'completed' as ProcessSection, 
        quantity: qty,
        createdAt: today,
        updatedAt: new Date().toISOString()
      };
      
      const remainingQty = Math.max(0, currentItem.quantity - qty);

      if (remainingQty === 0) {
        // 全量完成，直接更新該項目的 section
        return prev.map(i => i.id === id ? newItem : i);
      } else {
        // 部分完成，保留原項目並新增一個新 ID 的項目
        return prev.map(i => i.id === id ? { ...i, quantity: remainingQty, formula: remainingQty.toString(), updatedAt: new Date().toISOString() } : i).concat(newItem);
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
    
    // 1. 更新庫存管理中的數量 (抽屜成品不入庫)
    if (frame.category !== 'drawer') {
      setInventory(prev => {
        const existingItem = prev.find(i => i.sku === frame.sku && i.category === targetCategory);
        if (existingItem) {
          targetId = existingItem.id;
          const updatedItem = { ...existingItem, quantity: existingItem.quantity + qty, updatedAt: new Date().toISOString() };
          return prev.map(i => i.id === existingItem.id ? updatedItem : i);
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
            volume: (frame.dimensions.h * frame.dimensions.w * frame.dimensions.d) / 1000000000,
            updatedAt: new Date().toISOString()
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
    }

    // 2. 更新零件管理中的數量 (移除已入庫或已完成的零件)
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
              onAddItem={handleAddProcessItem}
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
                const id = `df-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                setDoorFrames(prev => [...prev, { ...f, id, section: 'prep' }]);
              }}
              onUpdate={(f) => setDoorFrames(prev => prev.map(df => df.id === f.id ? f : df))}
              onDelete={(id) => {
                fetch(`/api/door-frames/${id}`, { method: 'DELETE' }).catch(err => console.error(err));
                setDoorFrames(prev => prev.filter(df => df.id !== id));
              }}
              onQuickUpdate={(id, delta) => setDoorFrames(prev => prev.map(df => df.id === id ? { ...df, quantity: Math.max(0, df.quantity + delta) } : df))}
              onMovePart={handlePartMove}
              onInventoryPut={handlePartToInventory}
              onDeleteAll={handleClearPrepFrames}
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
