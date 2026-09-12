'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import { useAuth } from './AuthContext';
import { Bell, CheckCircle2, X } from 'lucide-react';

export interface ChatThreadItem {
  _id: string;
  company?: {
    name: string;
    logoUrl?: string | null;
  } | null;
  otherParticipant: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    isCompany?: boolean;
    companyName?: string | null;
    companyLogoUrl?: string | null;
  };
  jobTitle: string;
  lastMessage?: {
    text: string;
    attachmentUrl?: string;
    createdAt: string;
    isSystemMessage?: boolean;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface ChatMessageItem {
  _id: string;
  threadId: string;
  senderId?: {
    _id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    role?: string;
  } | null;
  messageText: string;
  attachmentUrl?: string | null;
  isSystemMessage: boolean;
  isRead: boolean;
  createdAt: string;
}

interface ApplicationStatusNotification {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  newStatus: string;
  updatedAt: string;
}

interface ChatContextType {
  socket: Socket | null;
  threads: ChatThreadItem[];
  activeThreadId: string | null;
  activeThread: ChatThreadItem | null;
  messages: ChatMessageItem[];
  totalUnreadCount: number;
  isPeerTyping: boolean;
  isLoadingThreads: boolean;
  isLoadingMessages: boolean;
  hasMoreThreads: boolean;
  selectThread: (threadId: string | null) => void;
  sendMessage: (text: string, attachmentUrl?: string) => Promise<void>;
  uploadAttachment: (file: File) => Promise<string | null>;
  sendTyping: () => void;
  refreshThreads: () => Promise<void>;
  loadMoreThreads: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  const [threads, setThreads] = useState<ChatThreadItem[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState<number>(0);
  const [isPeerTyping, setIsPeerTyping] = useState<boolean>(false);

  const [isLoadingThreads, setIsLoadingThreads] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [threadPage, setThreadPage] = useState<number>(1);
  const [hasMoreThreads, setHasMoreThreads] = useState<boolean>(false);

  const [statusToast, setStatusToast] = useState<ApplicationStatusNotification | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch total unread count for navbar badge
  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const response = await api.get('/chats/unread-count');
      if (response.data?.success) {
        setTotalUnreadCount(response.data.data.unreadCount || 0);
      }
    } catch {
      setTotalUnreadCount(0);
    }
  }, [user]);

  // Fetch threads list
  const refreshThreads = useCallback(async () => {
    if (!user) return;
    setIsLoadingThreads(true);
    try {
      const response = await api.get('/chats?page=1&limit=20');
      if (response.data?.success && response.data?.data) {
        setThreads(
          response.data.data.map((t: ChatThreadItem) =>
            t._id === activeThreadId ? { ...t, unreadCount: 0 } : t
          )
        );
        setThreadPage(1);
        setHasMoreThreads(response.data.pagination?.hasMore || false);
      }
    } catch {
      setThreads([]);
    } finally {
      setIsLoadingThreads(false);
    }
  }, [user, activeThreadId]);

  const loadMoreThreads = useCallback(async () => {
    if (!user || !hasMoreThreads || isLoadingThreads) return;
    const nextPage = threadPage + 1;
    setIsLoadingThreads(true);
    try {
      const response = await api.get(`/chats?page=${nextPage}&limit=20`);
      if (response.data?.success && response.data?.data) {
        setThreads((prev) => [
          ...prev,
          ...response.data.data.map((t: ChatThreadItem) =>
            t._id === activeThreadId ? { ...t, unreadCount: 0 } : t
          ),
        ]);
        setThreadPage(nextPage);
        setHasMoreThreads(response.data.pagination?.hasMore || false);
      }
    } catch (err) {
      console.error('Failed to load more threads:', err);
    } finally {
      setIsLoadingThreads(false);
    }
  }, [user, hasMoreThreads, isLoadingThreads, threadPage, activeThreadId]);

  const userId = user?.id;

  // Initialize Socket connection once per user session
  useEffect(() => {
    if (!userId) {
      disconnectSocket();
      setSocket(null);
      setThreads([]);
      setTotalUnreadCount(0);
      return;
    }

    let isMounted = true;
    getSocket().then((s) => {
      if (isMounted && s) {
        setSocket(s);
      }
    });

    refreshUnreadCount();
    refreshThreads();

    return () => {
      isMounted = false;
    };
  }, [userId, refreshUnreadCount, refreshThreads]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg: ChatMessageItem) => {
      const senderIdStr =
        newMsg.senderId && typeof newMsg.senderId === 'object'
          ? newMsg.senderId._id
          : newMsg.senderId;

      const isForActiveThread = newMsg.threadId === activeThreadId;

      if (isForActiveThread) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === newMsg._id)) return prev;
          return [...prev, newMsg];
        });
        if (senderIdStr !== user?.id) {
          socket.emit('mark_read', { threadId: activeThreadId });
        }
      }

      const isSelf = senderIdStr === user?.id;

      // Update thread last message and timestamp
      setThreads((prev) => {
        const threadExists = prev.some((t) => t._id === newMsg.threadId);
        if (!threadExists) {
          refreshThreads();
          return prev;
        }

        return prev
          .map((t) => {
            if (t._id === newMsg.threadId) {
              const isCurrentlyActive = t._id === activeThreadId;
              return {
                ...t,
                lastMessage: {
                  text: newMsg.messageText,
                  attachmentUrl: newMsg.attachmentUrl || undefined,
                  createdAt: newMsg.createdAt,
                  isSystemMessage: newMsg.isSystemMessage,
                },
                unreadCount: isCurrentlyActive || isSelf ? 0 : (t.unreadCount || 0) + 1,
                updatedAt: newMsg.createdAt,
              };
            }
            return t;
          })
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });

      refreshUnreadCount();
    };

    const handleUserTyping = ({ threadId, userId: typingUserId, isTyping }: { threadId: string; userId: string; isTyping: boolean }) => {
      if (threadId === activeThreadId && typingUserId !== user?.id) {
        setIsPeerTyping(isTyping);
      }
    };

    const handleNotification = (data?: { threadId?: string }) => {
      if (data?.threadId === activeThreadId) {
        socket.emit('mark_read', { threadId: activeThreadId });
      }
      refreshUnreadCount();
      refreshThreads();
    };

    const handleApplicationStatusUpdated = (data: ApplicationStatusNotification) => {
      // Trigger global toast notification across all dashboard pages
      setStatusToast(data);
      setTimeout(() => setStatusToast(null), 6000);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('thread_notification', handleNotification);
    socket.on('application_status_updated', handleApplicationStatusUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('thread_notification', handleNotification);
      socket.off('application_status_updated', handleApplicationStatusUpdated);
    };
  }, [socket, activeThreadId, user, refreshUnreadCount, refreshThreads]);

  // Load message history when selecting a thread
  const selectThread = useCallback(async (threadId: string | null) => {
    setActiveThreadId(threadId);
    setIsPeerTyping(false);

    if (!threadId) {
      setMessages([]);
      return;
    }

    // Join room via socket
    if (socket) {
      socket.emit('join_thread', { threadId });
      socket.emit('mark_read', { threadId });
    }

    setIsLoadingMessages(true);
    try {
      const response = await api.get(`/chats/${threadId}/messages`);
      if (response.data?.success && response.data?.data) {
        setMessages(response.data.data);
      }
    } catch {
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
      refreshUnreadCount();
      // Reset unread count locally for this thread
      setThreads((prev) =>
        prev.map((t) => (t._id === threadId ? { ...t, unreadCount: 0 } : t))
      );
    }
  }, [socket, refreshUnreadCount]);

  // Send message via socket with HTTP REST fallback
  const sendMessage = async (text: string, attachmentUrl?: string) => {
    if (!activeThreadId || (!text.trim() && !attachmentUrl)) return;

    const messageText = text.trim();

    if (socket && socket.connected) {
      socket.emit('send_message', {
        threadId: activeThreadId,
        messageText,
        attachmentUrl,
      });
      socket.emit('stop_typing', { threadId: activeThreadId });
    } else {
      // Fallback: send message over HTTP REST API if socket is disconnected or connecting
      try {
        const response = await api.post(`/chats/${activeThreadId}/messages`, {
          messageText,
          attachmentUrl,
        });

        if (response.data?.success && response.data?.data) {
          const newMsg = response.data.data;
          setMessages((prev) => {
            if (prev.some((m) => m._id === newMsg._id)) return prev;
            return [...prev, newMsg];
          });

          refreshThreads();
        }
      } catch (err) {
        console.error('[Chat] HTTP send message fallback failed:', err);
      }
    }
  };

  // Upload attachment file via REST endpoint
  const uploadAttachment = async (file: File): Promise<string | null> => {
    if (!activeThreadId) return null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('resume', file);

      const response = await api.post(`/chats/${activeThreadId}/upload-attachment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.success) {
        const attachmentUrl = response.data.attachmentUrl || response.data.data?.attachmentUrl;
        if (attachmentUrl) return attachmentUrl;
      }
      return null;
    } catch (err) {
      console.error('Attachment upload failed:', err);
      return null;
    }
  };

  // Emit typing indicator
  const sendTyping = () => {
    if (!activeThreadId || !socket) return;
    socket.emit('typing', { threadId: activeThreadId });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { threadId: activeThreadId });
    }, 2000);
  };

  const activeThread = threads.find((t) => t._id === activeThreadId) || null;

  return (
    <ChatContext.Provider
      value={{
        socket,
        threads,
        activeThreadId,
        activeThread,
        messages,
        totalUnreadCount,
        isPeerTyping,
        isLoadingThreads,
        isLoadingMessages,
        hasMoreThreads,
        selectThread,
        sendMessage,
        uploadAttachment,
        sendTyping,
        refreshThreads,
        loadMoreThreads,
        refreshUnreadCount,
      }}
    >
      {children}

      {/* Global Application Status Notification Toast Banner */}
      <AnimatePresence>
        {statusToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 max-w-sm p-4 rounded-xl bg-slate-900 text-white border border-brand-500/40 shadow-2xl space-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-400 font-bold text-xs">
                <Bell className="w-4 h-4 animate-bounce" />
                <span>Application Status Update</span>
              </div>
              <button onClick={() => setStatusToast(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-200">
              Your application for <strong>"{statusToast.jobTitle}"</strong> is now:
            </p>
            <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase bg-brand-600 text-white tracking-wider">
              {statusToast.newStatus.replace('_', ' ')}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
