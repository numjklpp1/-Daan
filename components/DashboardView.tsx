
import React from 'react';
import { InventoryItem, Order, Trip } from '../types';

interface Props {
  orders: Order[];
  trips: Trip[];
  inventory: InventoryItem[];
}

export const DashboardView: React.FC<Props> = ({ orders, trips, inventory }) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 hover:border-blue-500/50 transition-all shadow-xl group">
        <p className="text-sm text-blue-400 font-bold mb-1">待配車訂單</p>
        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-black text-white">{orders.filter(o => !o.tripId).length}</p>
          <span className="text-xs text-slate-500 font-bold">張</span>
        </div>
      </div>
      <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 hover:border-emerald-500/50 transition-all shadow-xl">
        <p className="text-sm text-emerald-400 font-bold mb-1">活躍車趟</p>
        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-black text-white">{trips.length}</p>
          <span className="text-xs text-slate-500 font-bold">趟次</span>
        </div>
      </div>
      <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 hover:border-rose-500/50 transition-all shadow-xl">
        <p className="text-sm text-rose-400 font-bold mb-1">低庫存品項</p>
        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-black text-white">{inventory.filter(i => i.quantity < 20).length}</p>
          <span className="text-xs text-slate-500 font-bold">SKU</span>
        </div>
      </div>
      <div className="p-6 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-500/20">
        <p className="text-sm font-bold text-white/70 mb-1">系統作業效率</p>
        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-black text-white">92%</p>
          <span className="text-xs text-white/50 font-bold">Optimal</span>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-slate-900 rounded-[32px] border border-slate-800 p-8">
        <h3 className="text-lg font-black text-white mb-6">物流建議 (Gemini AI)</h3>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex gap-4 items-start">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 flex-shrink-0">
                AI
              </div>
              <div>
                <p className="text-sm font-bold text-slate-200">建議優化車趟 TRP-001</p>
                <p className="text-xs text-slate-500 mt-1">目前該車趟容積利用率僅 45%，建議合併 ORD-1002 訂單以減少成本。</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
