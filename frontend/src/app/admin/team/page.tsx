'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Shield,
  UserPlus,
  Trash2,
  Edit,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  User as UserIcon,
} from 'lucide-react';
import { CinematicEntrance } from '@/components/animation/CinematicEntrance';
import { Modal } from '@/components/ui/Modal';

interface SubAdmin {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  status: 'active' | 'suspended';
  createdAt: string;
  adminPermissions: {
    canViewOverview: boolean;
    canManageUsers: boolean;
    canManageJobs: boolean;
    canManageVerifications: boolean;
    canManageBilling: boolean;
    canManageFraudDetection: boolean;
    canManageSettings: boolean;
    canManageSupport: boolean;
    canManageAdmins: boolean;
  };
}

const PERMISSION_KEYS = [
  { key: 'canViewOverview', label: 'View Overview & Analytics' },
  { key: 'canManageUsers', label: 'User & Account Management' },
  { key: 'canManageJobs', label: 'Job Postings Management' },
  { key: 'canManageVerifications', label: 'Employer Verifications' },
  { key: 'canManageBilling', label: 'Billing & Subscriptions' },
  { key: 'canManageFraudDetection', label: 'Fraud Detection System' },
  { key: 'canManageSupport', label: 'Support & Account Recovery' },
  { key: 'canManageSettings', label: 'Platform Maintenance Settings' },
  { key: 'canManageAdmins', label: 'Sub-Admin Team Delegation' },
];

export default function AdminTeamPage() {
  const { user: currentUser } = useAuth();
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SubAdmin | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    permissions: {
      canViewOverview: true,
      canManageUsers: true,
      canManageJobs: true,
      canManageVerifications: true,
      canManageBilling: false,
      canManageFraudDetection: true,
      canManageSettings: false,
      canManageSupport: true,
      canManageAdmins: false,
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchTeam = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/team');
      if (res.data?.success) {
        setSubAdmins(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching admin team:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleOpenAddModal = () => {
    setEditingAdmin(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      permissions: {
        canViewOverview: true,
        canManageUsers: true,
        canManageJobs: true,
        canManageVerifications: true,
        canManageBilling: false,
        canManageFraudDetection: true,
        canManageSettings: false,
        canManageSupport: true,
        canManageAdmins: false,
      },
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (admin: SubAdmin) => {
    setEditingAdmin(admin);
    setFormData({
      fullName: admin.fullName,
      email: admin.email,
      password: '',
      permissions: {
        canViewOverview: admin.adminPermissions?.canViewOverview ?? true,
        canManageUsers: admin.adminPermissions?.canManageUsers ?? true,
        canManageJobs: admin.adminPermissions?.canManageJobs ?? true,
        canManageVerifications: admin.adminPermissions?.canManageVerifications ?? true,
        canManageBilling: admin.adminPermissions?.canManageBilling ?? false,
        canManageFraudDetection: admin.adminPermissions?.canManageFraudDetection ?? true,
        canManageSettings: admin.adminPermissions?.canManageSettings ?? false,
        canManageSupport: admin.adminPermissions?.canManageSupport ?? true,
        canManageAdmins: admin.adminPermissions?.canManageAdmins ?? false,
      },
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleTogglePermission = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !((prev.permissions as any)[key]),
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);
    setSuccessMsg(null);

    try {
      if (editingAdmin) {
        const payload: any = { permissions: formData.permissions };
        if (formData.password) payload.password = formData.password;

        const res = await api.put(`/admin/team/${editingAdmin._id}`, payload);
        if (res.data?.success) {
          setSuccessMsg('Sub-admin permissions updated successfully.');
          setIsModalOpen(false);
          fetchTeam();
        }
      } else {
        if (!formData.email || !formData.password || !formData.fullName) {
          setFormError('Name, email, and password are required.');
          setIsSaving(false);
          return;
        }

        const res = await api.post('/admin/team', {
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          permissions: formData.permissions,
        });

        if (res.data?.success) {
          setSuccessMsg('New Sub-Admin account created successfully.');
          setIsModalOpen(false);
          fetchTeam();
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save sub-admin account.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubAdmin = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to revoke sub-admin status for ${name}?`)) return;

    try {
      const res = await api.delete(`/admin/team/${id}`);
      if (res.data?.success) {
        setSuccessMsg(`Revoked sub-admin status for ${name}`);
        fetchTeam();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete sub-admin.');
    }
  };

  const filteredAdmins = subAdmins.filter(
    (a) =>
      a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <CinematicEntrance>
      <div className="space-y-6 font-sans min-w-0 max-w-full bg-zinc-50 dark:bg-zinc-950 min-h-screen p-6 md:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#1f1f1f] dark:text-zinc-100 tracking-tight">
                Admin Team & Role Delegation
              </h1>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-extrabold border-zinc-300 dark:border-zinc-700 bg-white">
                Super Admin Console
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Grant granular permissions, manage sub-administrators, and maintain access control safety.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchTeam} isLoading={isLoading} className="text-xs font-bold gap-1.5 rounded-xl">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Team</span>
            </Button>
            <Button size="sm" onClick={handleOpenAddModal} className="text-xs font-bold gap-1.5 bg-[#1f1f1f] text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl">
              <UserPlus className="w-3.5 h-3.5 text-purple-400" />
              <span>Add Sub-Admin</span>
            </Button>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search sub-admins by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        {/* Team Members List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-xs font-semibold text-zinc-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
              <span>Loading admin team roster...</span>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-zinc-500">
              No administrator accounts found.
            </div>
          ) : (
            filteredAdmins.map((admin) => (
              <Card key={admin._id} className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle flex flex-col justify-between space-y-4 rounded-2xl">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-sm">
                        {admin.fullName ? admin.fullName.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                          <span>{admin.fullName}</span>
                          {admin.isSuperAdmin && (
                            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                        </h3>
                        <span className="text-[11px] text-zinc-500 font-medium block truncate max-w-[180px]">{admin.email}</span>
                      </div>
                    </div>

                    <Badge
                      variant={admin.isSuperAdmin ? 'primary' : 'outline'}
                      className="text-[9px] uppercase tracking-wider font-extrabold"
                    >
                      {admin.isSuperAdmin ? 'Super Admin' : 'Sub-Admin'}
                    </Badge>
                  </div>

                  {/* Permissions Chips */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">
                      Delegated Privileges
                    </span>
                    {admin.isSuperAdmin ? (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        Full Unrestricted Platform Access
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {PERMISSION_KEYS.map(({ key, label }) => {
                          const hasPerm = admin.adminPermissions?.[key as keyof typeof admin.adminPermissions] !== false;
                          if (!hasPerm) return null;
                          return (
                            <span
                              key={key}
                              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                            >
                              {label.split(' ')[0]}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">
                    Joined {new Date(admin.createdAt).toLocaleDateString()}
                  </span>

                  {!admin.isSuperAdmin && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditModal(admin)}
                        className="h-8 px-2 text-xs font-bold text-zinc-700 dark:text-zinc-300"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSubAdmin(admin._id, admin.fullName)}
                        className="h-8 px-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* CREATE / EDIT MODAL */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-600" />
              <span>{editingAdmin ? 'Edit Sub-Admin Permissions' : 'Add New Sub-Administrator'}</span>
            </div>
          }
          maxWidth="lg"
        >
          <div className="space-y-4 font-sans text-xs">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
              {!editingAdmin && (
                <>
                  <div>
                    <label className="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Full Name</label>
                    <Input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Sarah Connor"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">Email Address</label>
                    <Input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="sarah@company.com"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-extrabold text-zinc-700 dark:text-zinc-300 mb-1">
                  {editingAdmin ? 'Set New Password (optional)' : 'Initial Password'}
                </label>
                <Input
                  type="password"
                  required={!editingAdmin}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••••••"
                />
              </div>

              {/* Granular Permissions Checklist */}
              <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 block">
                  Granular Access Controls & Module Permissions
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {PERMISSION_KEYS.map(({ key, label }) => {
                    const isChecked = (formData.permissions as any)[key];
                    return (
                      <label
                        key={key}
                        onClick={() => handleTogglePermission(key)}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <span className="font-bold text-xs">{label}</span>
                        {isChecked ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 text-zinc-400 shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="text-xs font-bold">
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSaving} className="text-xs font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {editingAdmin ? 'Save Permissions' : 'Create Sub-Admin'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      </div>
    </CinematicEntrance>
  );
}
