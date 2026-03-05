
import React from 'react';
import { Order } from '../types';
import { Icons } from '../constants';

interface Props {
  orders: Order[];
  onAddOrder: () => void;
}

export const OrdersView: React.FC<Props> = ({ orders, onAddOrder }) => (
  <div className="space-y-6 animate-in fade-in">
    <div className="flex items-center justify-between bg-slate-900 p-6 rounded-[32px] border border-slate-800 shadow-sm">
      <h3 className="text-xl font-black text-white">活躍訂單池</h3>
      <button onClick={onAddOrder} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center gap-2">
        <Icons.Plus /> 新增訂單
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {orders.map(order => (
        <div key={order.id} className="p-6 rounded-[32px] border-2 bg-slate-900 border-slate-800 hover:border-blue-500/30 transition-all flex flex-col group">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-black text-white text-lg leading-tight group-hover:text-blue-400 transition-colors">{order.customerName}</h4>
            <span className="bg-slate-950 text-slate-400 px-3 py-1 rounded-full text-[10px] font-black border border-slate-800">
              {order.status}
            </span>
          </div>
          <div className="space-y-2 mb-6 flex-1">
            {order.items.map(i => (
              <div key={i.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300">{i.name}</span>
                <span className="text-xs font-black text-blue-500">x{i.quantity}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[10px] font-black">
             <span className="text-slate-600 uppercase tracking-widest">{order.orderNumber}</span>
             <span className="text-blue-600">{order.region}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);
