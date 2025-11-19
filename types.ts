
export enum UserRole {
  GUEST = 'GUEST',
  USER = 'USER',
  CREATOR = 'CREATOR',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  email: string;
  points: number;
  role: UserRole;
  unlockedArticles: string[]; // IDs of unlocked articles
  joinDate?: string;
  status?: 'Active' | 'Banned';
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string; // Markdown
  coverImage: string;
  author: {
    name: string;
    avatar: string;
  };
  publishDate: string;
  isPaid: boolean;
  price?: number; // Points
  tags: string[];
  category?: string;
  status?: 'Published' | 'Draft';
  views?: number;
  fileAttachment?: {
    name: string;
    size: string; // e.g., "1.2 GB"
    type: string;
  };
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: 'RECHARGE' | 'PURCHASE';
  date: string;
  status: 'COMPLETED' | 'PENDING';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
}

export interface SystemLog {
  id: string;
  action: string;
  adminName: string;
  timestamp: string;
  details: string;
}

export enum AuthMethod {
  EMAIL = 'email',
  PHONE = 'phone',
  GITHUB = 'github',
  GOOGLE = 'google',
  WECHAT = 'wechat',
  QQ = 'qq'
}
