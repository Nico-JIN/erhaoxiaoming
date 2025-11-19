
import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, FileText, Wallet, Layers, Activity, 
  Search, MoreHorizontal, Plus, TrendingUp, ArrowUpRight, ArrowDownRight 
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

// Mock Data for Admin
const MOCK_USERS = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'USER', points: 120, status: 'Active', date: '2023-10-12' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'USER', points: 0, status: 'Active', date: '2023-10-15' },
  { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'USER', points: 500, status: 'Banned', date: '2023-10-20' },
];

const MOCK_ARTICLES = [
  { id: '1', title: 'Advanced System Architecture', author: 'Admin', views: 1240, status: 'Published', date: '2023-10-24' },
  { id: '2', title: 'React Hooks Deep Dive', author: 'Admin', views: 850, status: 'Draft', date: '2023-10-26' },
  { id: '3', title: 'Kubernetes for Beginners', author: 'Admin', views: 2100, status: 'Published', date: '2023-10-01' },
];

const MOCK_TRANSACTIONS = [
  { id: 'T001', user: 'Alice Johnson', type: 'RECHARGE', amount: 500, date: '2023-10-27 14:30', status: 'Completed' },
  { id: 'T002', user: 'Bob Smith', type: 'PURCHASE', amount: -100, date: '2023-10-27 12:15', status: 'Completed' },
  { id: 'T003', user: 'David Lee', type: 'RECHARGE', amount: 1200, date: '2023-10-26 09:45', status: 'Pending' },
];

const AdminPanel: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'content' | 'finance' | 'categories' | 'logs'>('dashboard');

  const SidebarItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        activeTab === id 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
                   <span className="flex items-center text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded">+12% <ArrowUpRight size={12} /></span>
                </div>
                <p className="text-slate-500 text-sm">{t('admin.totalUsers')}</p>
                <h3 className="text-2xl font-bold text-slate-800">1,234</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Wallet size={24} /></div>
                   <span className="flex items-center text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded">+8.5% <ArrowUpRight size={12} /></span>
                </div>
                <p className="text-slate-500 text-sm">{t('admin.totalRevenue')}</p>
                <h3 className="text-2xl font-bold text-slate-800">$45,230</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                   <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><FileText size={24} /></div>
                   <span className="flex items-center text-slate-400 text-xs font-bold bg-slate-50 px-2 py-1 rounded">0% <TrendingUp size={12} /></span>
                </div>
                <p className="text-slate-500 text-sm">{t('admin.articles')}</p>
                <h3 className="text-2xl font-bold text-slate-800">84</h3>
              </div>
            </div>
            
            {/* Recent Activity Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">{t('admin.recentTrans')}</h3>
                 <button className="text-indigo-600 text-sm hover:underline">{t('home.viewAll')}</button>
               </div>
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-slate-500 font-medium">
                   <tr>
                     <th className="px-6 py-3">ID</th>
                     <th className="px-6 py-3">User</th>
                     <th className="px-6 py-3">Amount</th>
                     <th className="px-6 py-3">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {MOCK_TRANSACTIONS.map(t => (
                     <tr key={t.id} className="hover:bg-slate-50">
                       <td className="px-6 py-3 font-mono text-slate-600">{t.id}</td>
                       <td className="px-6 py-3 text-slate-800 font-medium">{t.user}</td>
                       <td className={`px-6 py-3 font-bold ${t.type === 'RECHARGE' ? 'text-green-600' : 'text-slate-600'}`}>
                         {t.type === 'RECHARGE' ? '+' : ''}{t.amount}
                       </td>
                       <td className="px-6 py-3">
                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                           {t.status}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        );

      case 'content':
        return (
          <div className="space-y-6 animate-fade-in">
             <div className="flex justify-between items-center">
               <h2 className="text-xl font-bold text-slate-800">{t('admin.content')}</h2>
               <button 
                 onClick={() => navigate('/admin/editor')}
                 className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-200"
               >
                 <Plus size={16} />
                 {t('admin.newArticle')}
               </button>
             </div>

             <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
               <table className="w-full text-sm text-left">
                 <thead className="bg-slate-50 text-slate-500 font-medium">
                   <tr>
                     <th className="px-6 py-3">Title</th>
                     <th className="px-6 py-3">Author</th>
                     <th className="px-6 py-3">Views</th>
                     <th className="px-6 py-3">Status</th>
                     <th className="px-6 py-3 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {MOCK_ARTICLES.map(art => (
                     <tr key={art.id} className="hover:bg-slate-50 group">
                       <td className="px-6 py-4 font-medium text-slate-900">{art.title}</td>
                       <td className="px-6 py-4 text-slate-500">{art.author}</td>
                       <td className="px-6 py-4 text-slate-500">{art.views}</td>
                       <td className="px-6 py-4">
                         <span className={`px-2 py-1 rounded-full text-xs font-medium ${art.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                           {art.status}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <button className="text-slate-400 hover:text-indigo-600 mx-1"><MoreHorizontal size={18}/></button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        );
        
      case 'users':
        return (
          <div className="space-y-6 animate-fade-in">
             <h2 className="text-xl font-bold text-slate-800">{t('admin.users')}</h2>
             <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Email</th>
                      <th className="px-6 py-3">Role</th>
                      <th className="px-6 py-3">Points</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MOCK_USERS.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                        <td className="px-6 py-4 text-slate-500">{u.email}</td>
                        <td className="px-6 py-4 text-slate-500">{u.role}</td>
                        <td className="px-6 py-4 font-bold text-indigo-600">{u.points}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {u.status}
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        );
      
      default:
        return <div className="p-12 text-center text-slate-400">Module under construction</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 flex items-center gap-2 border-b border-slate-100">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold">L</div>
          <span className="text-lg font-bold text-slate-900">Lumina Admin</span>
        </div>
        
        <div className="flex-1 p-4 space-y-2 overflow-y-auto">
          <SidebarItem id="dashboard" icon={LayoutDashboard} label={t('admin.dashboard')} />
          <SidebarItem id="users" icon={Users} label={t('admin.users')} />
          <SidebarItem id="content" icon={FileText} label={t('admin.content')} />
          <SidebarItem id="finance" icon={Wallet} label={t('admin.finance')} />
          <SidebarItem id="categories" icon={Layers} label={t('admin.categories')} />
          <div className="pt-4 mt-4 border-t border-slate-100">
            <SidebarItem id="logs" icon={Activity} label={t('admin.logs')} />
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-100">
           <button onClick={() => navigate('/')} className="w-full py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
             Exit Admin
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Admin Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-lg font-semibold text-slate-800 capitalize">{activeTab}</h1>
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 px-3 py-2 rounded-lg flex items-center text-sm text-slate-500 w-64">
               <Search size={16} className="mr-2"/>
               <input type="text" placeholder="Search..." className="bg-transparent outline-none w-full" />
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">A</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
           {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
