import { useMemo, useState } from "react";
import { MessageSquare, X, Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { format } from "date-fns";

interface GlobalChatWidgetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

export function GlobalChatWidget({ open, onOpenChange, hideTrigger }: GlobalChatWidgetProps) {
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : isOpenInternal;
  const setIsOpen = (next: boolean) => {
    if (!isControlled) setIsOpenInternal(next);
    onOpenChange?.(next);
  };
  const [message, setMessage] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const { user } = useAuth();
  const currentUserId = user?.id ? String(user.id) : null;

  const { data: users = [] } = trpc.dashboard.getUsers.useQuery();
  const { data: messages } = trpc.chat.getMessages.useQuery({}, {
    enabled: isOpen,
    refetchInterval: isOpen ? 3000 : false,
  });

  const sendMessageMutation = trpc.chat.send.useMutation({
    onSuccess: () => {
      setMessage("");
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate({
      message,
      recipientId: selectedRecipient || undefined,
    });
  };

  const availableUsers = useMemo(() => {
    return users.filter((u: any) => String(u.id) !== String(currentUserId));
  }, [users, currentUserId]);

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    if (!selectedRecipient) {
      return messages.filter((msg: any) => !msg.recipientId);
    }
    return messages.filter((msg: any) => {
      const senderId = String(msg.senderId);
      const recipientId = msg.recipientId ? String(msg.recipientId) : null;
      return (
        (senderId === String(selectedRecipient) && recipientId === String(currentUserId)) ||
        (senderId === String(currentUserId) && recipientId === String(selectedRecipient))
      );
    });
  }, [messages, selectedRecipient, currentUserId]);

  const selectedUserName =
    selectedRecipient &&
    availableUsers.find((u: any) => String(u.id) === String(selectedRecipient))?.name;

  return (
    <>
      {/* Floating Chat Button */}
      {!hideTrigger && (
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-premium-lg bg-[#ff2801] hover:bg-[#e62401] text-white"
          size="icon"
        >
          {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-96 h-[500px] shadow-premium-lg flex flex-col">
          {/* Header */}
          <div className="p-4 border-b bg-[#ff2801] text-white rounded-t-lg flex items-center justify-between gap-3">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {selectedUserName ? `Chat with ${selectedUserName}` : "Team Chat"}
            </h3>
            <div className="flex items-center gap-2">
              <div className="min-w-[160px]">
                <Select
                  value={selectedRecipient ?? "all"}
                  onValueChange={(value) =>
                    setSelectedRecipient(value === "all" ? null : value)
                  }
                >
                  <SelectTrigger className="h-8 bg-white/10 text-white border-white/20">
                    <SelectValue placeholder="Team chat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Team Chat</SelectItem>
                    {availableUsers.map((u: any) => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {filteredMessages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    String(msg.senderId) === String(user?.id) ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      String(msg.senderId) === String(user?.id)
                        ? "bg-[#ff2801] text-white"
                        : "bg-muted"
                    }`}
                  >
                    {String(msg.senderId) !== String(user?.id) && msg.sender && (
                      <p className="text-xs font-medium mb-1">{msg.sender.name}</p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {format(new Date(msg.createdAt), "HH:mm")}
                  </span>
                </div>
              ))}
              {filteredMessages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-10">
                  {selectedRecipient ? "No messages yet. Start a chat." : "No team messages yet."}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                className="flex-1"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!message.trim()}
                className="bg-[#ff2801] hover:bg-[#e62401]"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
