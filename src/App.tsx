/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import firebaseConfig from '../firebase-applet-config.json';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from './types';
import Login from './components/Login';
import ChildEnd from './components/ChildEnd';
import ParentEnd from './components/ParentEnd';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, UserPlus, Info, User as UserIcon, Key } from 'lucide-react';
import { Toaster } from 'sonner';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [childUsername, setChildUsername] = useState('');
  const [childPassword, setChildPassword] = useState('');
  const [childDisplayName, setChildDisplayName] = useState('');
  const [creatingChild, setCreatingChild] = useState(false);
  const [childError, setChildError] = useState<string | null>(null);

  const getSecondaryAuth = () => {
    const secondaryAppName = 'SecondaryApp';
    const app = getApps().find(a => a.name === secondaryAppName) 
      || initializeApp(firebaseConfig, secondaryAppName);
    return getAuth(app);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          } else {
            setUser(null);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !childUsername || !childPassword || !childDisplayName) return;

    setCreatingChild(true);
    setChildError(null);

    try {
      const secondaryAuth = getSecondaryAuth();
      
      const email = `${childUsername.trim().toLowerCase()}@app.local`;
      const result = await createUserWithEmailAndPassword(secondaryAuth, email, childPassword);
      
      const childUser: User = {
        uid: result.user.uid,
        username: childUsername.trim().toLowerCase(),
        displayName: childDisplayName.trim(),
        role: 'child',
        parentId: user.uid,
        balance: 0,
        pocketMoney: 0,
        avatar: `https://picsum.photos/seed/${childUsername}/200/200`,
      };

      await setDoc(doc(db, 'users', result.user.uid), childUser);
      
      // Clean up secondary auth session
      await secondaryAuth.signOut();
      
      setShowAddChild(false);
      setChildUsername('');
      setChildPassword('');
      setChildDisplayName('');
      alert(`孩子账号 "${childDisplayName}" 创建成功！\n用户名：${childUsername}\n密码：${childPassword}`);
    } catch (err: any) {
      console.error(err);
      setChildError(err.message);
    } finally {
      setCreatingChild(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="relative">
      <Toaster position="top-center" richColors />
      {user.role === 'parent' ? (
        <ParentEnd user={user} />
      ) : (
        <ChildEnd user={user} />
      )}

      {/* Floating Action Menu for Demo */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        {user.role === 'parent' && (
          <button
            onClick={() => setShowAddChild(true)}
            className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 transition-all active:scale-90"
          >
            <UserPlus className="w-6 h-6" />
          </button>
        )}
        <button
          onClick={handleLogout}
          className="w-12 h-12 bg-red-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-red-700 transition-all active:scale-90"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      {/* Add Child Modal */}
      <AnimatePresence>
        {showAddChild && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl my-auto"
            >
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-blue-600" />
                创建孩子账号
              </h3>
              
              <form onSubmit={handleCreateChild} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 block">孩子姓名/昵称</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="例如：小明"
                      value={childDisplayName}
                      onChange={(e) => setChildDisplayName(e.target.value)}
                      className="w-full bg-gray-50 rounded-2xl py-3 pl-10 pr-4 text-sm font-bold border-2 border-transparent focus:border-blue-200 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 block">登录用户名</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="例如：xiaoming"
                      value={childUsername}
                      onChange={(e) => setChildUsername(e.target.value)}
                      className="w-full bg-gray-50 rounded-2xl py-3 pl-10 pr-4 text-sm font-bold border-2 border-transparent focus:border-blue-200 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1 block">登录密码</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      placeholder="设置一个简单密码"
                      value={childPassword}
                      onChange={(e) => setChildPassword(e.target.value)}
                      className="w-full bg-gray-50 rounded-2xl py-3 pl-10 pr-4 text-sm font-bold border-2 border-transparent focus:border-blue-200 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                {childError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-[10px] font-bold flex gap-2 items-center">
                    <Info className="w-4 h-4 shrink-0" />
                    {childError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddChild(false)}
                    className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-black text-sm hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={creatingChild}
                    className="flex-2 py-4 rounded-2xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creatingChild ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>确认创建</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
