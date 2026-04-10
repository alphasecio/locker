"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload";

import { ConversationSidebar } from "./conversation-sidebar";
import { ChatMessage, StreamingIndicator } from "./chat-message";
import { FilePreviewPanel } from "./file-preview-panel";
import {
  ChatInput,
  AVAILABLE_MODELS,
  type ModelId,
  type ChatAttachment,
} from "./chat-input";
import { EmptyState } from "./empty-state";

export function ChatPage({ workspaceSlug }: { workspaceSlug: string }) {
  const utils = trpc.useUtils();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState<ModelId>(
    AVAILABLE_MODELS[0].id,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  // --- Data fetching ---
  const { data: conversations = [] } = trpc.assistant.conversations.useQuery();

  const { data: conversationData } = trpc.assistant.conversation.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId },
  );

  const createConversationMutation =
    trpc.assistant.createConversation.useMutation({
      onSuccess: (conv) => {
        setConversationId(conv.id);
        utils.assistant.conversations.invalidate();
      },
      onError: (error) => toast.error(error.message),
    });

  const deleteConversationMutation =
    trpc.assistant.deleteConversation.useMutation({
      onSuccess: () => {
        if (conversations.length > 1) {
          const remaining = conversations.filter(
            (c) => c.id !== conversationId,
          );
          setConversationId(remaining[0]?.id ?? null);
        } else {
          setConversationId(null);
        }
        utils.assistant.conversations.invalidate();
        toast.success("Conversation deleted");
      },
      onError: (error) => toast.error(error.message),
    });

  const updateTitleMutation = trpc.assistant.updateTitle.useMutation({
    onSuccess: () => utils.assistant.conversations.invalidate(),
    onError: (error) => toast.error(error.message),
  });

  // Upload mutations for file attachments
  const uploadInitiate = trpc.uploads.initiate.useMutation();
  const uploadComplete = trpc.uploads.complete.useMutation();

  // --- Reconstruct messages from DB ---
  const initialMessages: UIMessage[] = useMemo(() => {
    if (!conversationData?.messages) return [];
    return conversationData.messages.map((msg) => ({
      id: msg.id,
      role: msg.role as UIMessage["role"],
      parts: (msg.parts as UIMessage["parts"]) ?? [
        { type: "text" as const, text: "" },
      ],
    }));
  }, [conversationData?.messages]);

  // --- Chat transport ---
  const transportBody = useRef({
    conversationId,
    model: selectedModel,
  });
  transportBody.current.conversationId = conversationId;
  transportBody.current.model = selectedModel;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        headers: { "x-workspace-slug": workspaceSlug },
        body: transportBody.current,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workspaceSlug],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
    messages: initialMessages,
    id: conversationId ?? undefined,
    onError: (error: Error) => toast.error(error.message),
    onFinish: () => {
      // Refresh conversations list to pick up auto-title and updatedAt changes
      utils.assistant.conversations.invalidate();
    },
  });

  // Reset messages only when the query has loaded data for a different conversation.
  // Using conversationData?.id as the trigger avoids two problems:
  //  1) Wiping optimistic messages when conversationId changes before the query loads
  //  2) Clobbering in-flight streamed messages on background refetches
  const loadedConversationId = conversationData?.id;
  useEffect(() => {
    if (loadedConversationId === conversationId) {
      setMessages(initialMessages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedConversationId]);

  // --- Auto-scroll ---
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Handlers ---
  const isStreaming = status === "streaming" || status === "submitted";

  const handleNewConversation = useCallback(() => {
    createConversationMutation.mutate({});
  }, [createConversationMutation]);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    const currentText = inputValue;
    const currentAttachments = [...attachments];
    setInputValue("");
    setAttachments([]);

    // Upload any attached files first
    let uploadedFiles: { id: string; name: string }[] = [];
    if (currentAttachments.length > 0) {
      try {
        const results = await Promise.all(
          currentAttachments.map(async (att) => {
            const fileId = await uploadFile({
              file: att.file,
              folderId: null,
              workspaceSlug,
              uploads: {
                initiate: uploadInitiate,
                complete: uploadComplete,
                abort: { mutateAsync: async () => {} },
              },
            });
            return { id: fileId, name: att.file.name };
          }),
        );
        uploadedFiles = results;
      } catch (err) {
        toast.error("Failed to upload attachments");
        return;
      }
    }

    // Build the message text — include uploaded file references so the model
    // knows which files the user is referring to and can operate on them.
    let messageText = currentText;
    if (uploadedFiles.length > 0) {
      const fileList = uploadedFiles
        .map((f) => `- "${f.name}" (id: ${f.id})`)
        .join("\n");
      messageText = `${currentText}\n\n[Attached files uploaded to workspace root]\n${fileList}`;
    }

    // Ensure we have a conversation
    if (!conversationId) {
      createConversationMutation.mutate(
        {},
        {
          onSuccess: (conv) => {
            setConversationId(conv.id);
            transportBody.current.conversationId = conv.id;
            sendMessage({ text: messageText });
          },
        },
      );
      return;
    }

    sendMessage({ text: messageText });
  }, [
    inputValue,
    attachments,
    conversationId,
    workspaceSlug,
    createConversationMutation,
    sendMessage,
    uploadInitiate,
    uploadComplete,
  ]);

  const handleSuggestionClick = useCallback(
    (prompt: string) => {
      setInputValue(prompt);
      // Auto-create and send
      if (!conversationId) {
        createConversationMutation.mutate(
          {},
          {
            onSuccess: (conv) => {
              setConversationId(conv.id);
              transportBody.current.conversationId = conv.id;
              sendMessage({ text: prompt });
            },
          },
        );
      } else {
        sendMessage({ text: prompt });
      }
    },
    [conversationId, createConversationMutation, sendMessage],
  );

  const handleAttach = useCallback((fileList: FileList) => {
    const newAttachments: ChatAttachment[] = [];
    for (const file of Array.from(fileList)) {
      const att: ChatAttachment = { file };
      if (file.type.startsWith("image/")) {
        att.preview = URL.createObjectURL(file);
      }
      newAttachments.push(att);
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Auto-select first conversation on load
  useEffect(() => {
    if (conversations.length > 0 && !conversationId) {
      setConversationId(conversations[0].id);
    }
  }, [conversations, conversationId]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation sidebar */}
      {sidebarOpen && (
        <div className="w-[260px] shrink-0 overflow-hidden">
          <ConversationSidebar
            conversations={conversations.map((c) => ({
              ...c,
              updatedAt: new Date(c.updatedAt),
            }))}
            activeId={conversationId}
            onSelect={setConversationId}
            onNew={handleNewConversation}
            onDelete={(id) =>
              deleteConversationMutation.mutate({ conversationId: id })
            }
            onRename={(id, title) =>
              updateTitleMutation.mutate({ conversationId: id, title })
            }
            isCreating={createConversationMutation.isPending}
          />
        </div>
      )}

      {/* Main chat area */}
      <div className="flex flex-1 flex-col w-0 overflow-hidden">
        {/* Top bar */}
        <div className="flex h-12 items-center gap-2 px-3 border-b bg-background min-w-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="size-8 p-0"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeft className="size-4" />
            )}
          </Button>

          <h1 className="text-sm font-medium text-foreground truncate">
            {conversationData?.title ?? "New conversation"}
          </h1>
        </div>

        {/* Messages or empty state */}
        {messages.length === 0 && !isStreaming ? (
          <EmptyState onSuggestionClick={handleSuggestionClick} />
        ) : (
          <ScrollArea className="flex-1 mb-[-20px]">
            <div className="max-w-3xl mx-auto w-full">
              {messages.map((message: UIMessage) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  parts={
                    message.parts as Array<{
                      type: string;
                      text?: string;
                      [key: string]: unknown;
                    }>
                  }
                  onFileClick={setPreviewFileId}
                />
              ))}
              {isStreaming &&
                messages[messages.length - 1]?.role !== "assistant" && (
                  <StreamingIndicator />
                )}
            </div>
            <div ref={scrollRef} />
          </ScrollArea>
        )}

        {/* Input */}
        <ChatInput
          className="z-20 relative"
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSend}
          model={selectedModel}
          onModelChange={setSelectedModel}
          disabled={false}
          isSending={isStreaming}
          attachments={attachments}
          onAttach={handleAttach}
          onRemoveAttachment={handleRemoveAttachment}
        />
      </div>

      {/* File preview side panel */}
      {previewFileId && (
        <div className="w-[480px] shrink-0">
          <FilePreviewPanel
            fileId={previewFileId}
            workspaceSlug={workspaceSlug}
            onClose={() => setPreviewFileId(null)}
          />
        </div>
      )}
    </div>
  );
}
