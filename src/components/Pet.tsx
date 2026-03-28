import React, { useState } from 'react';
import { Pet as PetType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Utensils, Droplets, Smile, Activity, Sparkles } from 'lucide-react';

interface PetProps {
  pet: PetType;
  onInteract?: (type: 'feed' | 'clean' | 'play' | 'heal') => void;
}

export default function Pet({ pet, onInteract }: PetProps) {
  const [lastAction, setLastAction] = useState<string | null>(null);

  const getPetImage = () => {
    switch (pet.type) {
      case 'cat': return 'https://picsum.photos/seed/cat/300/300';
      case 'dog': return 'https://picsum.photos/seed/dog/300/300';
      case 'dino': return 'https://picsum.photos/seed/dino/300/300';
      case 'elf': return 'https://picsum.photos/seed/elf/300/300';
      default: return 'https://picsum.photos/seed/pet/300/300';
    }
  };

  const handleAction = (type: 'feed' | 'clean' | 'play' | 'heal') => {
    setLastAction(type);
    onInteract?.(type);
    setTimeout(() => setLastAction(null), 2000);
  };

  const StatusBadge = ({ icon: Icon, value = 0, label, color }: any) => {
    const safeValue = isNaN(Number(value)) ? 0 : Math.min(100, Math.max(0, Number(value)));
    return (
      <div className="flex flex-col items-center gap-1">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color} shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className={`h-full ${color}`} 
            style={{ width: `${safeValue}%` }} 
          />
        </div>
        <span className="text-[10px] font-bold text-gray-500 uppercase">{label}</span>
      </div>
    );
  };

  return (
    <div className="w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-orange-100">
      <div className="relative h-64 bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-8">
        <AnimatePresence>
          {lastAction && (
            <motion.div
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -100, scale: 1.5 }}
              exit={{ opacity: 0 }}
              className="absolute z-10 pointer-events-none"
            >
              {lastAction === 'feed' && <Utensils className="w-12 h-12 text-orange-500" />}
              {lastAction === 'clean' && <Droplets className="w-12 h-12 text-blue-500" />}
              {lastAction === 'play' && <Smile className="w-12 h-12 text-yellow-500" />}
              {lastAction === 'heal' && <Heart className="w-12 h-12 text-red-500" />}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={lastAction ? {
            scale: [1, 1.2, 1],
            rotate: [0, -10, 10, 0]
          } : { 
            y: [0, -10, 0],
            scale: [1, 1.05, 1]
          }}
          transition={lastAction ? { duration: 0.5 } : { 
            duration: 4, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          <img 
            src={getPetImage()} 
            alt={pet.name} 
            className="w-48 h-48 rounded-full object-cover border-8 border-white shadow-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -bottom-2 -right-2 bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-black shadow-lg flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            LV.{pet.level}
          </div>
        </motion.div>
        
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <h2 className="text-2xl font-black text-orange-900">{pet.name}</h2>
          <div className="flex items-center gap-1 bg-white/80 backdrop-blur px-2 py-1 rounded-lg border border-orange-100">
            <Activity className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] font-bold text-orange-700">成长值: {pet.growth}/100</span>
          </div>
        </div>
      </div>

      <div className="p-6 bg-white">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatusBadge icon={Utensils} value={pet.hunger} label="饥饿" color="bg-orange-500" />
          <StatusBadge icon={Droplets} value={pet.cleanliness} label="清洁" color="bg-blue-500" />
          <StatusBadge icon={Smile} value={pet.happiness} label="心情" color="bg-yellow-500" />
          <StatusBadge icon={Heart} value={pet.health} label="健康" color="bg-red-500" />
        </div>

        {onInteract && (
          <div className="grid grid-cols-4 gap-3">
            <button 
              onClick={() => handleAction('feed')}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-orange-50 hover:bg-orange-100 transition-colors group active:scale-95"
            >
              <Utensils className="w-6 h-6 text-orange-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-orange-900">喂食</span>
            </button>
            <button 
              onClick={() => handleAction('clean')}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors group active:scale-95"
            >
              <Droplets className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-blue-900">洗澡</span>
            </button>
            <button 
              onClick={() => handleAction('play')}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-yellow-50 hover:bg-yellow-100 transition-colors group active:scale-95"
            >
              <Smile className="w-6 h-6 text-yellow-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-yellow-900">玩耍</span>
            </button>
            <button 
              onClick={() => handleAction('heal')}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-red-50 hover:bg-red-100 transition-colors group active:scale-95"
            >
              <Heart className="w-6 h-6 text-red-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-red-900">看病</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
