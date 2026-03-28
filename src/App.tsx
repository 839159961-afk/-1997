/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from './types';
import Login from './components/Login';
import ChildEnd from './components/ChildEnd';
import ParentEnd from './components/ParentEnd';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, UserPlus, Info } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);

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
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-[32px] p-8 shadow-2xl"
            >
              <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-blue-600" />
                邀请孩子加入
              </h3>
              <div className="space-y-6">
                <div className="text-center">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 block">您的专属邀请码</label>
                  <div className="bg-blue-50 rounded-3xl p-6 border-2 border-dashed border-blue-200">
                    <span className="text-4xl font-black text-blue-600 tracking-widest">{user.inviteCode || '---'}</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl flex gap-3">
                  <Info className="w-5 h-5 text-gray-400 shrink-0" />
                  <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                    让孩子在注册页面选择“我是小朋友”，输入此邀请码即可完成绑定。
                  </p>
                </div>

                <button
                  onClick={() => setShowAddChild(false)}
                  className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
                >
                  我知道了
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
