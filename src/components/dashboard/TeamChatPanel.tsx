import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, MessageCircle, X, Paperclip, Loader2, CheckCheck, Smile } from "lucide-react";
import { toast } from "sonner";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { softDeleteRecord } from "@/lib/softDelete";

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (e) {
    // Ignore audio playback errors
  }
};

export function TeamChatPanel() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isOnlineDropdownOpen, setIsOnlineDropdownOpen] = useState(false);
  
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const popupRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [freshFileUrls, setFreshFileUrls] = useState<Record<string, string>>({});
  
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  
  const [mentionPopups, setMentionPopups] = useState<any[]>([]);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const currentUserRef = useRef<any>(null);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Draggable logic for floating bubble
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    hasMoved.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    const rect = e.currentTarget.getBoundingClientRect();
    elementStartPos.current = { x: rect.left, y: rect.top };
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    hasMoved.current = false;
    dragStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const rect = e.currentTarget.getBoundingClientRect();
    elementStartPos.current = { x: rect.left, y: rect.top };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved.current = true;
      }
      let newX = elementStartPos.current.x + dx;
      let newY = elementStartPos.current.y + dy;
      const padding = 10;
      const btnSize = 56;
      newX = Math.max(padding, Math.min(window.innerWidth - btnSize - padding, newX));
      newY = Math.max(padding, Math.min(window.innerHeight - btnSize - padding, newY));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - dragStartPos.current.x;
      const dy = e.touches[0].clientY - dragStartPos.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMoved.current = true;
      }
      let newX = elementStartPos.current.x + dx;
      let newY = elementStartPos.current.y + dy;
      const padding = 10;
      const btnSize = 56;
      newX = Math.max(padding, Math.min(window.innerWidth - btnSize - padding, newX));
      newY = Math.max(padding, Math.min(window.innerHeight - btnSize - padding, newY));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const currentUserFirstName = currentUser?.user_metadata?.full_name?.split(' ')[0] || currentUser?.email?.split('@')[0] || "";

  console.log('messages:', messages);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
      if (isOnlineDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOnlineDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isOnlineDropdownOpen]);

  useEffect(() => {
    let isMounted = true;

    // Get current user and team members
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted) setCurrentUser(user);
    });

    const fetchTeam = async () => {
      const { data } = await supabase.from('profiles').select('full_name, id, avatar_url');
      if (isMounted && data) setTeamMembers(data);
    };
    fetchTeam();

    const profileChannel = supabase
      .channel('public:profiles_chat')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        if (isMounted) {
          setTeamMembers(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m));
        }
      })
      .subscribe();
    
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('team_chat')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) console.error('Fetch error:', error);
      else if (isMounted && data) setMessages([...data].reverse());
    };

    fetchMessages();

    const fetchUserProfile = async () => {
      if (!currentUser?.id) return;
      const { data, error } = await supabase.from('profiles').select('role, full_name').eq('id', currentUser.id).single();
      if (!error && isMounted && data) {
        if (data.role) setCurrentUserRole(data.role);
        if (data.full_name) {
          setCurrentUser((prev: any) => ({
            ...prev,
            user_metadata: {
              ...prev?.user_metadata,
              full_name: prev?.user_metadata?.full_name || data.full_name
            }
          }));
        }
      }
    };

    fetchUserProfile();

    const resolvePresenceName = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUser.id)
        .single();

      return (
        profile?.full_name ||
        currentUser?.user_metadata?.full_name ||
        currentUser?.user_metadata?.name ||
        currentUser?.email?.split('@')[0] ||
        'Team Member'
      );
    };

    const dedupeUsers = (users: any[]) => {
      return Object.values(
        users.reduce((acc: Record<string, any>, user: any) => {
          const key = user.user_id || user.user_name || user.email || user.online_at || JSON.stringify(user);
          if (!acc[key]) acc[key] = user;
          return acc;
        }, {})
      );
    };

    let presenceChannel: any;
    if (currentUser?.id) {
      presenceChannel = supabase.channel('online-users', {
        config: { presence: { key: currentUser.id } }
      });

      presenceChannel.on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = Object.values(state).flat();
        const uniqueUsers = dedupeUsers(users);
        if (isMounted) {
          setOnlineUsers(uniqueUsers);
          setOnlineCount(uniqueUsers.length);
        }
      }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const displayName = await resolvePresenceName();
          await presenceChannel.track({
            user_id: currentUser.id,
            user_name: displayName,
            online_at: new Date().toISOString()
          });
        }
      });
    }

    return () => {
      isMounted = false;
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
      }
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const channel = supabase
      .channel('team-chat-' + Math.random())
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_chat'
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
          if (!isOpen && payload.new.sender_id !== currentUser?.id) {
            setUnreadCount(prev => prev + 1);
          }
          
          const cUser = currentUserRef.current;
          if (cUser && payload.new.sender_id !== cUser.id) {
            playNotificationSound();
            const currentUserName = cUser.user_metadata?.full_name?.split(' ')[0] || cUser.email?.split('@')[0] || "";
            if (currentUserName && payload.new.message?.toLowerCase().includes('@' + currentUserName.toLowerCase())) {
              const popupId = Date.now() + Math.random();
              setMentionPopups(prev => {
                const newPopups = [...prev, { ...payload.new, popupId }];
                if (newPopups.length > 3) {
                  return newPopups.slice(newPopups.length - 3);
                }
                return newPopups;
              });

              setTimeout(() => {
                setMentionPopups(prev => prev.filter(p => p.popupId !== popupId));
              }, 5000);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, currentUser?.id]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    const messageText = inputText.trim();

    const { error } = await supabase.from('team_chat').insert({
      sender_name: currentUser?.email || 'Unknown',
      sender_id: currentUser?.id,
      message: messageText
    });

    if (error) {
      console.error('Send error:', error);
      toast.error('Failed to send message: ' + error.message);
    } else {
      setInputText("");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError || !uploadData) {
        toast.error("File upload failed: " + (uploadError?.message || 'Unknown error'));
        console.error(uploadError);
        return;
      }

      const sender_name = currentUser?.email || 'Unknown';
      const { error: dbError } = await supabase.from('team_chat').insert({
        sender_name,
        sender_id: currentUser?.id,
        message: file.name,
        file_url: uploadData.path,
        file_type: file.type,
        file_size: file.size
      });

      if (dbError) {
        toast.error('Failed to send file message');
        console.error(dbError);
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatTime = (ts: string) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (size: number) => {
    if (size > 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / 1024).toFixed(1)} KB`;
  };

  const canManageMessage = (msg: any) => {
    if (!currentUser) return false;
    const isMe = msg.sender_id === currentUser.id || msg.sender_name === currentUser.email;
    return isMe || currentUserRole === 'admin';
  };

  const canEditMessage = (msg: any) => {
    if (!currentUser) return false;
    return msg.sender_id === currentUser.id || msg.sender_name === currentUser.email;
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await softDeleteRecord('team_chat', messageId, {
        resourceType: 'team_chat_message',
        resourceName: `Team chat message ${messageId}`,
      });
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      if (activeMenuMessageId === messageId) {
        setActiveMenuMessageId(null);
      }
    } catch (error: any) {
      console.error('Soft delete error:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleStartEditMessage = (msg: any) => {
    setEditingMessageId(msg.id);
    setEditingMessageText(msg.message || '');
    setActiveMenuMessageId(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingMessageText('');
  };

  const handleSaveEditMessage = async (messageId: string) => {
    const newText = editingMessageText.trim();
    if (!newText) {
      toast.error('Message cannot be empty');
      return;
    }
    const { error } = await supabase.from('team_chat').update({ message: newText, edited: true }).eq('id', messageId);
    if (error) {
      console.error('Edit error:', error);
      toast.error('Failed to save changes');
      return;
    }
    setMessages((prev) => prev.map((msg) => msg.id === messageId ? { ...msg, message: newText, edited: true } : msg));
    setEditingMessageId(null);
    setEditingMessageText('');
  };

  const getFileIcon = (type?: string) => {
    if (!type) return '📎';
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.includes('word') || type === 'application/msword' || type.includes('officedocument.wordprocessingml.document')) return '📝';
    if (type.includes('excel') || type === 'spreadsheetml' || type === 'csv' || type === 'text/csv' || type === 'application/vnd.ms-excel') return '📊';
    return '📎';
  };

  const getFileTitle = (type?: string) => {
    if (!type) return 'File attachment';
    if (type.startsWith('image/')) return 'Image attachment';
    if (type === 'application/pdf') return 'PDF document';
    if (type.includes('word') || type === 'application/msword' || type.includes('officedocument.wordprocessingml.document')) return 'Word document';
    if (type.includes('excel') || type.includes('spreadsheetml') || type === 'text/csv' || type === 'application/vnd.ms-excel') return 'Spreadsheet';
    return 'File attachment';
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getFreshUrl = async (filePath: string) => {
    if (!filePath) return undefined;
    if (filePath.startsWith('http')) return filePath;

    const { data, error } = await supabase.storage
      .from('chat-attachments')
      .createSignedUrl(filePath, 3600);

    if (error) {
      console.error('Failed to create signed url for', filePath, error);
      return undefined;
    }
    return data?.signedUrl;
  };

  const handleImageClick = async (filePath: string) => {
    const url = freshFileUrls[filePath] || await getFreshUrl(filePath);
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadMessage = async (filePath: string, fileName: string) => {
    const url = freshFileUrls[filePath] || await getFreshUrl(filePath);
    if (!url) return;
    await handleDownload(url, fileName);
  };

  useEffect(() => {
    if (!isOpen || messages.length === 0) return;

    const uniquePaths = Array.from(new Set(messages
      .filter((msg) => msg.file_url)
      .map((msg) => msg.file_url)
      .filter((path) => typeof path === 'string' && !path.startsWith('http'))
    )) as string[];

    const fetchUrls = async () => {
      const pathsToFetch = uniquePaths.filter(path => !freshFileUrls[path]);
      if (pathsToFetch.length === 0) return;

      try {
        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .createSignedUrls(pathsToFetch, 3600);

        if (error) {
          console.error('Failed to create signed urls:', error);
          return;
        }

        if (data) {
          const newUrls: Record<string, string> = {};
          data.forEach(item => {
            if (item.signedUrl) {
              newUrls[item.path] = item.signedUrl;
            }
          });
          setFreshFileUrls(prev => ({ ...prev, ...newUrls }));
        }
      } catch (err) {
        console.error('Error in batch fetchUrls:', err);
      }
    };

    fetchUrls();
  }, [isOpen, messages, freshFileUrls]);

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const renderMessage = (text: string, isMe: boolean) => {
    if (!text) return { __html: "" };
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const mentionColor = isMe ? '#000000' : '#f0a500';
    const mentionHtml = `<span style="color:${mentionColor}; font-weight:800; text-decoration: underline;">@$1</span>`;
    const html = escaped.replace(/@(\w+)/g, mentionHtml);
    return { __html: html };
  };

  const hasUnreadMention = unreadCount > 0 && messages.slice(-unreadCount).some(m => currentUserFirstName && m.message?.includes(`@${currentUserFirstName}`));

  return (
    <>
      {/* MENTION POPUPS */}
      <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 pointer-events-none print:hidden">
        {mentionPopups.map((popup) => (
          <div 
            key={popup.popupId} 
            className="pointer-events-auto bg-[#1a1a1a] border-[1.5px] border-[#f0a500] rounded-xl p-4 w-[300px] animate-in slide-in-from-right duration-300 shadow-xl"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="text-[#f0a500] text-sm font-bold flex items-center gap-1.5">
                💬 Someone mentioned you
              </div>
              <button 
                onClick={() => setMentionPopups(prev => prev.filter(p => p.popupId !== popup.popupId))}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="font-bold text-white text-[14px] mb-1">
              {popup.sender_name}
            </div>
            
            <div className="text-gray-400 text-[13px] line-clamp-2 leading-snug mb-3">
              {popup.message}
            </div>
            
            <div className="flex justify-between items-end">
              <button
                onClick={() => {
                  setIsOpen(true);
                  setHighlightMessageId(popup.id);
                  setMentionPopups(prev => prev.filter(p => p.popupId !== popup.popupId));
                  setTimeout(() => {
                    const el = document.getElementById(`msg-${popup.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 300);
                  setTimeout(() => {
                    setHighlightMessageId(null);
                  }, 3000);
                }}
                className="text-[12px] bg-[#f0a500] text-black px-3 py-1.5 rounded-lg font-bold hover:bg-[#ffb515] transition-colors"
              >
                View Message
              </button>
              <div className="text-[10px] text-gray-500">
                {formatTime(popup.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isOpen && (
        <button
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onClick={() => {
            if (!hasMoved.current) {
              setIsOpen(true);
            }
          }}
          className="h-14 w-14 rounded-full bg-[#1a1a1a] border-2 border-[#f0a500] flex items-center justify-center shadow-lg hover:scale-105 transition-transform group relative cursor-move select-none touch-none print:hidden"
          style={
            position
              ? {
                  position: 'fixed',
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  zIndex: 9999,
                }
              : {
                  position: 'fixed',
                  bottom: '24px',
                  right: '24px',
                  zIndex: 9999,
                }
          }
        >
          <MessageCircle className="h-6 w-6 text-[#f0a500] group-hover:fill-[#f0a500]/20 transition-colors" />
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: hasUnreadMention ? '#f0a500' : '#ff3b30',
              color: hasUnreadMention ? 'black' : 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '11px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
      )}

      {/* BACKDROP OVERLAY */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 print:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SLIDING SIDEBAR PANEL */}
      <div 
        ref={popupRef}
        className={`fixed top-0 right-0 w-[380px] h-screen bg-[#1a1a1a] border-l border-[#2a2a2a] flex flex-col z-50 overflow-hidden shadow-2xl transition-transform duration-300 ease-in-out print:hidden ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
          {/* HEADER */}
          <div className="h-[60px] shrink-0 bg-[#f0a500] flex flex-col justify-center px-4 relative">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-black leading-tight">Team Chat</h3>
                <button
                  type="button"
                  onClick={() => setIsOnlineDropdownOpen((prev) => !prev)}
                  className="mt-1 inline-flex items-center gap-2 text-[11px] font-medium text-black/70 hover:text-black transition-colors"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-green-700" />
                  <span>Live • {onlineCount} online</span>
                  <span className="text-xs">▾</span>
                </button>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-black/70 hover:text-black hover:bg-black/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isOnlineDropdownOpen && (
              <div
                ref={dropdownRef}
                className="absolute left-4 top-full mt-2 w-[240px] max-h-[250px] overflow-y-auto bg-[#1a1a1a] border-2 border-[#f0a500] rounded-xl p-3 z-[99999] shadow-2xl scrollbar-thin scrollbar-thumb-white/10"
                style={{ maxHeight: '250px', overflowY: 'auto' }}
              >
                {onlineUsers.length > 0 ? (
                  onlineUsers.map((user, idx) => (
                    <div
                      key={`${user.user_id || user.user_name}-${idx}`}
                      className="pb-2 mb-2 border-b border-white/10 last:mb-0 last:border-b-0"
                    >
                      <div className="flex items-center gap-2 text-sm text-white">
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                        <span className="truncate">{user.user_name || user.email?.split('@')[0] || 'Team Member'}</span>
                      </div>
                      {(currentUserRole === 'admin' || currentUserRole === 'manager') && user.online_at && (
                        <div className="text-[11px] text-white/60 mt-1 pl-4.5">
                          Last active: {formatTime(user.online_at)}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-[13px] text-white/70">No users online</div>
                )}
              </div>
            )}
          </div>

          {/* MESSAGES AREA */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#111111]">
            {messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const msgDateObj = new Date(msg.created_at);
              const msgDate = msgDateObj.toLocaleDateString();
              const prevDate = prevMsg ? new Date(prevMsg.created_at).toLocaleDateString() : null;
              const showDate = msgDate !== prevDate;
              
              let dateDisplay = msgDate;
              const today = new Date().toLocaleDateString();
              const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
              if (msgDate === today) dateDisplay = "Today";
              else if (msgDate === yesterday) dateDisplay = "Yesterday";
              else dateDisplay = msgDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

              const isMe = currentUser && (msg.sender_id === currentUser.id || msg.sender_name === currentUser.email);
              const senderDisplay = msg.sender_name?.includes('@')
                ? msg.sender_name.split('@')[0]
                : msg.sender_name || 'Unknown';
              const hasMention = currentUserFirstName && msg.message?.includes(`@${currentUserFirstName}`);
              const senderProfile = teamMembers.find((m) => m.id === msg.sender_id);
              const senderAvatar = senderProfile?.avatar_url;
              
              return (
                <div key={msg.id || idx} className="flex flex-col w-full gap-4">
                  {showDate && (
                    <div className="flex justify-center my-2">
                      <span className="text-[10px] font-medium bg-black/40 text-white/60 px-3 py-1 rounded-full border border-white/5 shadow-sm">
                        {dateDisplay}
                      </span>
                    </div>
                  )}
                  <div 
                    id={`msg-${msg.id}`}
                    className={`flex w-full transition-colors duration-500 ${isMe ? 'justify-end' : 'justify-start'} ${(hasMention && !isMe) || highlightMessageId === msg.id ? 'border-l-[3px] border-[#f0a500] pl-2' : ''} ${highlightMessageId === msg.id ? 'bg-[#f0a500]/10 py-1' : ''}`}
                  >
                  <div className={`group flex max-w-[85%] gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className="shrink-0 flex items-end">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-white/10 overflow-hidden ${isMe ? 'bg-[#f0a500] text-black' : 'bg-[#444] text-white'}`}>
                        {senderAvatar ? (
                          <img src={senderAvatar} alt="avatar" className="h-full w-full object-cover" />
                        ) : (
                          getInitials(senderDisplay || "U")
                        )}
                      </div>
                    </div>

                    {/* Bubble */}
                    <div 
                      className={`relative px-3 py-2 ${
                        isMe 
                          ? 'bg-[#f0a500] text-black rounded-[18px_18px_4px_18px]' 
                          : 'bg-[#2a2a2a] text-white rounded-[18px_18px_18px_4px]'
                      }`}
                    >
                      {!isMe && (
                        <div className="text-[11px] font-bold text-[#f0a500] mb-0.5">
                          {senderDisplay}
                        </div>
                      )}

                      {canManageMessage(msg) && !editingMessageId && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuMessageId((prev) => (prev === msg.id ? null : msg.id));
                          }}
                          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/20 text-white/70 hover:text-white hover:bg-black/40 transition-opacity opacity-0 group-hover:opacity-100"
                        >
                          ⋮
                        </button>
                      )}

                      {activeMenuMessageId === msg.id && !editingMessageId && (
                        <div className="absolute top-10 right-2 z-20 min-w-[150px] bg-[#1a1a1a] border border-[#f0a500] rounded-xl shadow-2xl overflow-hidden">
                          {canEditMessage(msg) && (
                            <button
                              type="button"
                              onClick={() => handleStartEditMessage(msg)}
                              className="w-full text-left px-3 py-2 text-sm text-white hover:text-white hover:bg-white/5 transition-colors"
                            >
                              ✏️ Edit
                            </button>
                          )}
                          {canManageMessage(msg) && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteConfirm(msg.id);
                                setActiveMenuMessageId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-white hover:text-red-500 hover:bg-white/5 transition-colors"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      )}

                      {editingMessageId === msg.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingMessageText}
                            onChange={(e) => setEditingMessageText(e.target.value)}
                            className="w-full min-h-[88px] rounded-xl border border-white/10 bg-[#111111] px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#f0a500]"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="rounded-lg border border-white/10 px-3 py-1 text-sm text-white/80 hover:text-white hover:border-white/20 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditMessage(msg.id)}
                              className="rounded-lg bg-[#f0a500] px-3 py-1 text-sm font-semibold text-black hover:bg-[#ffb515] transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : msg.file_url ? (
                        <div className="mt-1">
                          {msg.file_type?.startsWith('image/') ? (
                            <img
                              src={freshFileUrls[msg.file_url] || (msg.file_url.startsWith('http') ? msg.file_url : undefined)}
                              alt="attachment"
                              onClick={() => handleImageClick(msg.file_url)}
                              style={{ cursor: 'pointer', maxWidth: '200px', borderRadius: '8px' }}
                              className="max-h-[200px] object-cover border border-white/10 hover:opacity-90 transition-opacity"
                            />
                          ) : (
                            <div className={`flex items-center gap-3 p-3 rounded-lg border ${isMe ? 'border-black/20 bg-black/5' : 'border-white/10 bg-white/5'}`}>
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg">
                                {getFileIcon(msg.file_type)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate max-w-[150px]">{msg.message}</p>
                                {msg.file_size && <p className="text-[9px] opacity-70 mt-0.5">{formatFileSize(msg.file_size)}</p>}
                                <button
                                  type="button"
                                  onClick={() => handleDownloadMessage(msg.file_url, msg.message)}
                                  className={`text-[10px] font-semibold mt-1 block ${isMe ? 'text-black/70 hover:text-black' : 'text-[#f0a500] hover:text-[#ffd15c]'} transition-colors`}
                                >
                                  Download
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p 
                          className="text-[13px] leading-snug whitespace-pre-wrap break-words break-all"
                          dangerouslySetInnerHTML={renderMessage(msg.message, Boolean(isMe))}
                        />
                      )}

                      {msg.edited && !editingMessageId && (
                        <div className="text-[10px] mt-1 text-white/50">(edited)</div>
                      )}

                      <div className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${isMe ? 'text-black/60' : 'text-white/40'}`}>
                        <span>{formatTime(msg.created_at)}</span>
                        {isMe && <CheckCheck className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT AREA */}
          <div className="shrink-0 p-3 bg-[#1a1a1a] border-t border-[#2a2a2a] relative">
            {showMentions && (
              <div className="absolute bottom-full left-0 mb-2 w-[calc(100%-24px)] mx-3 max-h-48 overflow-y-auto bg-[#1a1a1a] border border-[#f0a500] rounded-lg shadow-lg z-50">
                {teamMembers
                  .filter(m => !mentionSearch || m.full_name?.toLowerCase().includes(mentionSearch.toLowerCase()))
                  .map(member => (
                    <button
                      key={member.id}
                      onClick={() => {
                        const mentionName = member.full_name?.split(' ')[0] || "User";
                        const newText = inputText.replace(/@([a-zA-Z0-9_]*)$/, `@${mentionName} `);
                        setInputText(newText);
                        setShowMentions(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#2a2a2a] text-sm text-white"
                    >
                      {member.full_name}
                    </button>
                  ))
                }
              </div>
            )}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 z-50">
                <EmojiPicker
                  onEmojiClick={(emojiObject) => {
                    setInputText(prev => prev + emojiObject.emoji);
                    setShowEmojiPicker(false);
                  }}
                  theme={Theme.DARK}
                />
              </div>
            )}
            <div className="flex items-end gap-2 relative">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute left-2 bottom-1.5 h-8 w-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute left-10 bottom-1.5 h-8 w-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Smile className="h-4 w-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                hidden 
                accept="image/*,.pdf,.doc,.docx,.xlsx,.xls,.txt,.csv,.zip" 
                onChange={handleFileUpload} 
              />
              <textarea
                value={inputText}
                disabled={isUploading}
                onChange={(e) => {
                  const val = e.target.value;
                  setInputText(val);
                  const match = val.match(/@([a-zA-Z0-9_]*)$/);
                  if (match) {
                    setMentionSearch(match[1]);
                    setShowMentions(true);
                  } else {
                    setShowMentions(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowMentions(false);
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isUploading) handleSend();
                  }
                }}
                placeholder={isUploading ? "Uploading..." : "Type a message..."}
                className="w-full bg-[#2a2a2a] text-white text-sm rounded-2xl py-2.5 pl-[72px] pr-12 resize-none focus:outline-none focus:ring-1 focus:ring-[#f0a500] max-h-32 min-h-[44px]"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!inputText.trim() || isUploading}
                className="absolute right-2 bottom-1.5 h-8 w-8 rounded-full bg-[#f0a500] text-black flex items-center justify-center disabled:opacity-50 transition-opacity hover:bg-[#ffb515]"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Send className="h-4 w-4 shrink-0 -ml-0.5" />}
              </button>
            </div>
          </div>
          {deleteConfirm && (
            <div style={{
              position: 'absolute',
              bottom: '70px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1a1a1a',
              border: '1px solid #f0a500',
              borderRadius: '12px',
              padding: '16px 20px',
              zIndex: 99999,
              textAlign: 'center',
              minWidth: '220px'
            }}>
              <p style={{ color: 'white', marginBottom: '12px', fontSize: '14px' }}>
                🗑️ Delete this message?
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button 
                  onClick={() => { handleDeleteMessage(deleteConfirm); setDeleteConfirm(null) }}
                  style={{ background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Delete
                </button>
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  style={{ background: '#333', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
    </>
  );
}
