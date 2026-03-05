
import React from 'react';
import { Trip } from '../types';

interface Props {
  date: Date;
  onChangeDate: (d: Date) => void;
  trips: Trip[];
  onAddTrip: (date: string) => void;
  onSelectTrip: (id: string) => void;
}

export const TripsView: React.FC<Props> = ({ date, onChangeDate, trips, onAddTrip, onSelectTrip }) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = new Intl.DateTimeFormat('zh-TW', { month: 'long', year: 'numeric' }).format(date);

  const grid = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between bg-slate-900 p-6 rounded-[32px] border border-slate-800 shadow-sm">
        <h3 className="text-xl font-black text-white">{monthName}</h3>
        <div className="flex gap-2">
          <button onClick={() => onChangeDate(new Date(year, month - 1, 1))} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button onClick={() => onChangeDate(new Date(year, month + 1, 1))} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[40px] border border-slate-800 overflow-hidden grid grid-cols-7">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d} className="py-4 text-center text-[10px] font-black text-slate-500 uppercase bg-slate-800/50">{d}</div>
        ))}
        {grid.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="bg-slate-950/30 border-b border-r border-slate-800"></div>;
          const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const dayTrips = trips.filter(t => t.date === dateStr);
          
          return (
            <div 
              key={day} 
              onClick={() => onAddTrip(dateStr)}
              className="p-4 border-b border-r border-slate-800 hover:bg-slate-800/30 min-h-[140px] cursor-pointer transition-all"
            >
              <span className="text-sm font-black text-slate-600">{day}</span>
              <div className="mt-2 space-y-1">
                {dayTrips.map(t => (
                  <div key={t.id} onClick={(e) => { e.stopPropagation(); onSelectTrip(t.id); }} className="text-[9px] bg-blue-600/20 text-blue-400 border border-blue-600/30 p-1.5 rounded-lg truncate font-bold">
                    {t.driverName} - {t.tripNumber}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
