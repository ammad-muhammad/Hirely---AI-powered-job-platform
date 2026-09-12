'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  HelpCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User as UserIcon,
  Mail,
  ShieldAlert,
  Send,
  MessageSquare,
  FileText,
  KeyRound,
  UserCheck,
  CornerDownRight,
  Info,
} from 'lucide-react';
import { CinematicEntrance } from '@/components/animation/CinematicEntrance';
import { Modal } from '@/components/ui/Modal';
import { SelectDropdown } from '@/components/ui/SelectDropdown';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

interface TicketReply {
  _id?: string;
  sender: 'admin' | 'user';
  senderName?: string;
  message: string;
  sentAt: string;
  emailSent?: boolean;
}

interface SupportTicket {
  _id: string;
  ticketNumber?: string;
  name?: string;
  email?: string;
  userEmail?: string;
  userName?: string;
  userId?: {
    _id: string;
    email: string;
    fullName: string;
    role: string;
    isSuspended?: boolean;
  };
  subject: string;
  category: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  message?: string;
  description?: string;
  adminNotes?: string;
  replies?: TicketReply[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Detail Modal Edit State
  const [updateStatus, setUpdateStatus] = useState<string>('open');
  const [adminNotes, setAdminNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Reply Textarea state
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Quick Action feedback state
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/admin/support?status=${statusFilter === 'all' ? '' : statusFilter}`);
      if (res.data?.success) {
        setTickets(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching support tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const handleOpenTicketModal = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setUpdateStatus(ticket.status);
    setAdminNotes(ticket.adminNotes || '');
    setReplyMessage('');
    setActionSuccessMsg(null);
  };

  const handleSaveTicketUpdate = async () => {
    if (!selectedTicket) return;
    setIsUpdating(true);
    try {
      const res = await api.put(`/admin/support/${selectedTicket._id}`, {
        status: updateStatus,
        adminNotes: adminNotes,
      });

      if (res.data?.success) {
        setActionSuccessMsg('Ticket settings updated successfully.');
        setSelectedTicket(res.data.data);
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update ticket.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    setIsSendingReply(true);
    setActionSuccessMsg(null);

    try {
      const res = await api.post(`/admin/support/${selectedTicket._id}/reply`, {
        replyMessage: replyMessage.trim(),
        status: updateStatus,
      });

      if (res.data?.success) {
        setActionSuccessMsg(res.data.message || 'Reply saved and sent.');
        setSelectedTicket(res.data.data);
        setReplyMessage('');
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send reply to user.');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleQuickResetPassword = async (email: string) => {
    if (!confirm(`Generate and send password reset email to ${email}?`)) return;
    try {
      const res = await api.post('/admin/users/send-password-reset', { email });
      if (res.data?.success) {
        setActionSuccessMsg(`Password reset link dispatched to ${email}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch password reset link.');
    }
  };

  const handleQuickReactivateAccount = async (userId: string) => {
    if (!confirm('Reactivate this user account and unban user?')) return;
    try {
      const res = await api.put(`/admin/users/${userId}/reactivate`);
      if (res.data?.success) {
        setActionSuccessMsg('User account reactivated successfully.');
        fetchTickets();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reactivate account.');
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const email = t.email || t.userEmail || t.userId?.email || '';
    const name = t.name || t.userName || t.userId?.fullName || '';
    const subject = t.subject || '';
    const query = searchQuery.toLowerCase();
    return email.toLowerCase().includes(query) || name.toLowerCase().includes(query) || subject.toLowerCase().includes(query);
  });

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'open':
        return <Badge variant="info" className="bg-blue-600 text-white text-[9px] uppercase">Open</Badge>;
      case 'in_progress':
        return <Badge variant="primary" className="bg-purple-600 text-white text-[9px] uppercase">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="success" className="bg-emerald-600 text-white text-[9px] uppercase">Resolved</Badge>;
      case 'closed':
        return <Badge variant="outline" className="text-[9px] uppercase">Closed</Badge>;
      default:
        return <Badge variant="default" className="text-[9px] uppercase">{s}</Badge>;
    }
  };

  return (
    <CinematicEntrance>
      <div className="space-y-6 font-sans min-w-0 max-w-full bg-[#f6f7ed] dark:bg-zinc-950 min-h-screen p-6 md:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                Support Ticket Management Center
              </h1>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-extrabold border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                Support Operations
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              View inquiries submitted via /contact, reply to users with direct email delivery, and manage resolution statuses.
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={fetchTickets} isLoading={isLoading} className="text-xs font-bold gap-1.5 self-start sm:self-auto">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Inbox</span>
          </Button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search email, name, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Support Tickets Table Card */}
        <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-subtle rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">
                  <th className="py-3 px-4">Requester</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Replies</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500 font-semibold">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />
                        <span>Loading support ticket queue...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      No support tickets match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    const ticketEmail = ticket.email || ticket.userEmail || ticket.userId?.email || 'N/A';
                    const ticketName = ticket.name || ticket.userName || ticket.userId?.fullName;
                    const replyCount = ticket.replies?.length || 0;

                    return (
                      <tr key={ticket._id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-zinc-800 dark:text-zinc-200">
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{ticketEmail}</span>
                            {ticketName && <span className="text-[10px] text-zinc-500 dark:text-zinc-400 block font-normal">{ticketName}</span>}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 capitalize">
                            {ticket.category ? ticket.category.replace('_', ' ') : 'General'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate font-semibold text-zinc-900 dark:text-zinc-100">
                          {ticket.subject}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(ticket.status)}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            replyCount > 0
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : 'text-zinc-400'
                          }`}>
                            <MessageSquare className="w-3 h-3" />
                            {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400 text-[11px]">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenTicketModal(ticket)}
                            className="h-8 px-3 text-xs font-bold"
                          >
                            Inspect & Reply
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* TICKET DETAIL & REPLY THREAD MODAL */}
        <Modal
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          title={
            selectedTicket ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                  {selectedTicket.subject}
                </span>
              </div>
            ) : null
          }
          subtitle={selectedTicket ? `Submitted on ${new Date(selectedTicket.createdAt).toLocaleString()}` : undefined}
          maxWidth="2xl"
        >
          {selectedTicket && (
            <div className="space-y-6 font-sans text-xs">
              {actionSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
                  <span>{actionSuccessMsg}</span>
                  <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-600 font-bold hover:underline ml-2">
                    Dismiss
                  </button>
                </div>
              )}

              {/* Requester Identity & Quick Actions */}
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider block">Requester Contact</span>
                  <p className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                    {selectedTicket.name || selectedTicket.userName || 'Guest User'} ({selectedTicket.email || selectedTicket.userEmail || 'N/A'})
                  </p>
                  {selectedTicket.userId?.role && (
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase block mt-0.5">
                      User Role: {selectedTicket.userId.role} {selectedTicket.userId.isSuspended ? '• (SUSPENDED)' : ''}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(selectedTicket.email || selectedTicket.userEmail) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickResetPassword((selectedTicket.email || selectedTicket.userEmail)!)}
                      className="text-xs font-bold gap-1 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Password Reset</span>
                    </Button>
                  )}

                  {selectedTicket.userId?.isSuspended && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickReactivateAccount(selectedTicket.userId!._id)}
                      className="text-xs font-bold gap-1 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Reactivate</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* THREAD CONVERSATION HISTORY */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-zinc-500" />
                  Conversation History
                </h3>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {/* Initial Ticket Message */}
                  <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 border-b border-zinc-200/60 dark:border-zinc-700/60 pb-2">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {selectedTicket.name || selectedTicket.email || 'User Inquiry'}
                      </span>
                      <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {selectedTicket.message || selectedTicket.description || 'No message content provided.'}
                    </p>
                  </div>

                  {/* Threaded Admin & User Replies */}
                  {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                    selectedTicket.replies.map((r, idx) => (
                      <div
                        key={r._id || idx}
                        className={`p-4 rounded-2xl space-y-2 ${
                          r.sender === 'admin'
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 ml-4 border border-zinc-800 dark:border-zinc-200'
                            : 'bg-zinc-100 dark:bg-zinc-800 mr-4 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] opacity-80 border-b border-white/10 dark:border-zinc-900/10 pb-1.5">
                          <div className="flex items-center gap-1.5 font-bold">
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span>{r.senderName || (r.sender === 'admin' ? 'Hirely Support' : 'User')}</span>
                            {r.sender === 'admin' && (
                              <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-current">
                                Admin Reply
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {r.emailSent !== undefined && (
                              <span className={`text-[10px] font-semibold ${r.emailSent ? 'text-emerald-400 dark:text-emerald-600' : 'text-amber-400 dark:text-amber-600'}`}>
                                {r.emailSent ? '✓ Emailed' : '• Email Skipped'}
                              </span>
                            )}
                            <span>{new Date(r.sentAt).toLocaleString()}</span>
                          </div>
                        </div>
                        <p className="text-xs whitespace-pre-wrap leading-relaxed">{r.message}</p>
                      </div>
                    ))
                  ) : null}
                </div>
              </div>

              {/* REPLY INPUT AREA */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-indigo-500" />
                    Reply to User via Email & Save to Thread
                  </label>
                  <span className="text-[11px] text-zinc-400">
                    Will send email to {selectedTicket.email || selectedTicket.userEmail || 'user'}
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your response to the user here. On submission, this response will be saved in the ticket thread and emailed to the user..."
                  className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-all font-sans resize-y"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Set Ticket Status:</span>
                    <SelectDropdown
                      value={updateStatus}
                      onChange={(val) => setUpdateStatus(val)}
                      options={STATUS_OPTIONS}
                      direction="up"
                    />
                  </div>

                  <Button
                    onClick={handleSendReply}
                    isLoading={isSendingReply}
                    disabled={!replyMessage.trim()}
                    className="font-bold text-xs bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-6 rounded-xl"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Send Reply to User
                  </Button>
                </div>
              </div>

              {/* Internal Notes & Modal Close */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Internal admin notes (not visible to user)..."
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" onClick={handleSaveTicketUpdate} isLoading={isUpdating} className="text-xs font-bold">
                    Save Status & Notes Only
                  </Button>
                  <Button variant="ghost" onClick={() => setSelectedTicket(null)} className="text-xs">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </CinematicEntrance>
  );
}
