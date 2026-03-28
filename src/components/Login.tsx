import React, { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from '../types';
import { motion } from 'motion/react';
import { User as UserIcon, Key, Info, Sparkles } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const generateInviteCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setError(null);

    const email = `${username.trim().toLowerCase()}@app.local`;

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists()) {
        onLogin(userDoc.data() as User);
      } else {
        setError('用户数据不存在');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('用户名或密码错误');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const createDemoAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const demoId = Math.random().toString(36).substring(2, 6);
      const parentUsername = `parent_${demoId}`;
      const childUsername = `child_${demoId}`;
      const password = 'password123';
      const parentEmail = `${parentUsername}@app.local`;
      const childEmail = `${childUsername}@app.local`;

      // Create Parent
      const parentResult = await createUserWithEmailAndPassword(auth, parentEmail, password);
      const inviteCode = generateInviteCode();
      const parentUser: User = {
        uid: parentResult.user.uid,
        username: parentUsername,
        displayName: '演示家长',
        role: 'parent',
        inviteCode: inviteCode,
        balance: 0,
        pocketMoney: 0,
        avatar: `https://picsum.photos/seed/parent${demoId}/200/200`,
      };
      await setDoc(doc(db, 'users', parentResult.user.uid), parentUser);

      // Create Child
      const childResult = await createUserWithEmailAndPassword(auth, childEmail, password);
      const childUser: User = {
        uid: childResult.user.uid,
        username: childUsername,
        displayName: '演示小朋友',
        role: 'child',
        parentId: parentResult.user.uid,
        balance: 0,
        pocketMoney: 0,
        avatar: `https://picsum.photos/seed/child${demoId}/200/200`,
      };
      await setDoc(doc(db, 'users', childResult.user.uid), childUser);

      alert(`演示账号创建成功！\n\n家长用户名：${parentUsername}\n小朋友用户名：${childUsername}\n密码均为：${password}\n\n已为您自动登录家长端。`);
      onLogin(parentUser);
    } catch (err: any) {
      setError('演示账号创建失败：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden"
      >
        <div className="bg-orange-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-[-20px] left-[-20px] w-40 h-40 rounded-full bg-white" />
            <div className="absolute bottom-[-40px] right-[-40px] w-60 h-60 rounded-full bg-white" />
          </div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl rotate-3">
              <img 
                src="https://picsum.photos/seed/pet/200/200" 
                alt="Logo" 
                className="w-16 h-16 rounded-2xl object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-2xl font-black text-white">萌宠养成记</h1>
            <p className="text-orange-100 text-xs font-bold mt-1 uppercase tracking-widest">Habit & Reward System</p>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-4">
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold border-2 border-transparent focus:border-orange-200 outline-none transition-all"
                />
              </div>

              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold border-2 border-transparent focus:border-orange-200 outline-none transition-all"
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold flex gap-2 items-center"
              >
                <Info className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>立即登录</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100">
            <button
              onClick={createDemoAccounts}
              disabled={loading}
              className="w-full bg-blue-50 text-blue-600 font-black py-4 rounded-2xl border-2 border-dashed border-blue-200 hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              <span>一键创建演示账号 (家长+孩子)</span>
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-4 font-bold uppercase tracking-widest">
              Demo Mode • No Real Email Required
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
