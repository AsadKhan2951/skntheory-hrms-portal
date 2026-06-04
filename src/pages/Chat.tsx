import { useState, useEffect, useMemo, useRef } from "react";
import LayoutWrapper from "@/components/LayoutWrapper";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Chat() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const currentUserId = user?.id ? String(user.id) : null;

  const { data: users, isLoading: usersLoading } = trpc.dashboard.getUsers.useQuery();
  const { data: messages, isLoading: messagesLoading } = trpc.chat.getMessages.useQuery(
    { limit: 100 },
    { refetchInterval: 3000 } // Poll every 3 seconds for new messages
  );
  const markReadMutation = trpc.chat.markRead.useMutation();

  const sendMutation = trpc.chat.send.useMutation({
    onSuccess: () => {
      setMessage("");
      utils.chat.getMessages.invalidate();
      scrollToBottom();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return;
    
    let messageText = message.trim();
    if (attachments.length > 0) {
      const fileNames = attachments.map(f => f.name).join(", ");
      messageText += (messageText ? "\n" : "") + `📎 Attachments: ${fileNames}`;
    }
    
    sendMutation.mutate({
      message: messageText,
      recipientId: (selectedUser as any) || undefined,
    });
    setAttachments([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const allMessages = messages ?? [];
  const filteredMessages = selectedUser
    ? allMessages.filter(
        (msg) =>
          String(msg.senderId) === String(selectedUser) ||
          String(msg.recipientId) === String(selectedUser)
      )
    : allMessages;

  const orderedMessages = useMemo(() => {
    return [...filteredMessages].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [filteredMessages]);

  const unreadMessages = useMemo(() => {
    if (!currentUserId) return [];
    return allMessages.filter((msg) => {
      if (msg.isRead) return false;
      if (String(msg.senderId) === currentUserId) return false;
      const recipientId = msg.recipientId ? String(msg.recipientId) : null;
      return !recipientId || recipientId === currentUserId;
    });
  }, [allMessages, currentUserId]);

  const unreadTotal = unreadMessages.length;

  const unreadBySender = useMemo(() => {
    const map = new Map<string, number>();
    unreadMessages.forEach((msg) => {
      const senderId = String(msg.senderId);
      map.set(senderId, (map.get(senderId) ?? 0) + 1);
    });
    return map;
  }, [unreadMessages]);

  useEffect(() => {
    if (!currentUserId) return;
    if (unreadMessages.length === 0) return;

    const relevantUnread = selectedUser
      ? unreadMessages.filter((msg) => String(msg.senderId) === String(selectedUser))
      : unreadMessages;

    relevantUnread.forEach((msg) => {
      markReadMutation.mutate({ messageId: msg.id });
    });
  }, [currentUserId, unreadMessages, selectedUser, markReadMutation]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (usersLoading || messagesLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <LayoutWrapper>
    <div className="flex gap-3 h-[calc(100vh-8rem)] overflow-hidden">
      {/* Users List */}
      <Card className="w-80 p-4 h-full flex flex-col overflow-hidden">
        <h2 className="text-lg font-semibold mb-4">Team Members</h2>
        <ScrollArea className="flex-1 min-h-0 pr-2">
          <div className="space-y-2">
            <button
              onClick={() => setSelectedUser(null)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                selectedUser === null
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <Avatar>
                <AvatarFallback>ALL</AvatarFallback>
              </Avatar>
              <div className="text-left flex-1">
                <div className="font-medium flex items-center gap-2">
                  All Messages
                  {unreadTotal > 0 && (
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {messages?.length || 0} messages
                </div>
              </div>
              {unreadTotal > 0 && (
                <span className="min-w-[20px] px-2 py-0.5 text-xs rounded-full bg-red-500 text-white text-center">
                  {unreadTotal}
                </span>
              )}
            </button>

            {users?.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user.id as any)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  selectedUser === user.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <Avatar>
                  <AvatarFallback>{getInitials(user.name || "U")}</AvatarFallback>
                </Avatar>
                <div className="text-left flex-1 min-w-0">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </div>
                </div>
                {unreadBySender.get(String(user.id)) ? (
                  <span className="min-w-[20px] px-2 py-0.5 text-xs rounded-full bg-red-500 text-white text-center">
                    {unreadBySender.get(String(user.id))}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">
            {selectedUser
              ? users?.find((u) => String(u.id) === String(selectedUser))?.name || "Chat"
              : "Team Chat"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedUser ? "Direct message" : "Group conversation"}
          </p>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {orderedMessages.length > 0 ? (
              orderedMessages.map((msg) => {
                const sender = users?.find((u) => String(u.id) === String(msg.senderId));
                const isCurrentUser = currentUserId
                  ? String(msg.senderId) === currentUserId
                  : false;

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isCurrentUser ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(sender?.name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{sender?.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(msg.createdAt), "HH:mm")}
                        </span>
                      </div>
                      <div
                        className={`px-4 py-2 rounded-lg max-w-md ${
                          isCurrentUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-muted-foreground py-12">
                No messages yet. Start the conversation!
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <label htmlFor="file-input" className="cursor-pointer">
              <Button type="button" variant="outline" size="icon" asChild>
                <div>
                  <Paperclip className="h-4 w-4" />
                </div>
              </Button>
            </label>
            <input
              id="file-input"
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={sendMutation.isPending}
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              size="icon"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
    </LayoutWrapper>
  );
}
