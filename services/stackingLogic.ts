
import { Order, InventoryItem, VehicleProfile, StackingItemStatus } from '../types';

/**
 * 疊貨計算結果介面
 */
export interface StackingResult {
  updatedOrders: Order[];
  excessOrders: string[];
  totalVolume: number;
  message: string;
  type: 'success' | 'warning';
}

/**
 * 執行疊貨空間排列計算 (3D Row-based Packing Simulation)
 */
export const calculateStacking = (
  vehicle: VehicleProfile,
  tripOrders: Order[],
  inventory: InventoryItem[]
): StackingResult => {
  const vL = vehicle.dimensions.l;
  const vW = vehicle.dimensions.w;
  const vH = vehicle.dimensions.h;

  // 1. 平坦化所有品項並附加尺寸與體積資訊
  const itemsWith3D = tripOrders.flatMap(o => o.items.map(i => {
    const inv = inventory.find(invItem => invItem.id === i.inventoryId);
    return {
      ...i,
      orderId: o.id,
      orderName: o.customerName,
      h: (inv?.dimensions.h || 0) / 10, // 轉為 cm 運算
      w: (inv?.dimensions.w || 0) / 10,
      d: (inv?.dimensions.d || 0) / 10,
      unitVolume: inv?.volume || 0,
      totalVol: i.quantity * (inv?.volume || 0)
    };
  }));

  // 2. 排序策略：優先級 > 體積大小
  const sortedItems = [...itemsWith3D].sort((a, b) => {
    if (a.stackingStatus === '優先' && b.stackingStatus !== '優先') return -1;
    if (a.stackingStatus !== '優先' && b.stackingStatus === '優先') return 1;
    return b.totalVol - a.totalVol;
  });

  // 3. 模擬排列變數
  let totalUsedLength = 0;
  let currentRowWidth = 0;
  let currentRowMaxDepth = 0;
  let totalVolumeCount = 0;
  const itemUpdates: { orderId: string, itemId: string, status: StackingItemStatus }[] = [];
  const excessOrderNames: string[] = [];

  // 4. 開始掃描品項並模擬擺放位置
  sortedItems.forEach(item => {
    let canFit = true;

    // 單體過大檢查
    if (item.h > vH || item.w > vW || item.d > vL) {
      canFit = false;
    } else {
      // 逐個數量模擬 (簡化版：假設同品項放一起)
      for (let q = 0; q < item.quantity; q++) {
        if (currentRowWidth + item.w <= vW) {
          // 寬度夠，放在同一橫列
          currentRowWidth += item.w;
          currentRowMaxDepth = Math.max(currentRowMaxDepth, item.d);
        } else {
          // 寬度不夠，換下一列（增加深度）
          totalUsedLength += currentRowMaxDepth;
          currentRowWidth = item.w;
          currentRowMaxDepth = item.d;
        }

        // 檢查總深度是否超出車斗長度
        if (totalUsedLength + currentRowMaxDepth > vL) {
          canFit = false;
          break;
        }
      }
    }

    if (canFit) {
      itemUpdates.push({ 
        orderId: item.orderId, 
        itemId: item.id, 
        status: item.stackingStatus === '優先' ? '優先' : '標準' 
      });
      totalVolumeCount += item.totalVol;
    } else {
      itemUpdates.push({ 
        orderId: item.orderId, 
        itemId: item.id, 
        status: '淘汰' 
      });
      if (!excessOrderNames.includes(item.orderName)) excessOrderNames.push(item.orderName);
    }
  });

  // 5. 構造更新後的訂單列表 (Immutable)
  const updatedOrders = tripOrders.map(o => {
    const updates = itemUpdates.filter(upd => upd.orderId === o.id);
    if (updates.length === 0) return o;
    return {
      ...o,
      items: o.items.map(i => {
        const match = updates.find(u => u.itemId === i.id);
        return match ? { ...i, stackingStatus: match.status } : i;
      })
    };
  });

  return {
    updatedOrders,
    excessOrders: excessOrderNames,
    totalVolume: totalVolumeCount,
    message: excessOrderNames.length > 0 
      ? `計算完成！考量實體形狀與排列，部分品項無法裝入。` 
      : '3D 空間排列模擬成功，全數可裝載！',
    type: excessOrderNames.length > 0 ? 'warning' : 'success'
  };
};
