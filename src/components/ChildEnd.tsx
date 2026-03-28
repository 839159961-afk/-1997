import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { User, Pet, Task, Checkin } from '../types';
import Layout from './Layout';
import PetCard from './Pet';
import TaskCard from './TaskCard';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, Banknote, Trophy, History, Plus, Camera, Mic, Check, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ChildEndProps {
  user: User;
}

export default function ChildEnd({ user }: ChildEndProps) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [activeTab, setActiveTab] = useState<'pet' | 'tasks' | 'history'>('pet');
  const [showCheckinModal, setShowCheckinModal] = useState<Task | null>(null);
  const [checkinComment, setCheckinComment] = useState('');

  useEffect(() => {
    if (!user.uid) return;

    // Fetch Pet
    const petQuery = query(collection(db, 'pets'), where('ownerId', '==', user.uid));
    const unsubscribePet = onSnapshot(petQuery, (snapshot) => {
      if (!snapshot.empty) {
        setPet({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Pet);
      } else {
        // Create initial pet if none exists
        const newPet: Omit<Pet, 'id'> = {
          ownerId: user.uid,
          type: 'cat',
          name: '小可爱',
          growth: 0,
          hunger: 80,
          cleanliness: 80,
          happiness: 80,
          health: 100,
          level: 1,
        };
        addDoc(collection(db, 'pets'), newPet).catch(err => handleFirestoreError(err, OperationType.CREATE, 'pets'));
      }
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pets'));

    // Fetch Tasks (Parent's tasks)
    let unsubscribeTasks = () => {};
    if (user.parentId) {
      const tasksQuery = query(collection(db, 'tasks'), where('parentId', '==', user.parentId));
      unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));
    }

    // Fetch Checkins
    const checkinsQuery = query(collection(db, 'checkins'), where('childId', '==', user.uid));
    const unsubscribeCheckins = onSnapshot(checkinsQuery, (snapshot) => {
      setCheckins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checkin)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'checkins'));

    // Status Decay Logic (Simulated every 30 seconds)
    const decayPetStatus = async () => {
      if (!pet) return;
      const petRef = doc(db, 'pets', pet.id);
      try {
        await updateDoc(petRef, {
          hunger: Math.max(0, (pet.hunger || 100) - 2),
          cleanliness: Math.max(0, (pet.cleanliness || 100) - 1),
          happiness: Math.max(0, (pet.happiness || 100) - 1),
        });
      } catch (err) {
        console.error('Decay error:', err);
      }
    };
    
    const decayInterval = setInterval(decayPetStatus, 30000);

    return () => {
      unsubscribePet();
      unsubscribeTasks();
      unsubscribeCheckins();
      clearInterval(decayInterval);
    };
  }, [user.uid, user.parentId]);

  const handleInteract = async (type: 'feed' | 'clean' | 'play' | 'heal') => {
    if (!pet) return;
    
    const COST = 5;
    if (user.balance < COST) {
      toast.error('金币不足哦，快去完成任务赚取金币吧！');
      return;
    }

    const petRef = doc(db, 'pets', pet.id);
    const userRef = doc(db, 'users', user.uid);
    const updates: Partial<Pet> = {};
    let message = '';
    
    switch (type) {
      case 'feed': 
        updates.hunger = Math.min(100, (pet.hunger || 0) + 20); 
        message = '真好吃！谢谢小主人！';
        break;
      case 'clean': 
        updates.cleanliness = Math.min(100, (pet.cleanliness || 0) + 20); 
        message = '洗澡澡，真舒服！';
        break;
      case 'play': 
        updates.happiness = Math.min(100, (pet.happiness || 0) + 20); 
        message = '太开心啦！我们再玩一会吧！';
        break;
      case 'heal': 
        updates.health = Math.min(100, (pet.health || 0) + 20); 
        message = '感觉好多了，谢谢你！';
        break;
    }
    
    updates.growth = (pet.growth || 0) + 10;
    let levelUp = false;
    if (updates.growth >= 100) {
      updates.level = (pet.level || 1) + 1;
      updates.growth = updates.growth % 100;
      levelUp = true;
    }

    try {
      await updateDoc(petRef, updates);
      await updateDoc(userRef, {
        balance: user.balance - COST
      });
      
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        amount: -COST,
        type: 'coin',
        description: `照顾宠物：${type === 'feed' ? '喂食' : type === 'clean' ? '洗澡' : type === 'play' ? '玩耍' : '看病'}`,
        timestamp: serverTimestamp(),
      });

      toast.success(message);
      if (levelUp) {
        toast.success(`哇！${pet.name} 升级到 LV.${updates.level} 啦！`, {
          icon: '🎉',
          duration: 5000,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pets/${pet.id}`);
    }
  };

  const handleCheckin = async () => {
    if (!showCheckinModal) return;
    
    const newCheckin: Omit<Checkin, 'id'> = {
      childId: user.uid,
      parentId: user.parentId || '',
      taskId: showCheckinModal.id,
      status: 'pending',
      comment: checkinComment,
      timestamp: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'checkins'), newCheckin);
      setShowCheckinModal(null);
      setCheckinComment('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'checkins');
    }
  };

  const getTaskStatus = (taskId: string) => {
    const checkin = checkins.find(c => c.taskId === taskId);
    return checkin?.status;
  };

  return (
    <Layout 
      title="萌宠养成记" 
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
            <Coins className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs font-black text-yellow-700">{user.balance}</span>
          </div>
          <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
            <Banknote className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-black text-green-700">¥{user.pocketMoney}</span>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex bg-orange-100/50 p-1 rounded-2xl">
          {(['pet', 'tasks', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === tab 
                  ? 'bg-white text-orange-600 shadow-sm' 
                  : 'text-orange-400 hover:text-orange-500'
              }`}
            >
              {tab === 'pet' ? '我的萌宠' : tab === 'tasks' ? '每日任务' : '成长记录'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'pet' && pet && (
            <motion.div
              key="pet"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <PetCard pet={pet} onInteract={handleInteract} />
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">勋章</p>
                    <p className="text-sm font-black text-gray-900">3枚</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <History className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">连续打卡</p>
                    <p className="text-sm font-black text-gray-900">5天</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-black text-gray-900">今日任务</h2>
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                  完成任务赚金币
                </span>
              </div>
              {tasks.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-orange-100">
                  <p className="text-sm text-gray-400 font-medium">爸爸妈妈还没布置任务哦～</p>
                </div>
              ) : (
                tasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    status={getTaskStatus(task.id)}
                    onCheckin={() => setShowCheckinModal(task)}
                  />
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-3"
            >
              <h2 className="text-lg font-black text-gray-900 mb-2">最近动态</h2>
              {checkins.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds).map(checkin => {
                const task = tasks.find(t => t.id === checkin.taskId);
                return (
                  <div key={checkin.id} className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      checkin.status === 'approved' ? 'bg-green-100' : 
                      checkin.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      {checkin.status === 'approved' ? <Check className="w-6 h-6 text-green-600" /> : 
                       checkin.status === 'rejected' ? <Plus className="w-6 h-6 text-red-600 rotate-45" /> : 
                       <Clock className="w-6 h-6 text-yellow-600" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900">{task?.title || '未知任务'}</h4>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {checkin.timestamp?.toDate().toLocaleString() || '刚刚'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                        checkin.status === 'approved' ? 'bg-green-50 text-green-600' : 
                        checkin.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                      }`}>
                        {checkin.status === 'approved' ? '已通过' : 
                         checkin.status === 'rejected' ? '已驳回' : '审核中'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Checkin Modal */}
      <AnimatePresence>
        {showCheckinModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-md bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900">打卡：{showCheckinModal.title}</h3>
                <button onClick={() => setShowCheckinModal(null)} className="text-gray-400 hover:text-gray-600">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-orange-50 border-2 border-orange-100 hover:border-orange-300 transition-all group">
                    <Camera className="w-8 h-8 text-orange-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-orange-900">拍照证明</span>
                  </button>
                  <button className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-blue-50 border-2 border-blue-100 hover:border-blue-300 transition-all group">
                    <Mic className="w-8 h-8 text-blue-600 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold text-blue-900">语音报备</span>
                  </button>
                </div>

                <textarea
                  placeholder="写点什么告诉爸爸妈妈吧..."
                  value={checkinComment}
                  onChange={(e) => setCheckinComment(e.target.value)}
                  className="w-full h-32 bg-gray-50 rounded-2xl p-4 text-sm font-medium border-2 border-transparent focus:border-orange-200 outline-none transition-all resize-none"
                />

                <button
                  onClick={handleCheckin}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-100 transition-all active:scale-95"
                >
                  提交审核
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
