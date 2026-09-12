'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { SearchInput } from '@/components/ui/SearchInput';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  MessageSquare,
  Send,
  Paperclip,
  User as UserIcon,
  Building2,
  FileText,
  CheckCheck,
  Loader2,
  Briefcase,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  BadgeCheck,
  X,
  XCircle,
} from 'lucide-react';
import { ChatAttachmentRenderer } from '@/components/chat/ChatAttachmentRenderer';

export default function MessagesPage() {
  const { user } = useAuth();
  const {
    threads,
    activeThreadId,
    activeThread,
    messages,
    isPeerTyping,
    isLoadingThreads,
    isLoadingMessages,
    hasMoreThreads,
    loadMoreThreads,
    selectThread,
    sendMessage,
    uploadAttachment,
    sendTyping,
  } = useChat();

  const router = useRouter();
  const searchParams = useSearchParams();
  const paramThreadId = searchParams ? searchParams.get('threadId') : null;
  const paramTab = searchParams ? searchParams.get('tab') : null;

  const [inputMessage, setInputMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileView, setMobileView] = useState<'threads' | 'chat'>('threads');

  // Hirely Support Thread State
  const [isSupportActive, setIsSupportActive] = useState(false);
  const [adminMessages, setAdminMessages] = useState<any[]>([]);
  const [isLoadingAdminMessages, setIsLoadingAdminMessages] = useState(false);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);

  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch admin support messages & unread count
  const fetchAdminMessages = useCallback(async () => {
    setIsLoadingAdminMessages(true);
    try {
      const res = await api.get('/admin/user-inbox');
      if (res.data?.success) {
        setAdminMessages(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load admin support inbox:', err);
    } finally {
      setIsLoadingAdminMessages(false);
    }
  }, []);

  const fetchAdminUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/admin/user-inbox/unread-count');
      if (res.data?.success) {
        setAdminUnreadCount(res.data.count || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAdminUnreadCount();
    fetchAdminMessages();
  }, [fetchAdminUnreadCount, fetchAdminMessages]);

  const isClosingRef = useRef(false);

  // Check URL query parameters for support tab or threadId
  useEffect(() => {
    if (isClosingRef.current) return;

    if (paramTab === 'support' || paramThreadId === 'support') {
      setIsSupportActive(true);
      fetchAdminMessages();
      setMobileView('chat');
    } else if (paramThreadId && paramThreadId !== 'support') {
      setIsSupportActive(false);
      if (activeThreadId !== paramThreadId) {
        selectThread(paramThreadId);
      }
      setMobileView('chat');
    }
  }, [paramTab, paramThreadId, fetchAdminMessages, selectThread]);

  useEffect(() => {
    if (isSupportActive) {
      fetchAdminMessages();
    }
  }, [isSupportActive, fetchAdminMessages]);

  // Real-time socket listener for admin support messages
  useEffect(() => {
    let socketInstance: any = null;
    let isSubscribed = true;

    const setupSocket = async () => {
      socketInstance = await getSocket();
      if (!socketInstance || !isSubscribed) return;

      const handleAdminMsg = (msg: any) => {
        if (msg) {
          setAdminMessages((prev) => {
            const exists = prev.some((m) => m._id === msg._id);
            if (exists) return prev;
            return [...prev, msg];
          });
          fetchAdminUnreadCount();
        }
      };

      socketInstance.on('admin_message_received', handleAdminMsg);
      socketInstance.on('admin_user_reply', handleAdminMsg);
      socketInstance.on('admin_direct_message', handleAdminMsg);
    };

    setupSocket();

    return () => {
      isSubscribed = false;
      if (socketInstance) {
        socketInstance.off('admin_message_received');
        socketInstance.off('admin_user_reply');
        socketInstance.off('admin_direct_message');
      }
    };
  }, [fetchAdminUnreadCount]);

  // Auto-resize textarea height on content change
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputMessage]);

  // Fetch AI smart reply suggestions when active thread changes or new message arrives
  const fetchAISuggestions = useCallback(async (threadId: string) => {
    setIsLoadingSuggestions(true);
    try {
      const res = await api.get(`/chats/${threadId}/ai-suggestions`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAiSuggestions(res.data.data);
      }
    } catch {
      setAiSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (activeThreadId && !isSupportActive) {
      fetchAISuggestions(activeThreadId);
    } else {
      setAiSuggestions([]);
    }
  }, [activeThreadId, isSupportActive, messages.length, fetchAISuggestions]);

  // Handle "Write with AI" / "Polish with AI"
  const handleWriteWithAI = async () => {
    if (isGeneratingAI) return;
    setIsGeneratingAI(true);
    try {
      if (isSupportActive) {
        // AI refinement for support message
        setInputMessage((prev) =>
          prev ? `Dear Hirely Support,\n\n${prev}\n\nThank you.` : 'Dear Support Team,\n\nI need assistance regarding my account status.\n\nThank you.'
        );
      } else if (activeThreadId) {
        const res = await api.post(`/chats/${activeThreadId}/ai-generate`, {
          draftNotes: inputMessage,
        });
        if (res.data?.success && res.data?.data?.enhancedMessage) {
          setInputMessage(res.data.data.enhancedMessage);
        }
      }
    } catch (err: any) {
      console.error('AI chat generation error:', err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Auto-scroll messages container to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, adminMessages, isPeerTyping, isSupportActive]);

  const handleCloseChat = () => {
    isClosingRef.current = true;
    setIsSupportActive(false);
    selectThread(null);
    setMobileView('threads');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/dashboard/messages');
    }
    setTimeout(() => {
      isClosingRef.current = false;
    }, 400);
  };

  const handleThreadClick = (threadId: string) => {
    isClosingRef.current = false;
    setIsSupportActive(false);
    selectThread(threadId);
    setMobileView('chat');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `/dashboard/messages?threadId=${threadId}`);
    }
  };

  const handleOpenSupportTab = () => {
    isClosingRef.current = false;
    setIsSupportActive(true);
    selectThread(null);
    fetchAdminMessages();
    setMobileView('chat');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/dashboard/messages?tab=support');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isUploading) return;

    const textToSend = inputMessage;
    setInputMessage('');

    if (isSupportActive) {
      setIsUploading(true);
      try {
        const res = await api.post('/admin/user-inbox/reply', {
          message: textToSend,
        });
        if (res.data?.success && res.data?.data) {
          setAdminMessages((prev) => {
            const exists = prev.some((m) => m._id === res.data.data._id);
            if (exists) return prev;
            return [...prev, res.data.data];
          });
        }
      } catch (err) {
        console.error('Failed to send support message:', err);
      } finally {
        setIsUploading(false);
      }
    } else {
      await sendMessage(textToSend);
    }
  };

  const handleFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsUploading(true);

    try {
      if (isSupportActive) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await api.post('/admin/user-inbox/upload-attachment', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const attachmentUrl = uploadRes.data?.attachmentUrl || uploadRes.data?.data?.attachmentUrl;

        if (uploadRes.data?.success && attachmentUrl) {
          const replyRes = await api.post('/admin/user-inbox/reply', {
            message: `Sent attachment: ${file.name}`,
            attachmentUrl,
            fileName: file.name,
            fileType: file.type,
          });

          if (replyRes.data?.success && replyRes.data?.data) {
            setAdminMessages((prev) => {
              const exists = prev.some((m) => m._id === replyRes.data.data._id);
              if (exists) return prev;
              return [...prev, replyRes.data.data];
            });
          }
        }
      } else {
        const url = await uploadAttachment(file);
        if (url) {
          await sendMessage(`Uploaded attachment: ${file.name}`, url);
        }
      }
    } catch (err) {
      console.error('Attachment upload failed:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredThreads = threads.filter((t) => {
    const isJS = user?.role === 'job_seeker';
    const compName = isJS
      ? (t.otherParticipant.companyName || t.company?.name || t.otherParticipant.fullName)
      : t.otherParticipant.fullName;
    return (
      compName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const groupThreadsByCompany = (threadList: typeof threads) => {
    const groups: { [compName: string]: typeof threads } = {};
    threadList.forEach((t) => {
      const isJS = user?.role === 'job_seeker';
      const key = isJS
        ? (t.company?.name || t.otherParticipant.companyName || t.otherParticipant.fullName || 'Company')
        : (t.otherParticipant.fullName || 'Candidate');
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  };

  const showSupportTabInSidebar =
    adminMessages.length > 0 || adminUnreadCount > 0 || isSupportActive || paramTab === 'support';

  return (
    <ProtectedRoute>
      <div className="flex-1 w-full h-full flex overflow-hidden relative">
        {/* LEFT PANEL: THREADS LIST */}
        <aside
          className={`w-full md:w-80 lg:w-96 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0 h-full overflow-hidden transition-all duration-300 ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search Input */}
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <SearchInput
              placeholder="Search companies, roles, or applicants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Threads List Area (Scrollable with NO visible scrollbar) */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1 divide-y-0">
            {/* PINNED ITEM: HIRELY PLATFORM SUPPORT & OFFICIAL NOTICES (Only rendered if admin messaged) */}
            {showSupportTabInSidebar && (
              <button
                type="button"
                onClick={handleOpenSupportTab}
                className={`w-full text-left p-3 flex items-start gap-3 transition-all rounded-xl border ${
                  isSupportActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-md font-bold'
                    : adminUnreadCount > 0
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 hover:bg-amber-100/60'
                    : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/80'
                }`}
              >
                <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                  isSupportActive
                    ? 'bg-amber-400 text-zinc-900'
                    : 'bg-gradient-to-tr from-rose-600 to-amber-500 text-white'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h2 className={`text-xs font-bold flex items-center gap-1 truncate ${
                      isSupportActive ? 'text-white dark:text-zinc-900' : 'text-zinc-900 dark:text-zinc-100'
                    }`}>
                      <span>Hirely Support</span>
                      <BadgeCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    </h2>
                    {adminUnreadCount > 0 && !isSupportActive && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-600 text-white shrink-0 animate-pulse">
                        {adminUnreadCount}
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] truncate mt-0.5 ${
                    isSupportActive ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-500 dark:text-zinc-400'
                  }`}>
                    Platform notices, warnings & support
                  </p>
                </div>
              </button>
            )}

            <div className="pt-2 pb-1 px-2 flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
                Recruitment Chats
              </span>
            </div>

            {isLoadingThreads ? (
              <div className="p-2 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton variant="rectangular" className="w-10 h-10 rounded-full shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton variant="text" className="w-32 h-4" />
                      <Skeleton variant="text" className="w-48 h-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-6 text-center space-y-2 text-zinc-400">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-2">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                </p>
                <p className="text-[11px] text-zinc-500 leading-relaxed max-w-xs mx-auto">
                  {searchQuery
                    ? 'Try clearing your search query.'
                    : user?.role === 'job_seeker'
                    ? 'Submit job applications to connect directly with hiring managers.'
                    : 'Post job listings to initiate candidate application discussions.'}
                </p>
              </div>
            ) : (
              Object.entries(groupThreadsByCompany(filteredThreads)).map(([groupName, groupThreads]) => (
                <div key={groupName} className="space-y-1 mb-2">
                  {user?.role === 'job_seeker' && groupThreads.length > 0 && (
                    <div className="px-2 py-1.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 bg-zinc-100/80 dark:bg-zinc-800/60 rounded-lg border border-zinc-200 dark:border-zinc-700/60 mt-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                        <span className="truncate">{groupName}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-extrabold shrink-0">
                        {groupThreads.length} {groupThreads.length === 1 ? 'application' : 'applications'}
                      </span>
                    </div>
                  )}

                  {groupThreads.map((thread) => {
                    const isSelected = !isSupportActive && thread._id === activeThreadId;
                    const hasUnread = thread.unreadCount > 0 && !isSelected;
                    const isJobSeekerRole = user?.role === 'job_seeker';
                    const displayName = isJobSeekerRole
                      ? (thread.otherParticipant.companyName || thread.company?.name || thread.otherParticipant.fullName)
                      : thread.otherParticipant.fullName;
                    const avatarUrl = isJobSeekerRole
                      ? (thread.otherParticipant.companyLogoUrl || thread.otherParticipant.avatarUrl)
                      : thread.otherParticipant.avatarUrl;

                    return (
                      <button
                        key={thread._id}
                        onClick={() => handleThreadClick(thread._id)}
                        className={`w-full text-left p-3 flex items-start gap-3 rounded-xl transition-all ${
                          isSelected
                            ? 'bg-zinc-100 dark:bg-zinc-800/90 font-bold border-l-4 border-l-zinc-900 dark:border-l-zinc-100 shadow-xs'
                            : hasUnread
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-l-4 border-l-emerald-500 hover:bg-emerald-50'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40 border-l-4 border-l-transparent'
                        }`}
                      >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-xs">
                          {avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : isJobSeekerRole ? (
                            <Building2 className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                          ) : (
                            displayName.charAt(0) || 'U'
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Prominent Job Title Header */}
                          <div className="flex items-center justify-between gap-1">
                            <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                              <span className="truncate">{thread.jobTitle}</span>
                            </h3>
                            {thread.lastMessage && (
                              <span className="text-[10px] text-zinc-400 font-mono shrink-0">
                                {new Date(thread.lastMessage.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>

                          {/* Subtitle Company Name or Candidate Name */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 truncate flex items-center gap-1">
                              {isJobSeekerRole ? (
                                <>
                                  <Building2 className="w-3 h-3 text-zinc-400 shrink-0" />
                                  <span className="truncate">{displayName}</span>
                                </>
                              ) : (
                                <>
                                  <UserIcon className="w-3 h-3 text-zinc-400 shrink-0" />
                                  <span className="truncate">{displayName}</span>
                                </>
                              )}
                            </span>
                            {hasUnread && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-500 text-white shrink-0">
                                New
                              </span>
                            )}
                          </div>

                          {/* Last Message Snippet */}
                          <div className="flex items-center justify-between pt-0.5 gap-2">
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                              {thread.lastMessage
                                ? thread.lastMessage.text || 'Sent an attachment'
                                : 'No messages yet'}
                            </p>
                            {thread.unreadCount > 0 && !isSelected && (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shrink-0">
                                {thread.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}

            {hasMoreThreads && !isSupportActive && (
              <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMoreThreads}
                  isLoading={isLoadingThreads}
                  className="w-full text-xs font-semibold"
                >
                  Load More Conversations
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT PANEL: ACTIVE CHAT VIEW */}
        <main
          className={`flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden transition-all duration-300 ${
            mobileView === 'threads' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {isSupportActive ? (
            /* OFFICIAL HIRELY SUPPORT CHAT VIEW */
            <>
              <div className="h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-subtle">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileView('threads')}
                    className="md:hidden p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-600 to-amber-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>

                  <div className="space-y-0.5">
                    <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <span>Hirely Platform Support</span>
                      <BadgeCheck className="w-4 h-4 text-amber-500" />
                    </h2>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <span>Official Channel • Account status & admin notifications</span>
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseChat}
                  className="text-xs font-bold gap-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                  title="Close active chat"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Close Chat</span>
                </Button>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
                {isLoadingAdminMessages ? (
                  <div className="space-y-3 max-w-lg mx-auto py-4">
                    <Skeleton variant="rectangular" className="w-48 h-10 rounded-2xl" />
                    <Skeleton variant="rectangular" className="w-64 h-12 rounded-2xl ml-auto" />
                    <Skeleton variant="rectangular" className="w-56 h-10 rounded-2xl" />
                  </div>
                ) : adminMessages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-zinc-400 space-y-2 max-w-md mx-auto">
                    <ShieldCheck className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                    <p className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">Official Support Channel</p>
                    <p className="text-zinc-500 leading-relaxed">
                      You currently have no messages or warnings from Hirely Support. If you have any questions or require assistance, send a message below to connect with platform administrators.
                    </p>
                  </div>
                ) : (
                  adminMessages.map((msg) => {
                    const isAdmin = msg.senderRole === 'admin';
                    const isWarning = msg.message?.toLowerCase().includes('warning') || msg.message?.toLowerCase().includes('suspended') || msg.message?.toLowerCase().includes('policy');

                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-xl p-4 rounded-2xl text-xs space-y-2 shadow-subtle ${
                            isAdmin
                              ? isWarning
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-zinc-900 dark:text-zinc-100 border border-amber-300 dark:border-amber-800 rounded-bl-xs'
                                : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-bl-xs'
                              : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-br-xs font-medium'
                          }`}
                        >
                          {isAdmin && (
                            <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800 pb-1.5 mb-1 gap-2">
                              <span className="font-bold text-[11px] text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                {isWarning ? (
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                ) : (
                                  <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                                )}
                                {msg.senderName || 'Hirely Support'}
                              </span>
                              <span className="text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">
                                Official Admin
                              </span>
                            </div>
                          )}

                          <p className="whitespace-pre-line leading-relaxed">{msg.message}</p>

                          {msg.attachmentUrl && (
                            <ChatAttachmentRenderer
                              attachmentUrl={msg.attachmentUrl}
                              fileName={msg.fileName}
                              fileType={msg.fileType}
                              isSelf={!isAdmin}
                            />
                          )}

                          <div
                            className={`text-[9px] flex items-center justify-end gap-1 ${
                              isAdmin ? 'text-zinc-400' : 'text-zinc-400 dark:text-zinc-500'
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {!isAdmin && <CheckCheck className="w-3 h-3 text-zinc-400" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Input Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2 shrink-0"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileAttachment}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach document or screenshot for support"
                  className="p-2"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-900 dark:text-zinc-100" />
                  ) : (
                    <Paperclip className="w-4 h-4 text-zinc-500" />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingAI || isUploading}
                  onClick={handleWriteWithAI}
                  title="Format message professionally"
                  className="p-2 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/60 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                >
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </Button>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Reply to Hirely Support..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors shadow-subtle resize-none max-h-36 overflow-y-auto leading-relaxed"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!inputMessage.trim() || isUploading}
                  className="px-4 font-bold text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </>
          ) : activeThread ? (
            /* RECRUITMENT CHAT VIEW */
            <>
              {/* Conversation Top Header Bar */}
              <div className="h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between shrink-0 shadow-subtle">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setMobileView('threads')}
                    className="md:hidden p-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {(() => {
                    const isJS = user?.role === 'job_seeker';
                    const displayName = isJS
                      ? (activeThread.otherParticipant.companyName || activeThread.company?.name || activeThread.otherParticipant.fullName)
                      : activeThread.otherParticipant.fullName;
                    const avatarUrl = isJS
                      ? (activeThread.otherParticipant.companyLogoUrl || activeThread.otherParticipant.avatarUrl)
                      : activeThread.otherParticipant.avatarUrl;

                    return (
                      <>
                        <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-xs">
                          {avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : isJS ? (
                            <Building2 className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                          ) : (
                            displayName.charAt(0) || 'U'
                          )}
                        </div>

                        <div className="space-y-0.5 min-w-0">
                          <h2 className="text-xs font-black text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
                            <span>{displayName}</span>
                          </h2>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 truncate">
                            <Briefcase className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span className="font-extrabold text-zinc-700 dark:text-zinc-300 truncate">{activeThread.jobTitle}</span>
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseChat}
                  className="text-xs font-bold gap-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700 shrink-0"
                  title="Close active chat"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Close Chat</span>
                </Button>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                {isLoadingMessages ? (
                  <div className="flex-1 min-h-0 space-y-4 py-2">
                    <div className="flex items-start gap-2.5 max-w-md">
                      <Skeleton variant="rectangular" className="w-8 h-8 rounded-xl shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton variant="rectangular" className="w-52 h-12 rounded-2xl" />
                        <Skeleton variant="rectangular" className="w-24 h-3 rounded-md" />
                      </div>
                    </div>
                    <div className="flex items-end justify-end gap-2.5">
                      <div className="space-y-1.5 items-end flex flex-col">
                        <Skeleton variant="rectangular" className="w-64 h-14 rounded-2xl bg-zinc-300 dark:bg-zinc-800" />
                        <Skeleton variant="rectangular" className="w-20 h-3 rounded-md" />
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 max-w-md">
                      <Skeleton variant="rectangular" className="w-8 h-8 rounded-xl shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton variant="rectangular" className="w-44 h-10 rounded-2xl" />
                      </div>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-xs text-zinc-400 space-y-1">
                    <MessageSquare className="w-6 h-6 mx-auto opacity-50 mb-1" />
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300">No messages exchanged yet</p>
                    <p className="text-[11px] text-zinc-500">Send a message below to start the conversation.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (msg.isSystemMessage) {
                      return (
                        <div key={msg._id} className="flex justify-center my-3">
                          <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 text-center">
                            {msg.messageText}
                          </span>
                        </div>
                      );
                    }

                    const isSelf =
                      msg.senderId &&
                      typeof msg.senderId === 'object' &&
                      msg.senderId._id === user?.id;

                    return (
                      <div
                        key={msg._id}
                        className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md px-4 py-2.5 rounded-2xl text-xs space-y-1.5 shadow-subtle ${
                            isSelf
                              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-br-xs font-medium'
                              : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-bl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-line leading-relaxed">{msg.messageText}</p>

                          {msg.attachmentUrl && (
                            <ChatAttachmentRenderer
                              attachmentUrl={msg.attachmentUrl}
                              fileName={(msg as any).fileName || (msg as any).originalFileName}
                              fileType={(msg as any).fileType || (msg as any).resourceType}
                              isSelf={Boolean(isSelf)}
                            />
                          )}

                          <div
                            className={`text-[9px] flex items-center justify-end gap-1 ${
                              isSelf ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-400'
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isSelf && <CheckCheck className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing Indicator Pill */}
                {isPeerTyping && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start">
                    <div className="px-3 py-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px] font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{activeThread.otherParticipant.fullName} is typing...</span>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* AI Quick Reply Suggestion Chips */}
              {aiSuggestions.length > 0 && (
                <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 shrink-0">
                    <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" /> AI Suggestions:
                  </span>
                  {aiSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputMessage(suggestion)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-amber-400 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-all shrink-0 shadow-subtle truncate max-w-[240px] cursor-pointer"
                      title={suggestion}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2 shrink-0"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileAttachment}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach image or PDF document"
                  className="p-2"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-900 dark:text-zinc-100" />
                  ) : (
                    <Paperclip className="w-4 h-4 text-zinc-500" />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingAI || isUploading}
                  onClick={handleWriteWithAI}
                  title="Polish draft notes or compose professional response with AI"
                  className="p-2 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/60 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                >
                  {isGeneratingAI ? (
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  )}
                </Button>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Type your message or click ✨ Write with AI..."
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    sendTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors shadow-subtle resize-none max-h-36 overflow-y-auto leading-relaxed"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!inputMessage.trim() || isUploading}
                  className="px-4 font-bold text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Select a conversation</h3>
              <p className="text-xs max-w-xs text-zinc-500">
                Choose a chat thread from the left panel or click Hirely Support to communicate with platform administrators.
              </p>
            </div>
          )}
        </main>
      </div>

    </ProtectedRoute>
  );
}
