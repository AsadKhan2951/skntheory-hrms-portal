import { useEffect, useMemo, useState } from "react";
import LayoutWrapper from "@/components/LayoutWrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  BellOff, 
  FolderKanban, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  Calendar,
  Loader2,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type FilterType = "all" | "unread" | "project_assigned" | "attendance_issue" | "hours_shortfall";

export default function Notifications() {
  const [filter, setFilter] = useState<FilterType>("all");
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.notifications.getAll.useQuery();
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.getAll.invalidate();
      await utils.notifications.getUnreadCount.invalidate();
    },
  });
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.getAll.invalidate();
      await utils.notifications.getUnreadCount.invalidate();
    },
  });
  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: async () => {
      await utils.notifications.getAll.invalidate();
      await utils.notifications.getUnreadCount.invalidate();
    },
  });

  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (data) {
      setNotifications(data);
    }
  }, [data]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === "all") return true;
      if (filter === "unread") return !notification.isRead;
      return notification.type === filter;
    });
  }, [notifications, filter]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => String(n.id) === id ? { ...n, isRead: true } : n)
    );
    markAsReadMutation.mutate(
      { notificationId: id },
      {
        onSuccess: () => toast.success("Notification marked as read"),
        onError: () => toast.error("Failed to mark notification as read"),
      }
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => toast.success("All notifications marked as read"),
      onError: () => toast.error("Failed to mark all as read"),
    });
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => String(n.id) !== id));
    deleteMutation.mutate(
      { notificationId: id },
      {
        onSuccess: () => toast.success("Notification deleted"),
        onError: () => toast.error("Failed to delete notification"),
      }
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "project_assigned":
        return <FolderKanban className="h-5 w-5 text-blue-500" />;
      case "attendance_issue":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "hours_shortfall":
        return <Clock className="h-5 w-5 text-red-500" />;
      case "announcement":
        return <Bell className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive", className: string }> = {
      high: { variant: "destructive", className: "bg-red-500/10 text-red-500" },
      medium: { variant: "default", className: "bg-yellow-500/10 text-yellow-600" },
      low: { variant: "secondary", className: "bg-gray-500/10 text-gray-500" },
    };

    const { variant, className } = config[priority] || config.low;

    return (
      <Badge variant={variant} className={className}>
        {priority}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      project_assigned: "Project",
      attendance_issue: "Attendance",
      hours_shortfall: "Hours Alert",
      announcement: "Announcement",
      system_alert: "System",
    };
    return labels[type] || type;
  };

  return (
    <LayoutWrapper>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Stay informed about projects, attendance, and work hours
            </p>
          </div>

          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark All as Read
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={filter === "project_assigned" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("project_assigned")}
          >
            <FolderKanban className="h-3 w-3 mr-1" />
            Projects
          </Button>
          <Button
            variant={filter === "attendance_issue" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("attendance_issue")}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Attendance
          </Button>
          <Button
            variant={filter === "hours_shortfall" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("hours_shortfall")}
          >
            <Clock className="h-3 w-3 mr-1" />
            Hours
          </Button>
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`p-4 ${!notification.isRead ? 'bg-primary/5 border-l-4 border-l-primary' : 'opacity-70'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-muted rounded-lg shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{notification.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(notification.type)}
                        </Badge>
                        {getPriorityBadge(notification.priority)}
                        {!notification.isRead && (
                          <Badge variant="default" className="bg-blue-500/10 text-blue-500">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(notification.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                      </div>

                      <div className="flex items-center gap-2">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(String(notification.id))}
                            className="h-7 text-xs"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Mark Read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(String(notification.id))}
                          className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications to display</p>
              <p className="text-sm mt-1">
                {filter === "unread" 
                  ? "You've read all your notifications" 
                  : "Check back later for updates"}
              </p>
            </div>
          </Card>
        )}
      </div>
    </LayoutWrapper>
  );
}
