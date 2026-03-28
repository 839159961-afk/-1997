import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { User, Task, Checkin, Pet } from '../types';
import Layout from './Layout';
import TaskCard from './TaskCard';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Users, Settings, BarChart3, CheckCircle2, XCircle, Clock, Coins, Banknote, ChevronRight, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ParentEndProps {
  user: User;
}

export default function ParentEnd({ user }: ParentEndProps) {
  const [children, setChildren] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pendingCheckins, setPendingCheckins] = useState<Checkin[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'audit' | 'settings'>('overview');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    coins: 10,
    money: 1,
    ageGroup: '3-6',
    type: 'daily',
  });

  useEffect(() => {
    if (!user.uid) return;

    // Fetch Children
    const childrenQuery = query(collection(db, 'users'), where('parentId', '==', user.uid));
    const unsubscribeChildren = onSnapshot(childrenQuery, (snapshot) => {
      setChildren(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    // Fetch Tasks
    const tasksQuery = query(collection(db, 'tasks'), where('parentId', '==', user.uid));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));

    // Fetch Pending Checkins for this parent
    const checkinsQuery = query(
      collection(db, 'checkins'), 
      where('parentId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsubscribeCheckins = onSnapshot(checkinsQuery, (snapshot) => {
      setPendingCheckins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Checkin)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'checkins'));

    return () => {
      unsubscribeChildren();
      unsubscribeTasks();
      unsubscribeCheckins();
    };
  }, [user.uid]);

  const handleCreateTask = async () => {
    if (!newTask.title) return;
    const task: Omit<Task, 'id'> = {
      parentId: user.uid,
      title: newTask.title!,
      description: newTask.description || '',
      coins: newTask.coins || 0,
      money: newTask.money || 0,
      ageGroup: (newTask.ageGroup as any) || '3-6',
      type: (newTask.type as any) || 'daily',
    };
    try {
      await addDoc(collection(db, 'tasks'), task);
      setShowTaskModal(false);
      setNewTask({ title: '', description: '', coins: 10, money: 1, ageGroup: '3-6', type: 'daily' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tasks');
    }
  };

  const handleAudit = async (checkinId: string, status: 'approved' | 'rejected') => {
    try {
      const checkinRef = doc(db, 'checkins', checkinId);
      const checkinSnap = await getDoc(checkinRef);
      if (!checkinSnap.exists()) return;
      const checkin = checkinSnap.data() as Checkin;

      await updateDoc(checkinRef, { status });

      if (status === 'approved') {
        const taskRef = doc(db, 'tasks', checkin.taskId);
        const taskSnap = await getDoc(taskRef);
        if (taskSnap.exists()) {
          const task = taskSnap.data() as Task;
          const childRef = doc(db, 'users', checkin.childId);
          const childSnap = await getDoc(childRef);
          if (childSnap.exists()) {
            const child = childSnap.data() as User;
            await updateDoc(childRef, {
              balance: (child.balance || 0) + task.coins,
              pocketMoney: (child.pocketMoney || 0) + task.money,
            });

            // Also boost pet growth
            const petQuery = query(collection(db, 'pets'), where('ownerId', '==', child.uid));
            const petSnap = await getDocs(petQuery);
            if (!petSnap.empty) {
              const petRef = doc(db, 'pets', petSnap.docs[0].id);
              const pet = petSnap.docs[0].data() as Pet;
              await updateDoc(petRef, {
                growth: Math.min(1000, (pet.growth || 0) + 20),
                happiness: Math.min(100, (pet.happiness || 0) + 10),
              });
            }
          }
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `checkins/${checkinId}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('确定要删除这个任务吗？')) return;
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tasks/${taskId}`);
    }
  };

  const statsData = [
    { name: 'Mon', count: 4 },
    { name: 'Tue', count: 7 },
    { name: 'Wed', count: 5 },
    { name: 'Thu', count: 8 },
    { name: 'Fri', count: 6 },
    { name: 'Sat', count: 12 },
    { name: 'Sun', count: 10 },
  ];

  return (
    <Layout 
      title="家长管理中心" 
      actions={
        <button className="p-2 rounded-full bg-orange-50 text-orange-600">
          <Settings className="w-5 h-5" />
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-3xl text-white shadow-lg shadow-orange-100">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-5 h-5 opacity-80" />
              <span className="text-[10px] font-black uppercase tracking-wider opacity-80">关联儿童</span>
            </div>
            <p className="text-3xl font-black mb-1">{children.length}</p>
            <p className="text-[10px] font-bold opacity-80">当前已绑定子女</p>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">待审核</span>
            </div>
            <p className="text-3xl font-black text-gray-900 mb-1">{pendingCheckins.length}</p>
            <p className="text-[10px] font-bold text-orange-600">需要您处理</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-blue-600 p-6 rounded-[32px] text-white shadow-xl shadow-blue-100 relative overflow-hidden">
          <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">快速添加孩子</p>
              <p className="text-xl font-black">点击右下角按钮直接创建</p>
            </div>
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
          <p className="text-[10px] font-bold mt-4 opacity-80">无需注册，由家长直接为孩子创建登录账号</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-gray-100/50 p-1 rounded-2xl">
          {(['overview', 'tasks', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === tab 
                  ? 'bg-white text-orange-600 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-500'
              }`}
            >
              {tab === 'overview' ? '数据看板' : tab === 'tasks' ? '任务管理' : '审核中心'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-3xl border border-orange-100 shadow-sm">
                <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                  打卡趋势分析
                </h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={statsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="count" stroke="#ea580c" strokeWidth={3} dot={{ fill: '#ea580c', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-black text-gray-900 px-1">我的孩子</h3>
                {children.map(child => (
                  <div key={child.uid} className="bg-white p-4 rounded-2xl border border-orange-100 flex items-center gap-4 shadow-sm group hover:border-orange-200 transition-all">
                    <img 
                      src={child.avatar || 'https://picsum.photos/seed/child/100/100'} 
                      alt={child.displayName} 
                      className="w-12 h-12 rounded-full object-cover border-2 border-orange-50"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900">{child.displayName}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <Coins className="w-3 h-3 text-yellow-500" />
                          <span className="text-[10px] font-bold text-gray-500">{child.balance}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Banknote className="w-3 h-3 text-green-500" />
                          <span className="text-[10px] font-bold text-gray-500">¥{child.pocketMoney}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-400 transition-colors" />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-base font-black text-gray-900">任务列表 ({tasks.length})</h3>
                <button 
                  onClick={() => setShowTaskModal(true)}
                  className="flex items-center gap-1 text-xs font-black text-orange-600 bg-orange-50 px-3 py-1.5 rounded-xl hover:bg-orange-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新增任务
                </button>
              </div>
              {tasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  isParent 
                  onDelete={() => handleDeleteTask(task.id)}
                />
              ))}
            </motion.div>
          )}

          {activeTab === 'audit' && (
            <motion.div
              key="audit"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <h3 className="text-base font-black text-gray-900 px-1">待审核申请 ({pendingCheckins.length})</h3>
              {pendingCheckins.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                  <p className="text-sm text-gray-400 font-medium">暂时没有待处理的打卡～</p>
                </div>
              ) : (
                pendingCheckins.map(checkin => {
                  const task = tasks.find(t => t.id === checkin.taskId);
                  const child = children.find(c => c.uid === checkin.childId);
                  return (
                    <div key={checkin.id} className="bg-white p-4 rounded-3xl border border-orange-100 shadow-sm space-y-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={child?.avatar || 'https://picsum.photos/seed/child/100/100'} 
                          alt="Child" 
                          className="w-10 h-10 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-gray-900">{child?.displayName} 提交了打卡</h4>
                          <p className="text-[10px] text-gray-400 font-medium">{checkin.timestamp?.toDate().toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="bg-orange-50/50 p-4 rounded-2xl">
                        <h5 className="text-sm font-black text-orange-900 mb-1">{task?.title}</h5>
                        <p className="text-xs text-orange-700 italic">"{checkin.comment || '没有留言'}"</p>
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => handleAudit(checkin.id, 'rejected')}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-50 text-red-600 font-black text-xs hover:bg-red-100 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          驳回
                        </button>
                        <button 
                          onClick={() => handleAudit(checkin.id, 'approved')}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-600 text-white font-black text-xs hover:bg-green-700 transition-colors shadow-lg shadow-green-100"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          通过奖励
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Task Creation Modal */}
      <AnimatePresence>
        {showTaskModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-md bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-gray-900">新增习惯任务</h3>
                <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 block">任务名称</label>
                  <input
                    type="text"
                    placeholder="例如：每天刷牙、整理书包"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-orange-200 outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 block">奖励金币</label>
                    <div className="relative">
                      <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />
                      <input
                        type="number"
                        value={newTask.coins}
                        onChange={(e) => setNewTask({ ...newTask, coins: parseInt(e.target.value) })}
                        className="w-full bg-gray-50 rounded-2xl p-4 pl-10 text-sm font-bold border-2 border-transparent focus:border-orange-200 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 block">奖励零花钱 (元)</label>
                    <div className="relative">
                      <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                      <input
                        type="number"
                        step="0.1"
                        value={newTask.money}
                        onChange={(e) => setNewTask({ ...newTask, money: parseFloat(e.target.value) })}
                        className="w-full bg-gray-50 rounded-2xl p-4 pl-10 text-sm font-bold border-2 border-transparent focus:border-orange-200 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 block">适用年龄</label>
                    <select
                      value={newTask.ageGroup}
                      onChange={(e) => setNewTask({ ...newTask, ageGroup: e.target.value as any })}
                      className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-orange-200 outline-none transition-all appearance-none"
                    >
                      <option value="3-6">3-6 岁</option>
                      <option value="7-9">7-9 岁</option>
                      <option value="10-12">10-12 岁</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 block">任务频率</label>
                    <select
                      value={newTask.type}
                      onChange={(e) => setNewTask({ ...newTask, type: e.target.value as any })}
                      className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-orange-200 outline-none transition-all appearance-none"
                    >
                      <option value="daily">每日任务</option>
                      <option value="weekly">每周任务</option>
                      <option value="one-time">单次挑战</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleCreateTask}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-100 transition-all active:scale-95 mt-4"
                >
                  确认发布
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
