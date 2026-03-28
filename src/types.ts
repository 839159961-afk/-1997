export type UserRole = 'parent' | 'child' | 'admin';

export interface User {
  uid: string;
  username: string;
  displayName: string;
  email?: string;
  role: UserRole;
  parentId?: string;
  inviteCode?: string; // For parents to invite children
  balance: number;
  pocketMoney: number;
  avatar?: string;
}

export type PetType = 'cat' | 'dog' | 'dino' | 'elf';

export interface Pet {
  id: string;
  ownerId: string;
  type: PetType;
  name: string;
  growth: number;
  hunger: number;
  cleanliness: number;
  happiness: number;
  health: number;
  level: number;
  skinId?: string;
}

export type AgeGroup = '3-6' | '7-9' | '10-12';
export type TaskType = 'daily' | 'weekly' | 'one-time';

export interface Task {
  id: string;
  parentId: string;
  title: string;
  description?: string;
  coins: number;
  money: number;
  ageGroup: AgeGroup;
  type: TaskType;
}

export type CheckinStatus = 'pending' | 'approved' | 'rejected';

export interface Checkin {
  id: string;
  childId: string;
  parentId: string;
  taskId: string;
  status: CheckinStatus;
  photoUrl?: string;
  voiceUrl?: string;
  comment?: string;
  timestamp: any; // Firestore Timestamp
  parentComment?: string;
}

export type TransactionType = 'coin' | 'money';

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  description: string;
  timestamp: any; // Firestore Timestamp
}
