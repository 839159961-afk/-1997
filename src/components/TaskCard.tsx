import React from 'react';
import { Task, CheckinStatus } from '../types';
import { motion } from 'motion/react';
import { Coins, Banknote, Calendar, CheckCircle2, Clock, XCircle, Trash2 } from 'lucide-react';

interface TaskCardProps {
  key?: React.Key;
  task: Task;
  status?: CheckinStatus;
  onCheckin?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
  isParent?: boolean;
}

export default function TaskCard({ task, status, onCheckin, onApprove, onReject, onDelete, isParent }: TaskCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'rejected': return <XCircle className="w-6 h-6 text-red-500" />;
      case 'pending': return <Clock className="w-6 h-6 text-yellow-500" />;
      default: return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'approved': return '已完成';
      case 'rejected': return '未通过';
      case 'pending': return '待审核';
      default: return '进行中';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100 flex items-center justify-between gap-4"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
            {task.type}
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {task.ageGroup}岁
          </span>
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">{task.title}</h3>
        <p className="text-xs text-gray-500 line-clamp-1 mb-2">{task.description}</p>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs font-bold text-gray-700">+{task.coins}</span>
          </div>
          <div className="flex items-center gap-1">
            <Banknote className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-bold text-gray-700">¥{task.money}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        {status ? (
          <div className="flex flex-col items-center gap-1">
            {getStatusIcon()}
            <span className="text-[10px] font-bold text-gray-400">{getStatusText()}</span>
          </div>
        ) : isParent ? (
          <div className="flex gap-2">
            {onApprove && onReject ? (
              <>
                <button
                  onClick={onReject}
                  className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
                <button
                  onClick={onApprove}
                  className="p-2 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </>
            ) : onDelete ? (
              <button
                onClick={onDelete}
                className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                title="删除任务"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            ) : null}
          </div>
        ) : onCheckin ? (
          <button
            onClick={onCheckin}
            className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 shadow-md shadow-orange-100"
          >
            去打卡
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
