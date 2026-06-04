import { useEffect, useMemo } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Bell, 
  FolderKanban, 
  Clock, 
  AlertTriangle, 
  Calendar,
  MessageSquare,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

interface NotificationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSidebar({ isOpen, onClose }: NotificationSidebarProps) {
  const { user } = useAuth();
  const currentUserId = user?.id ? String(user.id) : null;
  const { data: notifications = [] } = trpc.notifications.getAll.useQuery(undefined, {
    refetchInterval: isOpen ? 10000 : false,
    enabled: isOpen,
  });
  const { data: chatMessages } = trpc.chat.getMessages.useQuery(
    { limit: 50 },
    { refetchInterval: 10000, enabled: isOpen }
  );

  const unreadChatMessages = useMemo(() => {
    if (!currentUserId || !chatMessages) return [];
    return chatMessages.filter((msg: any) => {
      if (msg.isRead) return false;
      if (String(msg.senderId) === currentUserId) return false;
      const recipientId = msg.recipientId ? String(msg.recipientId) : null;
      return !recipientId || recipientId === currentUserId;
    });
  }, [chatMessages, currentUserId]);

  const unreadChatCount = unreadChatMessages.length;
  const latestChat = unreadChatMessages[unreadChatMessages.length - 1];
  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const chatNotification = unreadChatCount
    ? {
        id: "chat",
        type: "chat",
        title: "New Chat Messages",
        message: latestChat?.message
          ? latestChat.message
          : `You have ${unreadChatCount} unread chat message${unreadChatCount > 1 ? "s" : ""}.`,
        priority: "high",
        isRead: false,
        createdAt: latestChat?.createdAt ? new Date(latestChat.createdAt) : new Date(),
        link: "/chat",
      }
    : null;

  const mergedNotifications = useMemo(() => {
    const combined = [
      ...(chatNotification ? [chatNotification] : []),
      ...notifications,
    ];
    return combined.sort((a: any, b: any) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [chatNotification, notifications]);

  const recentNotifications = mergedNotifications.slice(0, 5);
  const unreadCount =
    notifications.filter(n => !n.isRead).length + unreadChatCount;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "project_assigned":
        return <FolderKanban className="h-4 w-4 text-blue-500" />;
      case "attendance_issue":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "hours_shortfall":
        return <Clock className="h-4 w-4 text-red-500" />;
      case "announcement":
        return <Bell className="h-4 w-4 text-purple-500" />;
      case "chat":
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-background border-l shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Notifications</h2>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {recentNotifications.length > 0 ? (
              recentNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !notification.isRead ? "bg-primary/5 border-l-4 border-l-primary" : ""
                  }`}
                  onClick={onClose}
                >
                  <Link href={(notification as any).link || "/notifications"}>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm line-clamp-1">
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <span className="h-2 w-2 bg-blue-500 rounded-full shrink-0 mt-1"></span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(notification.createdAt), "MMM dd, HH:mm")}
                        </div>
                      </div>
                    </div>
                  </Link>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {recentNotifications.length > 0 && (
            <div className="p-4 border-t">
              <Link href="/notifications">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={onClose}
                >
                  View All Notifications
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
