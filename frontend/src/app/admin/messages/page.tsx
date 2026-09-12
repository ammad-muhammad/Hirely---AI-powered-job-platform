'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  MessageSquare,
  Search,
  Paperclip,
  Send,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  User as UserIcon,
  Eye,
  RefreshCw,
  X,
  CheckCheck,
  ShieldCheck,
  Download,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import { getResumeViewUrl } from '@/utils/fileHelpers';
import { ChatAttachmentRenderer } from '@/components/chat/ChatAttachmentRenderer';
import { useNotifications } from '@/context/NotificationContext';

interface UserParticipant {
  _id: string;
  fullName: string;
  email: string;
  role: 'job_seeker' | 'employer' | 'admin';
  avatarUrl?: string;
  isSuspended?: boolean;
}

interface ConversationItem {
  user: UserParticipant;
  lastMessage?: {
    text: string;
    senderRole: 'admin' | 'user';
    createdAt: string;
    attachmentUrl?: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface AdminChatMessage {
  _id: string;
  userId: string;
  adminId?: string;
  senderRole: 'admin' | 'user';
  senderName: string;
  message?: string;
  attachmentUrl?: string;
  fileName?: string;
  fileType?: 'image' | 'pdf' | 'doc' | 'other';
  isRead: boolean;
  createdAt: string;
}

export default function AdminMessagesPage() {
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('userId');

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId);
  const [selectedUser, setSelectedUser] = useState<UserParticipant | null>(null);
  const [messages, setMessages] = useState<AdminChatMessage[]>([]);
  
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [search, setSearch] = useState('');

  // Input & Upload State
  const [msgInput, setMsgInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    attachmentUrl: string;
    fileName: string;
    fileType: 'image' | 'pdf' | 'doc' | 'other';
  } | null>(null);

  // Lightbox Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch Conversation Threads List
  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/admin/conversations?${params.toString()}`);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setConversations(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching admin conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [search]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // If initialUserId provided in query params, ensure target user is selected
  useEffect(() => {
    if (!initialUserId) return;
    setSelectedUserId(initialUserId);

    const existing = conversations.find((c) => c.user._id === initialUserId);
    if (existing) {
      setSelectedUser(existing.user);
    } else {
      // Fetch user profile info directly
      api.get(`/admin/users/${initialUserId}`).then((res) => {
        if (res.data?.success && res.data?.data?.user) {
          setSelectedUser(res.data.data.user);
        }
      }).catch(() => {});
    }
  }, [initialUserId, conversations]);

  const { fetchNotifications } = useNotifications();

  // Fetch Messages for Selected User
  const fetchUserMessages = useCallback(async (uId: string) => {
    setIsLoadingMessages(true);
    try {
      const res = await api.get(`/admin/messages/${uId}`);
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setMessages(res.data.data);
        setConversations((prev) =>
          prev.map((c) => (c.user._id === uId ? { ...c, unreadCount: 0 } : c))
        );
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error fetching user message thread:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserMessages(selectedUserId);
    } else {
      setMessages([]);
      setSelectedUser(null);
    }
  }, [selectedUserId, fetchUserMessages]);

  // Auto-scroll to bottom of messages container
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const selectedUserIdRef = useRef(selectedUserId);
  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);

  // Socket.io Real-Time Updates Listener
  useEffect(() => {
    let socketInstance: any = null;

    const initSocket = async () => {
      socketInstance = await getSocket();
      if (!socketInstance) return;

      const handleIncomingMessage = (newMsg: AdminChatMessage) => {
        fetchConversations();

        const currentSelectedId = selectedUserIdRef.current;
        const incomingUserId = typeof newMsg.userId === 'object' ? (newMsg.userId as any)._id : newMsg.userId;

        if (currentSelectedId && incomingUserId && incomingUserId.toString() === currentSelectedId.toString()) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === newMsg._id)) return prev;
            return [...prev, newMsg];
          });
        }
      };

      socketInstance.on('admin_user_reply', handleIncomingMessage);
      socketInstance.on('admin_message_received', handleIncomingMessage);
    };

    initSocket();

    return () => {
      if (socketInstance) {
        socketInstance.off('admin_user_reply');
        socketInstance.off('admin_message_received');
      }
    };
  }, [fetchConversations]);

  // Select User Conversation
  const handleSelectConversation = (item: ConversationItem) => {
    setSelectedUserId(item.user._id);
    setSelectedUser(item.user);
    setConversations((prev) =>
      prev.map((c) => (c.user._id === item.user._id ? { ...c, unreadCount: 0 } : c))
    );
    fetchNotifications();
  };

  // Handle Attachment File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/admin/messages/upload-attachment', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.data) {
        setAttachedFile({
          attachmentUrl: res.data.data.attachmentUrl,
          fileName: res.data.data.fileName,
          fileType: res.data.data.fileType,
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload attachment file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Send Direct Message
  const handleSendMessage = async () => {
    if (!selectedUserId) return;
    if (!msgInput.trim() && !attachedFile) return;

    setIsSending(true);
    try {
      const body: any = {
        message: msgInput.trim() || undefined,
      };
      if (attachedFile) {
        body.attachmentUrl = attachedFile.attachmentUrl;
        body.fileName = attachedFile.fileName;
        body.fileType = attachedFile.fileType;
      }

      const res = await api.post(`/admin/messages/${selectedUserId}`, body);
      if (res.data?.success && res.data?.data) {
        setMessages((prev) => [...prev, res.data.data]);
        setMsgInput('');
        setAttachedFile(null);
        fetchConversations();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch message.');
    } finally {
      setIsSending(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="primary" size="sm" className="whitespace-nowrap shrink-0 text-[10px]">Admin</Badge>;
      case 'employer':
        return <Badge variant="info" size="sm" className="whitespace-nowrap shrink-0 text-[10px]">Employer</Badge>;
      default:
        return <Badge variant="default" size="sm" className="whitespace-nowrap shrink-0 text-[10px]">Job Seeker</Badge>;
    }
  };

  const renderAttachmentBubble = (m: AdminChatMessage, isAdmin: boolean) => {
    if (!m.attachmentUrl) return null;
    return (
      <ChatAttachmentRenderer
        attachmentUrl={m.attachmentUrl}
        fileName={m.fileName}
        fileType={m.fileType}
        isSelf={isAdmin}
      />
    );
  };

  return (
    <div className="flex-1 h-full min-h-0 w-full flex flex-col font-sans bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
      {/* Main Grid: Threads List on Left, Active Chat on Right */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 h-full overflow-hidden">

        {/* LEFT COLUMN: CONVERSATION THREADS DIRECTORY */}
        <div className="lg:col-span-4 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden h-full bg-white dark:bg-zinc-900">
          {/* Search Box */}
          <div className="shrink-0 p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3 bg-zinc-50/50 dark:bg-zinc-950/40">

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search candidate or employer..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-medium"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-bold px-1">
              <span>ACTIVE CONVERSATIONS</span>
              <span>{conversations.length} Threads</span>
            </div>
          </div>

          {/* Threads Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 scrollbar-thin">
            {isLoadingConversations ? (
              <div className="p-8 text-center text-xs text-zinc-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-zinc-500" />
                <p>Loading user conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 space-y-2">
                <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto opacity-50" />
                <p className="font-bold text-zinc-700 dark:text-zinc-300">No Conversations Found</p>
                <p className="text-[11px]">Select a user from User Management to start a new chat.</p>
              </div>
            ) : (
              conversations.map((item) => {
                const isSelected = selectedUserId === item.user._id;
                const hasUnread = item.unreadCount > 0;

                return (
                  <div
                    key={item.user._id}
                    onClick={() => handleSelectConversation(item)}
                    className={`p-4 cursor-pointer transition-all flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                        : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                        isSelected
                          ? 'bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white'
                          : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      }`}
                    >
                      {item.user.fullName ? item.user.fullName.charAt(0) : 'U'}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs truncate">{item.user.fullName}</span>
                        {item.lastMessage && (
                          <span
                            className={`text-[10px] font-mono shrink-0 ${
                              isSelected ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-400'
                            }`}
                          >
                            {new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs truncate font-medium ${
                            isSelected ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {item.lastMessage ? item.lastMessage.text || '📎 Attachment document' : 'No messages exchanged yet'}
                        </p>

                        {hasUnread && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center shrink-0 shadow-xs">
                            {item.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CHAT CONVERSATION WINDOW */}
        <div className="lg:col-span-8 flex flex-col overflow-hidden h-full bg-white dark:bg-zinc-900">
          {selectedUser ? (
            <>
              {/* Active User Header */}
              <div className="shrink-0 h-14 px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    {selectedUser.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-black text-sm text-zinc-900 dark:text-zinc-100">{selectedUser.fullName}</h2>
                      {getRoleBadge(selectedUser.role)}
                    </div>
                    <span className="text-[11px] text-zinc-500 block">{selectedUser.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/admin/users/${selectedUser._id}`}>
                    <Button variant="outline" size="sm" className="text-xs font-bold gap-1.5 rounded-xl">
                      <Eye className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Inspect Dossier</span>
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3 bg-zinc-50/60 dark:bg-zinc-950/60 scrollbar-thin">
                {isLoadingMessages ? (
                  <div className="p-12 text-center text-xs text-zinc-400 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-zinc-500" />
                    <p>Loading secure thread history...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="p-12 text-center text-xs text-zinc-400 space-y-2">
                    <MessageSquare className="w-10 h-10 text-zinc-300 mx-auto opacity-50" />
                    <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">No Messages Exchanged Yet</p>
                    <p>Type an official message or attach a PDF/Word/Image document below to start chatting.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = m.senderRole === 'admin';

                    return (
                      <div key={m._id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs space-y-1 ${
                            isAdmin
                              ? 'bg-[#1f1f1f] text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-br-xs'
                              : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80 rounded-bl-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 text-[10px] opacity-75 font-semibold">
                            <span className="uppercase tracking-wider font-extrabold">{m.senderName}</span>
                            <div className="flex items-center gap-1">
                              <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isAdmin && <CheckCheck className="w-3 h-3 text-emerald-400" />}
                            </div>
                          </div>

                          {m.message && (
                            <p className="text-xs leading-relaxed font-normal whitespace-pre-wrap">{m.message}</p>
                          )}

                          {renderAttachmentBubble(m, isAdmin)}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Attachment Preview Chip */}
              {attachedFile && (
                <div className="shrink-0 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-bold truncate">
                    <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Attached: <strong className="underline">{attachedFile.fileName}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="p-1 rounded-full text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Chat Input Composer */}
              <div className="shrink-0 p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2">

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={isUploading}
                  className="rounded-xl px-3 py-2.5 text-xs font-bold shrink-0 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  title="Attach PDF, Word document, or image"
                >
                  <Paperclip className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                </Button>

                <input
                  type="text"
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={`Write official message to ${selectedUser.fullName}...`}
                  className="flex-1 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-medium"
                />

                <Button
                  onClick={handleSendMessage}
                  isLoading={isSending}
                  disabled={!msgInput.trim() && !attachedFile}
                  className="bg-[#1f1f1f] hover:bg-black text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl px-5 py-2.5 text-xs font-black flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-zinc-400 space-y-3">
              <MessageSquare className="w-12 h-12 text-zinc-300 dark:text-zinc-700 opacity-50" />
              <div className="space-y-1">
                <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100">No Conversation Selected</h3>
                <p className="text-xs max-w-sm">Select a user thread from the left panel or click "Message User" from the User Management directory.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LIGHTBOX MODAL FOR IMAGE PREVIEW */}
      <Modal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title="Attachment Image Lightbox"
        maxWidth="lg"
      >
        {previewImage && (
          <div className="space-y-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Preview"
              className="max-h-[80vh] w-auto max-w-full mx-auto rounded-2xl border border-zinc-800 shadow-modal object-contain"
            />
            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href={previewImage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-extrabold hover:bg-black"
              >
                <Download className="w-4 h-4" /> Open Original Image
              </a>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
