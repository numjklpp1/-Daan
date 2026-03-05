
import React from 'react';
import { Trip, Order, VehicleProfile, InventoryItem, StackingItemStatus } from '../types';
import { Icons } from '../constants';

interface Props {
  currentTrip: Trip | undefined;
  vehicle: VehicleProfile | undefined;
  tripOrders: Order[];
  inventory: InventoryItem[];
  volume: number;
  onCalculate: () => void;
  onAddOrder: () => void;
  onUpdateStatus: (orderId: string, itemId: string, status: StackingItemStatus) => void;
}

export const StackingView: React.FC<Props> = ({ 
  currentTrip, vehicle, tripOrders, inventory, volume, onCalculate, onAddOrder, onUpdateStatus 
}) => {
  if (!currentTrip) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-900/50 border border-slate-800 border-dashed rounded-[40px] m-10 p-20 text-center">
        <div>
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
            <Icons.Truck />
          </div>
          <p className="text-slate-600 font-black uppercase tracking-widest">請從配送排程選取車趟進行疊貨</p>
        </div>
      </div>
    );
  }

  const utilization = Math.min(100, (volume / (vehicle?.maxVolume || 1)) * 100);

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-160px)] animate-in fade-in">
      <div className="bg-black text-white p-6 rounded-[32px] shadow-xl border border-slate-800 flex items-center gap-8">
        <div className="flex-1">
          <p className="text-2xl font-black">{vehicle?.driverName}</p>
          <p className="text-blue-500 font-mono text-xs font-bold tracking-widest">{vehicle?.plateNumber} • {vehicle?.dimensions.l}x{vehicle?.dimensions.w}x{vehicle?.dimensions.h} cm</p>
        </div>
        <div className="w-64">
          <div className="flex justify-between items-center mb-1.5 text-[10px] text-slate-500 font-black">
            <span>容積利用率</span>
            <span>{utilization.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
            <div className={`h-full transition-all ${utilization > 90 ? 'bg-rose-600 animate-pulse' : 'bg-blue-600'}`} style={{ width: `${utilization}%` }}></div>
          </div>
        </div>
        <button onClick={onCalculate} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-500">
          啟動 3D 模擬排列
        </button>
      </div>

      <div className="flex-1 bg-slate-950 rounded-[40px] border border-slate-800 p-8 overflow-hidden flex flex-col shadow-inner">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-lg font-black text-white">裝載清單 (由內而外/由下而上)</h3>
          <button onClick={onAddOrder} className="px-5 py-3 bg-white text-black rounded-2xl text-[10px] font-black uppercase flex items-center gap-2">
            <Icons.Plus /> 加入訂單
          </button>
        </div>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-4 scrollbar-hide pb-10">
          {tripOrders.map((order, idx) => (
            <div key={order.id} className="relative p-6 bg-slate-900 rounded-[32px] border-2 border-slate-800">
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-white text-black rounded-xl flex items-center justify-center font-black text-xs shadow-lg">{idx + 1}</div>
              <h4 className="font-black text-white text-sm mb-4 truncate">{order.customerName}</h4>
              <div className="space-y-2">
                {order.items.map(i => {
                  const inv = inventory.find(invItem => invItem.id === i.inventoryId);
                  return (
                    <div key={i.id} className={`p-3 rounded-2xl border ${i.stackingStatus === '淘汰' ? 'bg-rose-950/20 border-rose-900 opacity-60' : 'bg-slate-950 border-slate-800'}`}>
                      <div className="flex justify-between text-[11px] font-bold text-slate-300">
                        <span>{i.name} x{i.quantity}</span>
                        <span className="text-[9px] text-slate-500">{(inv?.dimensions.w||0)/10}x{(inv?.dimensions.d||0)/10}cm</span>
                      </div>
                      <select 
                        value={i.stackingStatus} 
                        onChange={(e) => onUpdateStatus(order.id, i.id, e.target.value as StackingItemStatus)} 
                        className="w-full mt-2 bg-transparent text-[10px] font-black text-slate-500 outline-none"
                      >
                        <option value="標準">標準</option>
                        <option value="優先">優先</option>
                        <option value="淘汰">裝不下</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
