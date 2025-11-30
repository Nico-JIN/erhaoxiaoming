
import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Wallet,
  Layers,
  Activity,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Upload,
  Smartphone,
  LogOut,
  BarChart,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

import type { Resource } from '../services/resourceService';
import categoryService, { Category } from '../services/categoryService';
import pointsService, { PointTransaction } from '../services/pointsService';
import paymentService, { PaymentQRCode } from '../services/paymentService';
import uploadService from '../services/uploadService';
import ImageCropper from '../components/ImageCropper';
import NotificationSound from '../components/NotificationSound';
import rechargeService, { RechargePlan, RechargeOrder } from '../services/rechargeService';
import adminService, { DashboardStats, OperationLog, UserManagement, VisitStats, VisitorLog } from '../services/adminService';

type AdminTab = 'dashboard' | 'users' | 'content' | 'finance' | 'categories' | 'payment' | 'logs' | 'analytics';

const AdminPanel: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const tabTitles: Record<AdminTab, string> = {
    dashboard: t('admin.tabTitles.dashboard'),
    users: t('admin.tabTitles.users'),
    content: t('admin.tabTitles.content'),
    finance: t('admin.tabTitles.finance'),
    categories: t('admin.tabTitles.categories'),
    payment: t('admin.payment'),
    logs: t('admin.tabTitles.logs'),
    analytics: 'Analytics',
  };
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [visitStats, setVisitStats] = useState<VisitStats | null>(null);
  const [visitorLogs, setVisitorLogs] = useState<VisitorLog[]>([]);
  const [visitorLogsTotal, setVisitorLogsTotal] = useState(0);
  const [users, setUsers] = useState<UserManagement[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Sorting State
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryFormLoading, setCategoryFormLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [qrCodes, setQrCodes] = useState<PaymentQRCode[]>([]);
  const [uploadingQR, setUploadingQR] = useState<string | null>(null);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const [cropperMethod, setCropperMethod] = useState<'wechat' | 'alipay' | null>(null);
  const [rechargePlans, setRechargePlans] = useState<RechargePlan[]>([]);
  const [rechargeOrders, setRechargeOrders] = useState<RechargeOrder[]>([]);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<RechargePlan | null>(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    plan_type: 'monthly',
    points: 0,
    price: 0,
    description: '',
    features: '',
    wechat_qr_code: '',
    alipay_qr_code: '',
    is_active: true,
    is_featured: false,
    order: 0,
  });
  const [uploadingPlanQR, setUploadingPlanQR] = useState<'wechat' | 'alipay' | null>(null);
  const [planQRImage, setPlanQRImage] = useState<string | null>(null);
  const [planQRCropType, setPlanQRCropType] = useState<'wechat' | 'alipay' | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationConfig, setNotificationConfig] = useState({
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    soundType: 'notification' as 'success' | 'notification' | 'alert',
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    order: 0,
    is_active: true,
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);

  // Stats Editing State
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [editingStatsResource, setEditingStatsResource] = useState<Resource | null>(null);
  const [statsForm, setStatsForm] = useState({ views: 0, downloads: 0 });

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      slug: '',
      description: '',
      icon: '',
      order: categories.length + 1,
      is_active: true,
    });
    setEditingCategory(null);
  };

  const refreshCategories = async () => {
    const data = await categoryService.listCategories();
    setCategories(data);
  };

  const refreshLogs = async () => {
    try {
      setLogsLoading(true);
      const data = await adminService.getLogs({ limit: 100 });
      setLogs(data);
      // Also refresh visitor stats when on Analytics tab
      const visitData = await adminService.getVisitStats();
      setVisitStats(visitData);
      const visitorLogsData = await adminService.getVisitorLogs();
      setVisitorLogs(visitorLogsData.logs);
      setVisitorLogsTotal(visitorLogsData.total);
    } catch (error) {
      console.error('Failed to load logs', error);
      setMessage(t('admin.logsLoadError'));
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [t]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [dashboard, userList, resourceList, transactionList, categoryList, logsList, paymentQR, plans, orders, visits, visitorLogsData] = await Promise.all([
        adminService.getStats(),
        adminService.listAllUsers(),
        adminService.listResources({ limit: 50 }),
        pointsService.listAdminTransactions({ limit: 10 }),
        categoryService.listCategories(),
        adminService.getLogs({ limit: 100 }),
        paymentService.getQRCodes(),
        rechargeService.getPlans(true),
        rechargeService.getAllOrders().catch(() => []),
        adminService.getVisitStats().catch(() => null),
        adminService.getVisitorLogs().catch(() => null),
      ]);
      setStats(dashboard);
      setUsers(userList);
      setResources(resourceList);
      setTransactions(transactionList);
      setCategories(categoryList);
      setLogs(logsList);
      setQrCodes(paymentQR);
      setRechargePlans(plans);
      setRechargeOrders(orders);
      setVisitStats(visits);
      if (visitorLogsData) {
        setVisitorLogs(visitorLogsData.logs);
        setVisitorLogsTotal(visitorLogsData.total);
      }
    } catch (error) {
      console.error('Failed to load admin data', error);
      setMessage(t('admin.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const refreshUsers = async () => {
    const updated = await adminService.listAllUsers();
    setUsers(updated);
  };

  const handleToggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleToggleAllUsers = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  const handleBatchDeleteUsers = async () => {
    if (selectedUsers.length === 0) {
      alert('请至少选择一个用户');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedUsers.length} 个用户吗？此操作不可恢复！`)) {
      return;
    }

    try {
      await adminService.batchDeleteUsers(selectedUsers);
      setMessage(`成功删除 ${selectedUsers.length} 个用户`);
      setSelectedUsers([]);
      await refreshUsers();
    } catch (error) {
      console.error('Failed to delete users:', error);
      setMessage('批量删除用户失败，请重试');
    }
  };

  const handleToggleResourceSelection = (resourceId: string) => {
    setSelectedResources((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const handleToggleAllResources = () => {
    if (selectedResources.length === resources.length) {
      setSelectedResources([]);
    } else {
      setSelectedResources(resources.map((r) => r.id));
    }
  };

  const handleBatchDeleteResources = async () => {
    if (selectedResources.length === 0) {
      alert('请至少选择一篇文章');
      return;
    }

    if (!confirm(`确定要删除选中的 ${selectedResources.length} 篇文章吗？此操作不可恢复！`)) {
      return;
    }

    try {
      await adminService.batchDeleteResources(selectedResources);
      setMessage(`成功删除 ${selectedResources.length} 篇文章`);
      setSelectedResources([]);
      await loadAllData();
    } catch (error) {
      console.error('Failed to delete resources:', error);
      setMessage('批量删除文章失败，请重试');
    }
  };

  const handleAddCategory = () => {
    resetCategoryForm();
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '',
      order: category.order,
      is_active: category.is_active,
    });
    setShowCategoryForm(true);
  };

  const handleCategoryFormChange = (field: keyof typeof categoryForm, value: string | number | boolean) => {
    setCategoryForm((prev) => ({
      ...prev,
      [field]:
        typeof prev[field] === 'number'
          ? Number(value)
          : typeof prev[field] === 'boolean'
            ? Boolean(value)
            : value,
    }));
  };

  const handleSubmitCategoryForm = async () => {
    if (!categoryForm.name.trim()) {
      alert(t('admin.categoryNameRequired'));
      return;
    }
    const payload = {
      name: categoryForm.name.trim(),
      slug: (categoryForm.slug || slugify(categoryForm.name)).trim(),
      description: categoryForm.description || undefined,
      icon: categoryForm.icon || undefined,
      order: Number(categoryForm.order) || 0,
      is_active: categoryForm.is_active,
    };
    try {
      setCategoryFormLoading(true);
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, payload);
        setMessage(t('admin.categoryUpdated'));
      } else {
        await categoryService.createCategory(payload);
        setMessage(t('admin.categorySaved'));
      }
      await refreshCategories();
      resetCategoryForm();
      setShowCategoryForm(false);
    } catch (error) {
      console.error('Failed to save category', error);
      setMessage(t('admin.categorySaveError'));
    } finally {
      setCategoryFormLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!window.confirm(t('admin.categoryDeleteConfirm'))) return;
    try {
      await categoryService.deleteCategory(categoryId);
      await refreshCategories();
      setMessage(t('admin.categoryDeleted'));
    } catch (error) {
      console.error('Failed to delete category', error);
      setMessage(t('admin.categoryDeleteError'));
    }
  };

  const handleToggleCategoryStatus = async (category: Category) => {
    try {
      await categoryService.updateCategory(category.id, { is_active: !category.is_active });
      await refreshCategories();
    } catch (error) {
      console.error('Failed to toggle category status', error);
      setMessage(t('admin.categoryStatusError'));
    }
  };

  const handleRoleChange = async (userId: string, role: UserManagement['role']) => {
    try {
      await adminService.updateUserRole(userId, role);
      await refreshUsers();
      setMessage(t('admin.roleUpdateSuccess'));
    } catch (error) {
      console.error('Failed to update role', error);
      setMessage(t('admin.roleUpdateError'));
    }
  };

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    try {
      await adminService.updateUserStatus(userId, isActive);
      await refreshUsers();
      setMessage(t('admin.userStatusSuccess'));
    } catch (error) {
      console.error('Failed to update status', error);
      setMessage(t('admin.userStatusError'));
    }
  };

  const handleAdjustPoints = async (user: UserManagement) => {
    const rawAmount = window.prompt(t('admin.adjustPrompt'));
    if (rawAmount === null) return;
    const amount = Number(rawAmount);
    if (Number.isNaN(amount) || amount === 0) {
      alert(t('admin.adjustInvalid'));
      return;
    }
    const reasonInput = window.prompt(t('admin.adjustReasonPrompt'));
    const description = reasonInput && reasonInput.trim().length > 0 ? reasonInput : t('admin.adjustFallbackReason');
    try {
      await adminService.adjustPoints(user.id, amount, description);
      await refreshUsers();
      setMessage(t('admin.adjustSuccess'));
    } catch (error: any) {
      console.error('Failed to adjust points', error);
      const detail = error?.response?.data?.detail || t('admin.adjustError');
      alert(detail);
    }
  };

  const handleEditResource = (resourceId: string) => {
    navigate(`/admin/editor/${resourceId}`);
  };

  const refreshPaymentQRCodes = async () => {
    try {
      const codes = await paymentService.getQRCodes();
      setQrCodes(codes);
    } catch (error) {
      console.error('Failed to load QR codes:', error);
      setMessage('加载收款码失败');
    }
  };

  const handleSelectQRImage = (method: 'wechat' | 'alipay', file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropperImage(reader.result as string);
      setCropperMethod(method);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!cropperMethod) return;

    try {
      setUploadingQR(cropperMethod);
      setCropperImage(null);
      setCropperMethod(null);

      // 创建一个File对象从 blob
      const file = new File([croppedBlob], `qrcode-${cropperMethod}.jpg`, { type: 'image/jpeg' });
      const uploaded = await uploadService.uploadImage(file);
      const imageUrl = uploaded.resolvedUrl || uploadService.getPublicUrl(uploaded.object_name);

      if (!imageUrl) {
        throw new Error('Image upload failed');
      }

      await paymentService.createOrUpdateQRCode({
        payment_method: cropperMethod,
        qr_code_url: imageUrl,
        description: `${cropperMethod === 'wechat' ? '微信' : '支付宝'}收款码`,
      });

      await refreshPaymentQRCodes();
      setMessage(`${cropperMethod === 'wechat' ? '微信' : '支付宝'}收款码上传成功`);
    } catch (error) {
      console.error('Failed to upload QR code:', error);
      setMessage('上传收款码失败');
    } finally {
      setUploadingQR(null);
    }
  };

  const handleCropCancel = () => {
    setCropperImage(null);
    setCropperMethod(null);
  };

  const handleUploadQRCode = async (method: 'wechat' | 'alipay', file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    try {
      setUploadingQR(method);
      const uploaded = await uploadService.uploadImage(file);
      const imageUrl = uploaded.resolvedUrl || uploadService.getPublicUrl(uploaded.object_name);

      if (!imageUrl) {
        throw new Error('Image upload failed');
      }

      await paymentService.createOrUpdateQRCode({
        payment_method: method,
        qr_code_url: imageUrl,
        description: `${method === 'wechat' ? '微信' : '支付宝'}收款码`,
      });

      await refreshPaymentQRCodes();
      setMessage(`${method === 'wechat' ? '微信' : '支付宝'}收款码上传成功`);
    } catch (error) {
      console.error('Failed to upload QR code:', error);
      setMessage('上传收款码失败');
    } finally {
      setUploadingQR(null);
    }
  };

  // 充值套餐管理函数
  const refreshRechargePlans = async () => {
    try {
      const plans = await rechargeService.getPlans(true);
      setRechargePlans(plans);
    } catch (error) {
      console.error('Failed to load recharge plans:', error);
      setMessage('加载充值套餐失败');
    }
  };

  const handleAddPlan = () => {
    setPlanForm({
      name: '',
      plan_type: 'monthly',
      points: 0,
      price: 0,
      description: '',
      features: '',
      wechat_qr_code: '',
      alipay_qr_code: '',
      is_active: true,
      is_featured: false,
      order: rechargePlans.length,
    });
    setEditingPlan(null);
    setShowPlanForm(true);
  };

  const handleEditPlan = (plan: RechargePlan) => {
    setPlanForm({
      name: plan.name,
      plan_type: plan.plan_type,
      points: plan.points,
      price: plan.price / 100, // 转换为元显示
      description: plan.description || '',
      features: plan.features || '',
      wechat_qr_code: plan.wechat_qr_code || '',
      alipay_qr_code: plan.alipay_qr_code || '',
      is_active: plan.is_active,
      is_featured: plan.is_featured,
      order: plan.order,
    });
    setEditingPlan(plan);
    setShowPlanForm(true);
  };

  const handleSavePlan = async () => {
    try {
      // 将价格从元转换为分
      const planData = {
        ...planForm,
        price: Math.round(planForm.price * 100),
      };

      if (editingPlan) {
        await rechargeService.updatePlan(editingPlan.id, planData);
        setMessage('充值套餐更新成功');
      } else {
        await rechargeService.createPlan(planData);
        setMessage('充值套餐创建成功');
      }
      await refreshRechargePlans();
      setShowPlanForm(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Failed to save plan:', error);
      setMessage('保存充值套餐失败');
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!confirm('确定要删除这个充值套餐吗?')) return;
    try {
      await rechargeService.deletePlan(planId);
      await refreshRechargePlans();
      setMessage('充值套餐删除成功');
    } catch (error) {
      console.error('Failed to delete plan:', error);
      setMessage('删除充值套餐失败');
    }
  };

  // 处理套餐二维码选择
  const handleSelectPlanQRImage = (type: 'wechat' | 'alipay', file: File) => {
    console.log('🔵 handleSelectPlanQRImage 被调用:', type, file.name);
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      console.log('🔵 图片读取完成，准备显示裁剪器');
      setPlanQRImage(reader.result as string);
      setPlanQRCropType(type);
    };
    reader.readAsDataURL(file);
  };

  // 处理套餐二维码裁剪完成
  const handlePlanQRCropComplete = async (croppedBlob: Blob) => {
    console.log('🟢 handlePlanQRCropComplete 被调用, Blob 大小:', croppedBlob.size);
    if (!planQRCropType) return;

    try {
      setUploadingPlanQR(planQRCropType);
      setPlanQRImage(null);
      const currentCropType = planQRCropType;
      setPlanQRCropType(null);

      console.log('🟢 开始上传裁剪后的图片...');
      // 创建一个File对象从 blob
      const file = new File([croppedBlob], `plan-qrcode-${currentCropType}.jpg`, { type: 'image/jpeg' });
      const uploaded = await uploadService.uploadImage(file);
      const imageUrl = uploaded.resolvedUrl || uploadService.getPublicUrl(uploaded.object_name);

      console.log('🟢 图片上传成功, URL:', imageUrl);

      if (!imageUrl) {
        throw new Error('Image upload failed');
      }

      // 更新planForm - 使用函数式更新确保获取最新状态
      setPlanForm(prev => {
        console.log('🟢 更新 planForm, 之前的值:', prev[currentCropType === 'wechat' ? 'wechat_qr_code' : 'alipay_qr_code']);
        console.log('🟢 更新 planForm, 新的值:', imageUrl);
        return {
          ...prev,
          [currentCropType === 'wechat' ? 'wechat_qr_code' : 'alipay_qr_code']: imageUrl
        };
      });

      setMessage(`${currentCropType === 'wechat' ? '微信' : '支付宝'}收款码上传成功`);
    } catch (error) {
      console.error('❌ 上传失败:', error);
      setMessage('上传收款码失败');
    } finally {
      setUploadingPlanQR(null);
    }
  };

  const handlePlanQRCropCancel = () => {
    setPlanQRImage(null);
    setPlanQRCropType(null);
  };

  const handleEditStats = (resource: Resource) => {
    setEditingStatsResource(resource);
    setStatsForm({
      views: resource.views || 0,
      downloads: resource.downloads || 0,
    });
    setShowStatsModal(true);
  };

  const handleSaveStats = async () => {
    if (!editingStatsResource) return;
    try {
      await adminService.updateResourceStats(editingStatsResource.id, statsForm);
      setMessage('文章数据更新成功');
      setShowStatsModal(false);
      setEditingStatsResource(null);
      // Refresh resources
      const updatedResources = await adminService.listResources({ limit: 50 });
      setResources(updatedResources);
    } catch (error) {
      console.error('Failed to update stats:', error);
      setMessage('更新失败');
    }
  };

  // 订单管理
  const refreshOrders = async () => {
    try {
      const orders = await rechargeService.getAllOrders();
      setRechargeOrders(orders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  };

  const handleApproveOrder = async (orderId: number) => {
    const order = rechargeOrders.find(o => o.id === orderId);
    if (!order) return;

    try {
      await rechargeService.updateOrderStatus(orderId, { status: 'APPROVED' });
      await refreshOrders();

      // 显示批准成功通知
      setNotificationConfig({
        title: '订单已批准',
        message: `订单审核通过！

订单号：${order.order_no}
用户ID：${order.user_id}
积分：${order.points}
金额：￥${(order.amount / 100).toFixed(2)}

积分已自动充值到用户账户。`,
        type: 'success',
        soundType: 'success',
      });
      setShowNotification(true);
      setMessage('订单已批准，积分已充值');
    } catch (error) {
      console.error('Failed to approve order:', error);
      setNotificationConfig({
        title: '批准失败',
        message: '订单批准失败，请重试。',
        type: 'error',
        soundType: 'alert',
      });
      setShowNotification(true);
      setMessage('批准订单失败');
    }
  };

  const handleRejectOrder = async (orderId: number) => {
    const note = prompt('请输入拒绝原因:');
    if (!note) return;

    try {
      await rechargeService.updateOrderStatus(orderId, {
        status: 'REJECTED',
        admin_note: note,
      });
      await refreshOrders();
      setMessage('订单已拒绝');
    } catch (error) {
      console.error('Failed to reject order:', error);
      setMessage('拒绝订单失败');
    }
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: AdminTab; icon: any; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === id
        ? 'bg-indigo-50 text-indigo-600'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
    >
      <Icon size={18} className={activeTab === id ? 'text-indigo-600' : 'text-slate-400'} />
      {label}
    </button>
  );

  const DashboardCard = ({ label, value, delta, icon: Icon, positive = true }: { label: string; value: string; delta?: number; icon: any; positive?: boolean }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <Icon size={24} />
        </div>
        {typeof delta === 'number' && (
          <span className={`flex items-center text-xs font-bold px-2 py-1 rounded ${positive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
            {delta}% {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          </span>
        )}
      </div>
      <p className="text-slate-500 text-sm">{label}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DashboardCard label={t('admin.totalUsers')} value={(stats?.total_users ?? 0).toLocaleString()} delta={stats?.user_growth} icon={Users} positive={(stats?.user_growth ?? 0) >= 0} />
        <DashboardCard label={t('admin.totalRevenue')} value={`¥ ${(stats?.total_revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} delta={stats?.revenue_growth} icon={Wallet} positive={(stats?.revenue_growth ?? 0) >= 0} />
        <DashboardCard label={t('admin.articles')} value={(stats?.total_articles ?? 0).toString()} icon={FileText} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">{t('admin.recentTrans')}</h3>
          <button onClick={() => setActiveTab('finance')} className="text-indigo-600 text-sm hover:underline">{t('home.viewAll')}</button>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-3">{t('admin.transactionTable.id')}</th>
              <th className="px-6 py-3">{t('admin.transactionTable.user')}</th>
              <th className="px-6 py-3">{t('admin.transactionTable.type')}</th>
              <th className="px-6 py-3">{t('admin.transactionTable.amount')}</th>
              <th className="px-6 py-3">{t('admin.transactionTable.balance')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-mono text-slate-600">{tx.id}</td>
                <td className="px-6 py-3 text-slate-800 font-medium">#{tx.user_id}</td>
                <td className="px-6 py-3 text-slate-500">{tx.type}</td>
                <td className={`px-6 py-3 font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-slate-600'}`}>{tx.amount}</td>
                <td className="px-6 py-3 text-slate-500">{tx.balance_after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">{t('admin.users')}</h2>
        <div className="flex items-center gap-3">
          {selectedUsers.length > 0 && (
            <button
              onClick={handleBatchDeleteUsers}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-lg shadow-red-200"
            >
              删除选中 ({selectedUsers.length})
            </button>
          )}
          <button onClick={refreshUsers} className="text-sm text-indigo-600 hover:underline">{t('admin.refresh')}</button>
        </div>
      </div>

      {/* Sorting Logic */}
      {(() => {
        const handleSort = (field: string) => {
          if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
          } else {
            setSortField(field);
            setSortDirection('desc');
          }
        };

        const sortedUsers = [...users].sort((a: any, b: any) => {
          const aVal = a[sortField];
          const bVal = b[sortField];
          if (aVal === bVal) return 0;
          const modifier = sortDirection === 'asc' ? 1 : -1;
          return aVal > bVal ? modifier : -modifier;
        });

        return (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selectedUsers.length === users.length}
                      onChange={handleToggleAllUsers}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th
                    className="px-6 py-3 cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => handleSort('username')}
                  >
                    {t('admin.usersTable.user')} {sortField === 'username' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => handleSort('role')}
                  >
                    {t('admin.usersTable.role')} {sortField === 'role' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => handleSort('points')}
                  >
                    {t('admin.usersTable.points')} {sortField === 'points' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => handleSort('is_active')}
                  >
                    {t('admin.usersTable.status')} {sortField === 'is_active' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-right">{t('admin.usersTable.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.id)}
                        onChange={() => handleToggleUserSelection(u.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{u.full_name || u.username}</span>
                        <span className="text-xs text-slate-500">{u.email || t('admin.usersTable.emailFallback')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        onChange={(event) => handleRoleChange(u.id, event.target.value as UserManagement['role'])}
                        className="border border-slate-200 rounded-lg px-2 py-1 text-sm"
                      >
                        <option value="USER">{t('admin.roleUser')}</option>
                        <option value="VIP">{t('admin.roleVip')}</option>
                        <option value="ADMIN">{t('admin.roleAdmin')}</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 font-bold text-indigo-600">{u.points}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.is_active ? t('admin.usersTable.active') : t('admin.usersTable.banned')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleToggleStatus(u.id, !u.is_active)}
                        className="text-xs px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100"
                      >
                        {u.is_active ? t('admin.usersTable.disable') : t('admin.usersTable.enable')}
                      </button>
                      <button
                        onClick={() => handleAdjustPoints(u)}
                        className="text-xs px-3 py-1 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                      >
                        {t('admin.usersTable.adjust')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );

  const renderContentTab = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800">{t('admin.content')}</h2>
        <div className="flex items-center gap-3">
          {selectedResources.length > 0 && (
            <button
              onClick={handleBatchDeleteResources}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 shadow-lg shadow-red-200"
            >
              删除选中 ({selectedResources.length})
            </button>
          )}
          <button
            onClick={() => navigate('/admin/editor')}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-200"
          >
            <Plus size={16} />
            {t('admin.newArticle')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-3 w-12">
                <input
                  type="checkbox"
                  checked={resources.length > 0 && selectedResources.length === resources.length}
                  onChange={handleToggleAllResources}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
              <th className="px-6 py-3">{t('admin.contentTable.title')}</th>
              <th className="px-6 py-3">{t('admin.contentTable.category')}</th>
              <th className="px-6 py-3">{t('admin.contentTable.points')}</th>
              <th className="px-6 py-3">{t('admin.contentTable.status')}</th>
              <th className="px-6 py-3">{t('admin.contentTable.views')}</th>
              <th className="px-6 py-3 text-right">{t('admin.contentTable.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resources.map((resource) => (
              <tr key={resource.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedResources.includes(resource.id)}
                    onChange={() => handleToggleResourceSelection(resource.id)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-6 py-4 font-medium text-slate-900">{resource.title}</td>
                <td className="px-6 py-4 text-slate-500">{resource.category_name || t('admin.generalCategory')}</td>
                <td className="px-6 py-4 text-slate-500">{resource.is_free ? t('admin.contentTable.free') : `${resource.points_required} ${t('admin.contentTable.paidSuffix')}`}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${resource.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {resource.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500">{resource.views}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleEditResource(resource.id)}
                    className="px-3 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-100"
                  >
                    {t('admin.contentTable.edit')}
                  </button>
                  <button
                    onClick={() => handleEditStats(resource)}
                    className="px-3 py-1 text-xs rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  >
                    数据
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t('admin.categories')}</h2>
          <p className="text-sm text-slate-500">{t('admin.categoriesIntro')}</p>
        </div>
        <button
          onClick={handleAddCategory}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 shadow-lg shadow-slate-200"
        >
          <Plus size={16} /> {t('admin.addCategory')}
        </button>
      </div>

      {showCategoryForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">
              {editingCategory ? t('admin.categoryForm.headingEdit') : t('admin.categoryForm.headingCreate')}
            </h3>
            <button
              onClick={() => {
                setShowCategoryForm(false);
                resetCategoryForm();
              }}
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              {t('admin.categoryForm.cancel')}
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.categoryForm.name')}</label>
              <input
                type="text"
                value={categoryForm.name}
                onChange={(e) => handleCategoryFormChange('name', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.categoryForm.slug')}</label>
              <input
                type="text"
                value={categoryForm.slug}
                onChange={(e) => handleCategoryFormChange('slug', e.target.value)}
                placeholder={t('admin.categoryForm.slugHint')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.categoryForm.icon')}</label>
              <input
                type="text"
                value={categoryForm.icon}
                onChange={(e) => handleCategoryFormChange('icon', e.target.value)}
                placeholder={t('admin.categoryForm.iconHint')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.categoryForm.order')}</label>
              <input
                type="number"
                value={categoryForm.order}
                onChange={(e) => handleCategoryFormChange('order', Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-500 mb-1">{t('admin.categoryForm.description')}</label>
              <textarea
                value={categoryForm.description}
                onChange={(e) => handleCategoryFormChange('description', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={categoryForm.is_active}
                onChange={(e) => handleCategoryFormChange('is_active', e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-600">{t('admin.categoryForm.active')}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowCategoryForm(false);
                resetCategoryForm();
              }}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              {t('admin.categoryForm.close')}
            </button>
            <button
              onClick={handleSubmitCategoryForm}
              disabled={categoryFormLoading}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {categoryFormLoading ? t('admin.categoryForm.saving') : editingCategory ? t('admin.categoryForm.update') : t('admin.categoryForm.create')}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-3">{t('admin.categoryTable.name')}</th>
              <th className="px-6 py-3">{t('admin.categoryTable.slug')}</th>
              <th className="px-6 py-3">{t('admin.categoryTable.order')}</th>
              <th className="px-6 py-3">{t('admin.categoryTable.status')}</th>
              <th className="px-6 py-3 text-right">{t('admin.categoryTable.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{category.name}</div>
                  <div className="text-xs text-slate-500">{category.description || t('admin.noDescription')}</div>
                </td>
                <td className="px-6 py-4 text-slate-500">{category.slug}</td>
                <td className="px-6 py-4 text-slate-500">{category.order}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleCategoryStatus(category)}
                    className={`px-3 py-1 rounded-full text-xs font-bold ${category.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}
                  >
                    {category.is_active ? t('admin.usersTable.active') : t('admin.usersTable.banned')}
                  </button>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="px-3 py-1 text-xs rounded-lg border border-slate-200 hover:bg-slate-100"
                  >
                    {t('admin.edit')}
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    className="px-3 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    {t('admin.delete')}
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                  {t('admin.categoryTable.empty')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t('admin.logsTitle')}</h2>
          <p className="text-sm text-slate-500">{t('admin.logsSubtitle')}</p>
        </div>
        <button
          onClick={refreshLogs}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 shadow-lg shadow-slate-200"
        >
          {t('admin.logsRefresh')}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {logsLoading ? (
          <div className="py-10 text-center text-slate-400">{t('admin.loading')}</div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center text-slate-400">{t('admin.logsEmpty')}</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">{t('admin.logsTime')}</th>
                <th className="px-6 py-3">{t('admin.logsUser')}</th>
                <th className="px-6 py-3">{t('admin.logsAction')}</th>
                <th className="px-6 py-3">{t('admin.logsResource')}</th>
                <th className="px-6 py-3">{t('admin.logsIP')}</th>
                <th className="px-6 py-3">{t('admin.logsDetails')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-slate-600 font-medium">
                    {log.user_id ? `#${log.user_id}` : '—'}
                  </td>
                  <td className="px-6 py-3 text-slate-500 uppercase tracking-wide text-xs">
                    {log.action}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {log.resource_type}
                    {log.resource_id ? ` #${log.resource_id}` : ''}
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    <div>{log.ip_address}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[200px]">{log.user_agent}</div>
                  </td>
                  <td className="px-6 py-3 text-slate-500">
                    {log.details || t('admin.noDetails')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderFinanceTab = () => (
    <div className="space-y-6 animate-fade-in">
      {/* 充值订单管理 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">充值订单</h2>
          <button onClick={refreshOrders} className="text-sm text-indigo-600 hover:underline">
            刷新
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {rechargeOrders.length === 0 ? (
            <div className="py-10 text-center text-slate-400">暂无充值订单</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">订单号</th>
                  <th className="px-6 py-3">用户ID</th>
                  <th className="px-6 py-3">积分</th>
                  <th className="px-6 py-3">金额</th>
                  <th className="px-6 py-3">支付方式</th>
                  <th className="px-6 py-3">状态</th>
                  <th className="px-6 py-3">创建时间</th>
                  <th className="px-6 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rechargeOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">{order.order_no}</td>
                    <td className="px-6 py-3 text-slate-600">#{order.user_id}</td>
                    <td className="px-6 py-3 font-bold text-indigo-600">{order.points}</td>
                    <td className="px-6 py-3 text-slate-600">￥{(order.amount / 100).toFixed(2)}</td>
                    <td className="px-6 py-3 text-slate-500">{order.payment_method === 'wechat' ? '微信' : '支付宝'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        order.status === 'APPROVED' || order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                        {order.status === 'PENDING' ? '待审核' :
                          order.status === 'APPROVED' ? '已批准' :
                            order.status === 'COMPLETED' ? '已完成' :
                              '已拒绝'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{new Date(order.created_at).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right">
                      {order.status === 'PENDING' && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleApproveOrder(order.id)}
                            className="text-xs px-3 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                          >
                            批准
                          </button>
                          <button
                            onClick={() => handleRejectOrder(order.id)}
                            className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                      {order.admin_note && (
                        <div className="text-xs text-slate-500 mt-1">{order.admin_note}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 充值套餐管理 */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">充值套餐管理</h2>
          <button onClick={handleAddPlan} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus size={16} />
            新增套餐
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {rechargePlans.map((plan) => (
            <div key={plan.id} className={`bg-white rounded-2xl border shadow-sm p-6 ${plan.is_featured ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-slate-100'}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-slate-800">{plan.name}</h3>
                {plan.is_featured && <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">推荐</span>}
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-indigo-600">￥{(plan.price / 100).toFixed(2)}</div>
                <div className="text-sm text-slate-500 mt-1">{plan.points} 积分</div>
              </div>
              {plan.description && <p className="text-sm text-slate-600 mb-4">{plan.description}</p>}
              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-1 rounded-full ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {plan.is_active ? '已启用' : '已禁用'}
                </span>
                <span className="text-slate-500">顺序: {plan.order}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => handleEditPlan(plan)} className="flex-1 text-xs px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
                  编辑
                </button>
                <button onClick={() => handleDeletePlan(plan.id)} className="text-xs px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
        {showPlanForm && !planQRImage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-slate-800 mb-4">{editingPlan ? '编辑套餐' : '新增套餐'}</h3>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">套餐名称</label>
                    <input type="text" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">类型</label>
                    <select value={planForm.plan_type} onChange={(e) => setPlanForm({ ...planForm, plan_type: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                      <option value="monthly">月度</option>
                      <option value="quarterly">季度</option>
                      <option value="yearly">年度</option>
                    </select>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">积分</label>
                    <input type="number" value={planForm.points} onChange={(e) => setPlanForm({ ...planForm, points: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">价格（元）</label>
                    <input type="number" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">描述</label>
                  <textarea value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">功能列表（JSON）</label>
                  <textarea value={planForm.features} onChange={(e) => setPlanForm({ ...planForm, features: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder='["feature1", "feature2"]' />
                </div>

                {/* 收款码上传 */}
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">收款码设置</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* 微信收款码 */}
                    <div className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Smartphone size={18} className="text-green-600" />
                        <span className="text-sm font-medium text-slate-700">微信收款码</span>
                      </div>
                      {planForm.wechat_qr_code ? (
                        <div className="space-y-2">
                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" style={{ width: '100%', aspectRatio: '1/1' }}>
                            <img src={planForm.wechat_qr_code} alt="WeChat QR" className="w-full h-full object-contain" />
                          </div>
                          <label className="block">
                            <span className="cursor-pointer text-xs text-green-600 hover:underline">
                              {uploadingPlanQR === 'wechat' ? '上传中...' : '重新上传'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleSelectPlanQRImage('wechat', e.target.files[0])}
                              disabled={uploadingPlanQR === 'wechat'}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="block">
                          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                            {uploadingPlanQR === 'wechat' ? (
                              <div className="text-xs text-green-600">上传中...</div>
                            ) : (
                              <>
                                <Upload size={24} className="mx-auto mb-2 text-slate-400" />
                                <div className="text-xs text-slate-500">点击上传</div>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleSelectPlanQRImage('wechat', e.target.files[0])}
                            disabled={uploadingPlanQR === 'wechat'}
                          />
                        </label>
                      )}
                    </div>

                    {/* 支付宝收款码 */}
                    <div className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CreditCard size={18} className="text-blue-600" />
                        <span className="text-sm font-medium text-slate-700">支付宝收款码</span>
                      </div>
                      {planForm.alipay_qr_code ? (
                        <div className="space-y-2">
                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" style={{ width: '100%', aspectRatio: '1/1' }}>
                            <img src={planForm.alipay_qr_code} alt="Alipay QR" className="w-full h-full object-contain" />
                          </div>
                          <label className="block">
                            <span className="cursor-pointer text-xs text-blue-600 hover:underline">
                              {uploadingPlanQR === 'alipay' ? '上传中...' : '重新上传'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleSelectPlanQRImage('alipay', e.target.files[0])}
                              disabled={uploadingPlanQR === 'alipay'}
                            />
                          </label>
                        </div>
                      ) : (
                        <label className="block">
                          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                            {uploadingPlanQR === 'alipay' ? (
                              <div className="text-xs text-blue-600">上传中...</div>
                            ) : (
                              <>
                                <Upload size={24} className="mx-auto mb-2 text-slate-400" />
                                <div className="text-xs text-slate-500">点击上传</div>
                              </>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleSelectPlanQRImage('alipay', e.target.files[0])}
                            disabled={uploadingPlanQR === 'alipay'}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">• 每个套餐可以设置不同的收款码，用户购买时将显示对应的二维码</p>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={planForm.is_active} onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm text-slate-700">启用</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={planForm.is_featured} onChange={(e) => setPlanForm({ ...planForm, is_featured: e.target.checked })} className="w-4 h-4" />
                      <span className="text-sm text-slate-700">推荐</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">排序</label>
                    <input type="number" value={planForm.order} onChange={(e) => setPlanForm({ ...planForm, order: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => setShowPlanForm(false)} className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">
                  取消
                </button>
                <button onClick={handleSavePlan} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  {editingPlan ? '保存' : '创建'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'users':
        return renderUsers();
      case 'content':
        return renderContentTab();
      case 'categories':
        return renderCategories();
      case 'finance':
        return renderFinanceTab();
      case 'logs':
        return renderLogs();
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-slate-500 text-sm font-medium mb-2">Total Visits</h3>
                <p className="text-3xl font-bold text-slate-900">{visitStats?.total_visits.toLocaleString() || 0}</p>
                <div className="mt-2 text-xs text-slate-500 flex items-center">
                  All time page views
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-slate-500 text-sm font-medium mb-2">Unique Visitors</h3>
                <p className="text-3xl font-bold text-slate-900">{visitStats?.unique_visitors.toLocaleString() || 0}</p>
                <div className="mt-2 text-xs text-slate-500 flex items-center">
                  Distinct sessions
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-slate-500 text-sm font-medium mb-2">Avg. Session Duration</h3>
                <p className="text-3xl font-bold text-slate-900">{visitStats?.avg_duration || 'N/A'}</p>
                <div className="mt-2 text-xs text-slate-400 flex items-center">
                  <Activity size={12} className="mr-1" />
                  Stable
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">访问记录</h3>
                <p className="text-sm text-slate-500 mt-1">共 {visitorLogsTotal} 条记录</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">访问时间</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">页面路径</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">IP地址</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">来源</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {visitorLogs.length > 0 ? (
                      visitorLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            {new Date(log.created_at).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            <code className="bg-slate-100 px-2 py-1 rounded text-xs">{log.page_path}</code>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                            {log.ip_address}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {log.referrer ? (
                              <span className="text-xs truncate max-w-xs block">{log.referrer}</span>
                            ) : (
                              <span className="text-slate-400 italic">直接访问</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-sm italic">
                          暂无访问记录
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      default:
        return <div className="p-12 text-center text-slate-400">{t('admin.comingSoon')}</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {cropperImage && (
        <ImageCropper
          image={cropperImage}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={1}
        />
      )}
      {planQRImage && (
        <ImageCropper
          image={planQRImage}
          onCropComplete={handlePlanQRCropComplete}
          onCancel={handlePlanQRCropCancel}
          aspectRatio={1}
        />
      )}

      {showStatsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-slate-800 mb-4">编辑文章数据</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">阅读量 (Views)</label>
                <input
                  type="number"
                  value={statsForm.views}
                  onChange={(e) => setStatsForm({ ...statsForm, views: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">下载量 (Downloads)</label>
                <input
                  type="number"
                  value={statsForm.downloads}
                  onChange={(e) => setStatsForm({ ...statsForm, downloads: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowStatsModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveStats}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            L
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">{t('admin.brand')}</span>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          <SidebarItem id="dashboard" icon={LayoutDashboard} label={t('admin.dashboard')} />
          <SidebarItem id="users" icon={Users} label={t('admin.users')} />
          <SidebarItem id="content" icon={FileText} label={t('admin.content')} />
          <SidebarItem id="finance" icon={Wallet} label={t('admin.finance')} />
          <SidebarItem id="categories" icon={Layers} label={t('admin.categories')} />
          <div className="pt-3 mt-3 border-t border-slate-100">
            <SidebarItem id="analytics" icon={BarChart} label="Analytics" />
            <SidebarItem id="logs" icon={Activity} label={t('admin.logs')} />
          </div>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:bg-slate-50 hover:text-red-600 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            {t('admin.exit')}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-lg font-semibold text-slate-800 capitalize">{tabTitles[activeTab]}</h1>
          <div className="flex items-center gap-4">
            <div className="bg-slate-100 px-3 py-2 rounded-lg flex items-center text-sm text-slate-500 w-64">
              <Search size={16} className="mr-2" />
              <input type="text" placeholder={t('admin.searchPlaceholder')} className="bg-transparent outline-none w-full" />
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">A</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {message && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-2 rounded-lg">
              {message}
            </div>
          )}
          {loading ? (
            <div className="text-center text-slate-400 py-16">{t('admin.loading')}</div>
          ) : (
            renderContent()
          )}
        </main>
      </div>

      {/* 通知弹窗 */}
      <NotificationSound
        isOpen={showNotification}
        onClose={() => setShowNotification(false)}
        title={notificationConfig.title}
        message={notificationConfig.message}
        type={notificationConfig.type}
        soundType={notificationConfig.soundType}
      />
    </div>
  );
};

export default AdminPanel;
