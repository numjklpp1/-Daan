
export enum OrderStatus {
  PENDING = '待處理',
  LOADING = '裝車中',
  IN_TRANSIT = '配送中',
  DELIVERED = '已送達',
  CANCELLED = '已取消'
}

export enum TripStatus {
  SCHEDULED = '已排程',
  LOADING = '裝載中',
  DEPARTED = '已出發',
  COMPLETED = '已完成'
}

export type StackingItemStatus = '標準' | '優先' | '淘汰';

export type ProcessSection = 'prep' | 'shell' | 'packaging' | 'completed';

export interface ProcessItem {
  id: string;
  inventoryId: string;
  name: string;
  quantity: number;
  section: ProcessSection;
  note?: string;
  formula?: string;
  isPreparing?: boolean;
  createdAt?: string; // 格式: YYYY-MM-DD
  targetDate?: string; // 格式: YYYY-MM-DD
  isSyncedToParts?: boolean;
}

export interface Company {
  id: string;
  name: string;
  address: string;
  city: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  attribute?: '抽屜' | '加框';
  volume?: number; // 材積 (立方米)
  dimensions: {
    h: number;
    w: number;
    d: number;
  };
  weight: number;
}

export type DoorFrameSection = 'prep' | 'done' | 'stock';

export interface DoorFrame {
  id: string;
  sku: string;
  name: string;
  category: 'door' | 'drawer';
  section: DoorFrameSection;
  material: '木質' | '鋁製' | '鋼製' | '其他';
  direction: '左開' | '右開' | '雙開';
  color: string;
  quantity: number;
  note?: string;
  formula?: string;
  isPreparing?: boolean;
  createdAt?: string;
  targetDate?: string;
  sourceProcessItemId?: string;
  dimensions: {
    h: number;
    w: number;
    d: number;
  };
}

export interface OrderItem {
  id: string;
  inventoryId: string;
  name: string;
  quantity: number;
  stackingStatus?: StackingItemStatus;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  items: OrderItem[];
  tripId?: string;
  createdAt: string;
  region?: string;
}

export interface VehicleProfile {
  id: string;
  driverName: string;
  plateNumber: string;
  maxVolume: number;
  dimensions: { l: number; w: number; h: number };
}

export interface Trip {
  id: string;
  tripNumber: string;
  driverName: string;
  vehiclePlate?: string;
  status: TripStatus;
  date: string;
  orderIds: string[];
  vehicleId?: string;
}

export type ViewType = 'dashboard' | 'inventory' | 'orders' | 'trips' | 'stacking' | 'process' | 'parts';

export type PartsSection = 
  | 'door-all' | 'door-prep' | 'door-done' | 'door-stock'
  | 'drawer-all' | 'drawer-prep' | 'drawer-done' | 'drawer-stock';
