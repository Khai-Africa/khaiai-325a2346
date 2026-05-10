import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, ArrowUp, Menu, X, Volume2, Square, Phone, RotateCcw, ArrowDown, Pencil, Copy, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import logo from "@/assets/kai-ai-logo.png";
import Sidebar from "./Sidebar";
import ChatInputMenu from "./ChatInputMenu";
import PlusMenu from "./PlusMenu";
import MessageActions from "./MessageActions";
import MarkdownMessage from "./MarkdownMessage";
import { UsageIndicator } from "./UsageIndicator";
import { TypewriterPlaceholder } from "./TypewriterPlaceholder";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUsage } from "@/hooks/useUsage";
import { useAnonymousUsage } from "@/hooks/useAnonymousUsage";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSwitch } from "./LanguageSwitch";
import imageCompression from 'browser-image-compression';
import { useRetry } from "@/hooks/useRetry";
import { useAnonymousConversations } from "@/hooks/useAnonymousConversations";
import { ChatSkeleton } from "./ChatSkeleton";
import { TypingIndicator } from "./TypingIndicator";

interface MessagePart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string | MessagePart[];
  timestamp: Date;
  attachments?: { type: 'image' | 'document'; name: string; url?: string; size: number }[];
}

interface ChatInterfaceProps {
  onBack: () => void;
  initialMessage?: string;
  conversationId?: string;
  onSelectConversation: (conversationId: string) => void;
}

const ChatInterface = ({ onBack, initialMessage, conversationId: initialConversationId, onSelectConversation }: ChatInterfaceProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialMessage || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [selectedMode, setSelectedMode] = useState<string>("chat");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [failedMessage, setFailedMessage] = useState<{ message: Message; input: string; files: File[] } | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const lastSeenMessageCountRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { refetch: refetchUsage } = useUsage();
  const anonymousUsage = useAnonymousUsage();
  const isAnonymous = !user;
  const { isRetrying, retryCount, executeWithRetry, cancelRetry } = useRetry({
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 8000,
  });
  const { saveConversation, loadConversation: loadStoredConversation } = useAnonymousConversations();

  const SCROLL_STORAGE_KEY = "kai-scroll-positions";

  const getScrollViewport = useCallback(() => {
    const root = scrollAreaRef.current;
    if (!root) return null;
    return root.querySelector<HTMLDivElement>("[data-radix-scroll-area-viewport]");
  }, []);

  // Load anonymous conversation from localStorage on mount - use ref to prevent re-runs
  const hasLoadedConversationRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (isAnonymous && initialConversationId && hasLoadedConversationRef.current !== initialConversationId) {
      const stored = loadStoredConversation(initialConversationId);
      if (stored) {
        const loadedMessages: Message[] = stored.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(loadedMessages);
        hasLoadedConversationRef.current = initialConversationId;
        console.log('Loaded anonymous conversation from localStorage:', initialConversationId);
        
        // Scroll to bottom after loading
        setTimeout(() => {
          const viewport = getScrollViewport();
          if (viewport) {
            viewport.scrollTo({ top: viewport.scrollHeight, behavior: "instant" });
          }
        }, 50);
      }
    }
  }, [isAnonymous, initialConversationId, loadStoredConversation, getScrollViewport]);

  // Save anonymous conversation to localStorage when messages change
  useEffect(() => {
    if (isAnonymous && conversationId && messages.length > 0) {
      const storedMessages = messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      }));
      const firstUserMsg = messages.find(m => m.role === 'user');
      const title = typeof firstUserMsg?.content === 'string' 
        ? firstUserMsg.content.slice(0, 50) 
        : 'New conversation';
      saveConversation(conversationId, storedMessages, title);
    }
  }, [isAnonymous, conversationId, messages, saveConversation]);
  // Auto-hide sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Sync conversationId with prop changes
  useEffect(() => {
    if (initialConversationId !== conversationId) {
      setConversationId(initialConversationId || null);
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else if (initialMessage && messages.length === 0 && input) {
      handleSend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Load stored scroll positions from localStorage
  const getStoredScrollPositions = useCallback((): Record<string, number> => {
    try {
      const stored = localStorage.getItem(SCROLL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  // Save scroll position for current conversation
  const saveScrollPosition = useCallback(() => {
    if (!conversationId) return;
    const viewport = getScrollViewport();
    if (!viewport) return;

    const positions = getStoredScrollPositions();
    positions[conversationId] = viewport.scrollTop;
    localStorage.setItem(SCROLL_STORAGE_KEY, JSON.stringify(positions));
  }, [conversationId, getScrollViewport, getStoredScrollPositions]);

  // Restore scroll position for a conversation
  const restoreScrollPosition = useCallback((convId: string) => {
    const viewport = getScrollViewport();
    if (!viewport) return false;

    const positions = getStoredScrollPositions();
    const savedPosition = positions[convId];
    if (savedPosition !== undefined && savedPosition > 0) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: savedPosition, behavior: "instant" });
      });
      return true;
    }
    return false;
  }, [getScrollViewport, getStoredScrollPositions]);

  const updateScrollButtonVisibility = useCallback(() => {
    const viewport = getScrollViewport();
    if (!viewport) return;
    const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 80;
    setShowScrollButton(!isNearBottom);
  }, [getScrollViewport]);

  // Save scroll position when scrolling & update button visibility
  useEffect(() => {
    const viewport = getScrollViewport();
    if (!viewport) return;

    const handleScroll = () => {
      updateScrollButtonVisibility();
      saveScrollPosition();
    };

    updateScrollButtonVisibility();
    viewport.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      viewport.removeEventListener("scroll", handleScroll);
    };
  }, [getScrollViewport, updateScrollButtonVisibility, saveScrollPosition, messages.length]);

  const scrollToBottom = useCallback(() => {
    const viewport = getScrollViewport();
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [getScrollViewport]);

  // Track new messages when scrolled up
  useEffect(() => {
    if (messages.length > lastSeenMessageCountRef.current) {
      if (showScrollButton) {
        // User is scrolled up - count new messages
        const newCount = messages.length - lastSeenMessageCountRef.current;
        setNewMessagesCount(prev => prev + newCount);
      } else {
        // User is at bottom - reset counter and update seen count
        setNewMessagesCount(0);
      }
    }
    lastSeenMessageCountRef.current = messages.length;
  }, [messages.length, showScrollButton]);

  // Auto-scroll when new messages arrive (only if user is already near bottom)
  useEffect(() => {
    if (messages.length > 0 && !showScrollButton) {
      scrollToBottom();
    }
  }, [messages, showScrollButton, scrollToBottom]);

  // Reset new messages counter when scrolling to bottom
  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
    setNewMessagesCount(0);
    lastSeenMessageCountRef.current = messages.length;
  }, [scrollToBottom, messages.length]);

  const loadConversation = async (convId: string) => {
    // Save current conversation's scroll position before switching
    saveScrollPosition();
    
    setIsLoadingConversation(true);
    try {
      // For anonymous users, load from localStorage instead of Supabase
      if (isAnonymous) {
        const stored = loadStoredConversation(convId);
        if (stored) {
          const loadedMessages: Message[] = stored.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(loadedMessages);
          hasLoadedConversationRef.current = convId;
          
          // Scroll to bottom after loading
          setTimeout(() => {
            const viewport = getScrollViewport();
            if (viewport) {
              viewport.scrollTo({ top: viewport.scrollHeight, behavior: "instant" });
            }
          }, 50);
        } else {
          setMessages([]);
        }
        setIsLoadingConversation(false);
        return;
      }

      // For authenticated users, load from Supabase
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = data.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));

      setMessages(loadedMessages);
      
      // Restore scroll position after messages are loaded
      setTimeout(() => {
        restoreScrollPosition(convId);
      }, 100);
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error(t('chat.loadConversationFailed'));
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput("");
    setSelectedMode("chat");
  };

  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode);
    toast.info(t('chat.switchedToMode', { mode }));
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
        });
        
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result?.toString().split(',')[1];
            
              if (base64Audio) {
              toast.info(t('chat.transcribing'));
              
              try {
                const { data, error } = await supabase.functions.invoke('transcribe-audio', {
                  body: { audio: base64Audio }
                });
                
                if (error) throw error;
                
                if (data.text) {
                  setInput(data.text);
                  toast.success(t('chat.audioTranscribed'));
                } else {
                  toast.error(t('chat.noSpeechDetected'));
                }
              } catch (error) {
                console.error('Transcription error:', error);
                toast.error(t('chat.transcribeFailed'));
              }
            }
          };
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsRecording(true);
        toast.info(t('chat.recording'));
      } catch (error) {
        console.error('Error accessing microphone:', error);
        toast.error(t('chat.microphoneError'));
      }
    }
  };

  const handleSpeakMessage = async (text: string) => {
    try {
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
        setIsSpeaking(false);
      }

      if (isSpeaking) {
        return;
      }

      setIsSpeaking(true);
      toast.info(t('chat.generatingSpeech'));

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: 'alloy' }
      });

      // Handle errors from edge function
      if (error) {
        console.error('Edge function error:', error);
        throw new Error('Failed to connect to speech service');
      }

      // Check for error in response data
      if (data?.error) {
        console.error('TTS API error:', data.error);
        throw new Error(data.error);
      }

      // Validate audio content exists
      if (!data?.audioContent) {
        console.error('No audio content in response:', data);
        throw new Error('No audio content received from service');
      }

      // Convert base64 to audio
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      audio.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsSpeaking(false);
        toast.error(t('chat.speechFailed'));
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      
      currentAudioRef.current = audio;
      
      // Handle play promise rejection
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            toast.success(t('chat.playingAudio'));
          })
          .catch(error => {
            console.error('Audio play error:', error);
            setIsSpeaking(false);
            toast.error(t('chat.speechFailed'));
            URL.revokeObjectURL(audioUrl);
          });
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`${t('chat.speechFailed')}: ${errorMessage}`);
    }
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsSpeaking(false);
      toast.info(t('chat.stoppedSpeaking'));
    }
  };

  // Helper: Compress image before processing
  const compressImage = async (file: File): Promise<File> => {
    try {
      const options = {
        maxSizeMB: 1, // Maximum file size in MB
        maxWidthOrHeight: 1920, // Maximum width or height
        useWebWorker: true,
        initialQuality: 0.8, // Initial compression quality
      };
      
      const originalSize = (file.size / 1024 / 1024).toFixed(2);
      const compressedFile = await imageCompression(file, options);
      const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
      
      console.log(`Image compressed: ${originalSize}MB → ${compressedSize}MB`);
      
      return compressedFile;
    } catch (error) {
      console.error('Image compression error:', error);
      // If compression fails, return original file
      return file;
    }
  };

  // Helper: Create thumbnail for database storage
  const createThumbnail = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Create small thumbnail (48x48)
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        
        // Draw scaled image
        ctx.drawImage(img, 0, 0, size, size);
        
        // Convert to compressed base64
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = base64;
    });
  };

  // Helper: Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  // Helper: Check if file is an image
  const isImageFile = (file: File): boolean => {
    return file.type.startsWith('image/');
  };

  // Helper: Upload document for text extraction
  const uploadDocument = async (file: File, convId: string | null): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (convId) formData.append('conversationId', convId);
      
      const { data, error } = await supabase.functions.invoke('process-file', {
        body: formData
      });
      
      if (error) throw error;
      return data?.extractedText || null;
    } catch (error) {
      console.error('Document upload error:', error);
      toast.error(`Failed to process ${file.name}`);
      return null;
    }
  };

  const handleSend = async () => {
    if (!input.trim() && selectedFiles.length === 0) return;

    // Check anonymous user quota
    if (isAnonymous) {
      if (!anonymousUsage.hasMessageQuota()) {
        toast.error(t('chat.freeTrialLimit'), {
          duration: 6000,
          action: {
            label: t('chat.signUp'),
            onClick: () => navigate('/auth')
          }
        });
        return;
      }
    }

    // Detect image generation requests
    const imageGenPatterns = [
      /^(generate|create|make|draw|design|produce|render)\s+(an?\s+)?(image|picture|photo|illustration|artwork|visual|graphic)/i,
      /^(show\s+me|give\s+me|i\s+want)\s+(an?\s+)?(image|picture|photo)/i,
      /^(can\s+you|could\s+you|please)\s+(generate|create|make|draw|design)/i
    ];
    
    const isImageGenRequest = imageGenPatterns.some(pattern => pattern.test(input));

    if (isImageGenRequest && selectedFiles.length === 0) {
      // Handle image generation separately
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
      
      const currentInput = input;
      setInput("");
      setIsLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { 
            prompt: currentInput,
            conversationId: conversationId || undefined 
          }
        });

        if (error) {
          console.error('Image generation error:', error);
          const errorMsg = error.message || 'Failed to generate image';
          toast.error(errorMsg);
          setIsLoading(false);
          return;
        }

        if (data?.imageUrl) {
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: [
              { type: "text", text: "I've generated the image for you:" },
              { type: "image_url", image_url: { url: data.imageUrl } }
            ],
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);

          // Save messages to database if authenticated with conversation
          if (!isAnonymous && conversationId) {
            await supabase.from("messages").insert([
              { conversation_id: conversationId, role: "user", content: currentInput },
              { conversation_id: conversationId, role: "assistant", content: JSON.stringify(assistantMessage.content) }
            ]);
          }
        }

        setIsLoading(false);
        return;
      } catch (error) {
        console.error('Error in image generation:', error);
        toast.error('Failed to generate image');
        setIsLoading(false);
        return;
      }
    }

    // Process files before sending
    const messageParts: MessagePart[] = [];
    const attachments: { type: 'image' | 'document'; name: string; url?: string; size: number }[] = [];
    let documentContext = '';

    if (selectedFiles.length > 0) {
      toast.info('Processing files...');
      
      for (const file of selectedFiles) {
        if (isImageFile(file)) {
          // Compress and convert images to base64 for vision model
          try {
            const originalSize = (file.size / 1024 / 1024).toFixed(2);
            toast.loading(`Compressing ${file.name} (${originalSize}MB)...`, { id: `compress-${file.name}` });
            
            const compressedFile = await compressImage(file);
            const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
            
            toast.success(`Compressed ${file.name}: ${originalSize}MB → ${compressedSize}MB`, { id: `compress-${file.name}` });
            
            const base64 = await fileToBase64(compressedFile);
            messageParts.push({
              type: 'image_url',
              image_url: { url: base64 }
            });
            attachments.push({ 
              type: 'image', 
              name: file.name, 
              url: base64,
              size: compressedFile.size 
            });
          } catch (error) {
            console.error('Image conversion error:', error);
            toast.error(`Failed to process image: ${file.name}`);
          }
        } else {
          // Upload documents for text extraction
          const extractedText = await uploadDocument(file, conversationId);
          if (extractedText) {
            documentContext += `\n\n[Document: ${file.name}]\n${extractedText}`;
            attachments.push({ 
              type: 'document', 
              name: file.name,
              size: file.size 
            });
          }
        }
      }
    }

    // Build final content
    let messageContent: string | MessagePart[];
    if (messageParts.length > 0) {
      // Multimodal message with images
      messageParts.unshift({ type: 'text', text: input + documentContext });
      messageContent = messageParts;
    } else {
      // Text-only message (possibly with document context)
      messageContent = input + documentContext;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    const currentFiles = [...selectedFiles];
    setInput("");
    setSelectedFiles([]);
    setIsLoading(true);

    try {
      // Create or update conversation
      let currentConvId = conversationId;
      
      if (!currentConvId) {
        if (!isAnonymous) {
          // Authenticated user: create conversation in database
          const { data: session } = await supabase.auth.getSession();
          
          if (session.session) {
            const title = currentInput.slice(0, 50) + (currentInput.length > 50 ? "..." : "");
            const { data: newConv, error: convError } = await supabase
              .from("conversations")
              .insert({ user_id: session.session.user.id, title })
              .select()
              .single();

            if (convError) throw convError;
            currentConvId = newConv.id;
            setConversationId(currentConvId);
          }
        } else {
          // Anonymous user: generate local conversationId for session tracking
          currentConvId = crypto.randomUUID();
          setConversationId(currentConvId);
          console.log('Created anonymous conversation:', currentConvId);
        }
      }

      // Save user message to database (only for authenticated users with conversation)
      if (!isAnonymous && currentConvId) {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        
        await supabase.from("messages").insert({
          conversation_id: currentConvId,
          role: "user",
          content: currentInput,
        });

        // Save file metadata to uploaded_files table
        if (attachments.length > 0 && authSession) {
          try {
            const fileRecords = await Promise.all(
              attachments.map(async (att) => ({
                conversation_id: currentConvId,
                user_id: authSession.user.id,
                file_name: att.name,
                file_type: att.type === 'image' ? 'image/jpeg' : 'application/pdf',
                file_size: att.size,
                metadata: {
                  thumbnail: att.type === 'image' && att.url 
                    ? await createThumbnail(att.url) 
                    : null,
                  isImage: att.type === 'image'
                }
              }))
            );
            
            await supabase.from('uploaded_files').insert(fileRecords);
          } catch (error) {
            console.error('Error saving file metadata:', error);
          }
        }
      }

      // Call the chat edge function with retry
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Only add auth header if user is authenticated
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const data = await executeWithRetry(async (signal) => {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
          method: 'POST',
          headers,
          signal,
          body: JSON.stringify({
            messages: messages.concat(userMessage).map(msg => ({
              role: msg.role,
              content: msg.content // Can be string or MessagePart[]
            })),
            conversationId: currentConvId,
            mode: selectedMode,
          }),
        });

        const responseData = await response.json();

        // Handle specific error codes (non-retriable)
        if (!response.ok) {
          if (responseData.errorCode === 'RATE_LIMIT') {
            toast.error(t('chat.rateLimitExceeded'));
            throw new Error('Rate limit exceeded');
          } else if (responseData.errorCode === 'PAYMENT_REQUIRED') {
            if (isAnonymous) {
              toast.error(t('chat.freeTrialLimit'), {
                duration: 6000,
                action: {
                  label: t('chat.signUp'),
                  onClick: () => navigate('/auth')
                }
              });
            } else {
              toast.error(t('chat.messageLimitReached'), {
                action: {
                  label: t('chat.upgrade'),
                  onClick: () => navigate('/premium')
                }
              });
            }
            throw new Error('Payment required');
          } else if (response.status === 401) {
            toast.error(t('chat.authError'));
            throw new Error('Authentication required');
          } else {
            // Retriable error
            throw new Error(responseData.error || 'Failed to get AI response');
          }
        }

        return responseData;
      });
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, aiMessage]);

      // Save AI message to database (only for authenticated users)
      if (!isAnonymous && currentConvId) {
        await supabase.from("messages").insert({
          conversation_id: currentConvId,
          role: "assistant",
          content: data.message,
        });
      }

      // Update usage tracking
      if (isAnonymous) {
        anonymousUsage.incrementMessageCount();
        
        // Show signup prompt after a few messages
        const newCount = anonymousUsage.usage.messageCount + 1;
        if (newCount === 3) {
          toast.info(t('chat.messagesLeft', { count: 2 }), {
            duration: 5000,
            action: {
              label: t('chat.signUp'),
              onClick: () => navigate('/auth')
            }
          });
        }
      } else {
        refetchUsage();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Don't show generic error if we already showed a specific one
      const errorString = error instanceof Error ? error.message : String(error);
      const isNonRetriableError = errorString.includes('Rate limit') || 
                                   errorString.includes('Payment required') || 
                                   errorString.includes('Authentication');
      
      if (!isNonRetriableError && !errorString.includes('Operation cancelled')) {
        toast.error(t('chat.sendFailed'));
        // Save failed message for manual retry (only for retriable errors)
        setFailedMessage({ message: userMessage, input: currentInput, files: currentFiles });
      }
      
      // Remove the user message if there was an error
      setMessages((prev) => prev.filter(msg => msg.id !== userMessage.id));
      setInput(currentInput); // Restore the input
      setSelectedFiles(currentFiles); // Restore files
    } finally {
      setIsLoading(false);
      cancelRetry(); // Clean up any pending retries
    }
  };

  // Manual retry function
  const handleManualRetry = useCallback(() => {
    if (failedMessage) {
      setFailedMessage(null);
      // Re-send the failed message
      setInput(failedMessage.input);
      setSelectedFiles(failedMessage.files);
      // Trigger send after state updates
      setTimeout(() => {
        const sendBtn = document.querySelector('[data-send-btn]') as HTMLButtonElement;
        sendBtn?.click();
      }, 100);
    }
  }, [failedMessage]);

  const dismissRetry = useCallback(() => {
    setFailedMessage(null);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {sidebarOpen && (
        <Sidebar 
          onNewChat={handleNewChat} 
          onBack={onBack} 
          onSelectConversation={onSelectConversation}
          currentConversationId={conversationId}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <button 
              onClick={() => navigate("/")}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img src={logo} alt="Khai AI" className="w-8 h-8" />
              <span className="text-lg font-semibold">Khai AI</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/voice')}
              className="hover:bg-accent"
            >
              <Phone className="w-5 h-5" />
            </Button>
            <LanguageSwitch />
          </div>
        </div>

        {/* Messages */}
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <ScrollArea 
            className="h-full p-4 md:p-6" 
            ref={scrollAreaRef}
          >
          {isLoadingConversation ? (
            <ChatSkeleton />
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium">
                {t('chat.whatCanIHelp')}
              </h1>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-8 pb-4">
              {messages.map((message, index) => (
                <div key={message.id} className="animate-fade-in">
                  {message.role === "user" ? (
                    <div className="flex justify-end mb-8">
                      <div className="bg-card border border-border rounded-3xl px-5 py-3 max-w-[85%]">
                        {/* Display attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {message.attachments.map((attachment, idx) => (
                              <div key={idx} className="text-xs bg-muted rounded-full px-3 py-1">
                                {attachment.type === 'image' ? '🖼️' : '📄'} {attachment.name}
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-sm md:text-base leading-relaxed">
                          {typeof message.content === 'string' 
                            ? message.content 
                            : message.content.find(p => p.type === 'text')?.text || ''}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 md:gap-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                        <img src={logo} alt="AI" className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                          {typeof message.content === 'string' ? message.content : ''}
                        </p>
                        <MessageActions 
                          content={typeof message.content === 'string' ? message.content : ''}
                          conversationId={conversationId}
                          onSpeak={handleSpeakMessage}
                          onRegenerate={index === messages.length - 1 && !isLoading ? () => {
                            // Handle regenerate
                            toast.info(t('actions.regenerating'));
                          } : undefined}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <TypingIndicator isRetrying={isRetrying} retryCount={retryCount} />
              )}
              {/* Manual retry button for failed messages */}
              {failedMessage && !isLoading && (
                <div className="flex gap-3 md:gap-4 animate-fade-in">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <X className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">Message failed to send after multiple attempts.</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManualRetry}
                        className="gap-2"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Retry
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={dismissRetry}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
          </ScrollArea>

          {/* Scroll to bottom button with new messages badge */}
          {showScrollButton && messages.length > 0 && (
            <Button
              onClick={handleScrollToBottom}
              className="absolute bottom-4 right-6 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground animate-in fade-in slide-in-from-bottom-2 duration-200 z-10 gap-2 px-3"
              aria-label={newMessagesCount > 0 ? `${newMessagesCount} new messages - scroll to bottom` : "Scroll to bottom"}
            >
              {newMessagesCount > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-medium animate-pulse">
                  <span className="bg-primary-foreground/20 rounded-full px-1.5 py-0.5 min-w-[20px] text-center shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                    {newMessagesCount}
                  </span>
                  <span className="hidden sm:inline">new</span>
                </span>
              )}
              <ArrowDown className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Input */}
        <div className="p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-card rounded-[28px] shadow-lg">
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-start gap-3">
                  <PlusMenu 
                    onModeSelect={handleModeSelect}
                    onFilesSelect={() => {
                      // Trigger file upload via the FileUpload component in ChatInputMenu
                      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                      fileInput?.click();
                    }}
                    activeMode={selectedMode}
                    hasFiles={selectedFiles.length > 0}
                  />
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder=""
                    className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[24px] max-h-[200px] text-base"
                    rows={1}
                  />
                  {!input && (
                    <div className="absolute left-16 top-[18px] pointer-events-none">
                      <TypewriterPlaceholder />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`rounded-full h-10 w-10 ${isRecording ? "text-primary animate-pulse" : "text-muted-foreground"}`}
                      onClick={handleVoiceInput}
                    >
                      {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </Button>
                    {isSpeaking ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-10 w-10 text-primary animate-pulse"
                        onClick={stopSpeaking}
                      >
                        <Square className="w-5 h-5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-10 w-10 text-muted-foreground"
                        onClick={() => {
                          const lastMessage = messages[messages.length - 1];
                          if (lastMessage?.role === 'assistant') {
                            const content = typeof lastMessage.content === 'string' 
                              ? lastMessage.content 
                              : '';
                            if (content) handleSpeakMessage(content);
                          }
                        }}
                        disabled={!messages.length || messages[messages.length - 1]?.role !== 'assistant'}
                      >
                        <Volume2 className="w-5 h-5" />
                      </Button>
                    )}
                    <Button
                      onClick={handleSend}
                      disabled={(!input.trim() && selectedFiles.length === 0) || isLoading}
                      size="icon"
                      data-send-btn
                      className="rounded-full h-10 w-10 bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowUp className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <ChatInputMenu 
                  onModeSelect={handleModeSelect}
                  selectedFiles={selectedFiles}
                  onFilesSelect={setSelectedFiles}
                  onRemoveFile={(index) => {
                    const newFiles = [...selectedFiles];
                    newFiles.splice(index, 1);
                    setSelectedFiles(newFiles);
                  }}
                />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <UsageIndicator />
              <p className="text-xs text-center text-muted-foreground">
                Khai AI can make mistakes. Check important info.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
