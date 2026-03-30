import React, { useEffect, useState } from 'react';
import { getLogs } from '../lib/localStore';
import { motion } from 'motion/react';
import { Users, Activity, Heart, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { TrainingLog } from '../types';

export default function FamilySync() {
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const localLogs = getLogs().slice(-20).reverse() as TrainingLog[];
    setLogs(localLogs);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#5A5A40]/20 border-t-[#5A5A40] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-3xl font-bold text-[#5A5A40]">Family Sync</h2>
          <p className="text-gray-500 italic text-lg">Real-time training updates from the family.</p>
        </div>
        <div className="w-14 h-14 bg-[#5A5A40]/5 rounded-full flex items-center justify-center text-[#5A5A40]">
          <Users size={28} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {logs.length === 0 ? (
          <div className="bg-white rounded-[32px] p-12 text-center border border-dashed border-gray-200">
            <Users className="mx-auto text-gray-200 mb-4" size={48} />
            <p className="text-gray-400 text-lg font-serif italic">No training logs shared yet.</p>
          </div>
        ) : (
          logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-[32px] p-6 shadow-sm border border-[#5A5A40]/5 flex flex-col sm:flex-row gap-6 items-start sm:items-center"
            >
              {/* User Avatar */}
              <div className="w-16 h-16 bg-[#f5f5f0] rounded-2xl flex items-center justify-center text-[#5A5A40] shrink-0 overflow-hidden">
                {log.userPhoto ? (
                  <img src={log.userPhoto} alt={log.userName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Activity size={32} />
                )}
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-bold text-[#1a1a1a]">{log.userName || 'Pilgrim'}</h4>
                    <div className="flex items-center gap-2 text-gray-400 text-sm font-medium uppercase tracking-widest">
                      <Calendar size={14} /> {log.date}
                    </div>
                  </div>
                  <div className="bg-green-50 text-green-700 px-4 py-1 rounded-full text-sm font-bold">
                    Completed
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Distance</span>
                    <p className="text-lg font-bold text-[#5A5A40]">{log.distance} mi</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Speed</span>
                    <p className="text-lg font-bold text-[#5A5A40]">{log.speed || '--'} mph</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Heart Rate</span>
                    <p className="text-lg font-bold text-[#5A5A40]">{log.heartRate || '--'} bpm</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Weight</span>
                    <p className="text-lg font-bold text-[#5A5A40]">{log.weight || '--'} lbs</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
