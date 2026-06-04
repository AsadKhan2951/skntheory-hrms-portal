import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import LayoutWrapper from "@/components/LayoutWrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, Calendar, Loader2, List, Grid3x3, Check } from "lucide-react";
import { format, isToday, isThisWeek, isBefore, startOfWeek } from "date-fns";
import { toast } from "sonner";

type ViewMode = "list" | "grid";
type FilterMode = "today" | "week" | "previous";

export default function Announcements() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filterMode, setFilterMode] = useState<FilterMode>("today");
  const [readAnnouncements, setReadAnnouncements] = useState<string[]>([]);

  const utils = trpc.useUtils();
  const { data: announcements = [], isLoading } = trpc.dashboard.getAnnouncements.useQuery();
  const { data: readIds = [] } = trpc.dashboard.getAnnouncementReadIds.useQuery();
  const markReadMutation = trpc.dashboard.markAnnouncementRead.useMutation({
    onSuccess: async () => {
      await utils.dashboard.getAnnouncementReadIds.invalidate();
    },
  });

  // Filter announcements based on selected filter
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((announcement) => {
      const announcementDate = new Date(announcement.createdAt);

      switch (filterMode) {
        case "today":
          return isToday(announcementDate);
        case "week":
          return isThisWeek(announcementDate, { weekStartsOn: 1 });
        case "previous":
          return isBefore(announcementDate, startOfWeek(new Date(), { weekStartsOn: 1 }));
        default:
          return true;
      }
    });
  }, [announcements, filterMode]);

  // Show most recent announcement by default if today filter has no results
  const displayAnnouncements = useMemo(() => {
    if (filterMode === "today" && filteredAnnouncements.length === 0) {
      return announcements.length ? [announcements[0]] : [];
    }
    return filteredAnnouncements;
  }, [announcements, filteredAnnouncements, filterMode]);

  useEffect(() => {
    setReadAnnouncements(readIds.filter(Boolean).map((id) => String(id)));
  }, [readIds]);

  const markAsRead = (id: string | number) => {
    const idValue = String(id);
    if (!readAnnouncements.includes(idValue)) {
      setReadAnnouncements([...readAnnouncements, idValue]);
      markReadMutation.mutate({ announcementId: String(id) }, {
        onSuccess: () => {
          toast.success("Announcement marked as read");
        },
        onError: () => {
          toast.error("Failed to mark announcement as read");
        },
      });
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive", color: string }> = {
      high: { variant: "destructive", color: "bg-red-500/10 text-red-500" },
      medium: { variant: "default", color: "bg-blue-500/10 text-blue-500" },
      low: { variant: "secondary", color: "bg-gray-500/10 text-gray-500" },
    };

    const { variant, color } = config[priority] || config.low;

    return (
      <Badge variant={variant} className={`capitalize ${color}`}>
        {priority}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: "border-l-red-500",
      medium: "border-l-blue-500",
      low: "border-l-gray-500",
    };
    return colors[priority] || "border-l-gray-500";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <LayoutWrapper>
      <div className="space-y-4">
        {/* Header with View Toggle and Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Announcements</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Stay updated with company news and important updates
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 w-8 p-0"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={filterMode === "today" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterMode("today")}
              >
                Today
              </Button>
              <Button
                variant={filterMode === "week" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterMode("week")}
              >
                Week
              </Button>
              <Button
                variant={filterMode === "previous" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setFilterMode("previous")}
              >
                Previous
              </Button>
            </div>
          </div>
        </div>

        {/* Announcements Display */}
        {displayAnnouncements && displayAnnouncements.length > 0 ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
            {displayAnnouncements.map((announcement) => {
              const isRead = readAnnouncements.includes(String(announcement.id));
              
              return viewMode === "list" ? (
                // List View
                <Card
                  key={announcement.id}
                  className={`p-4 border-l-4 ${getPriorityColor(announcement.priority || "low")} ${isRead ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Megaphone className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">{announcement.title}</h3>
                          {getPriorityBadge(announcement.priority || "low")}
                          {isRead && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500">
                              <Check className="h-3 w-3 mr-1" />
                              Read
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(announcement.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {announcement.content}
                        </p>
                      </div>
                    </div>
                    {!isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(announcement.id)}
                        className="shrink-0"
                      >
                        Mark Read
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                // Grid View
                <Card
                  key={announcement.id}
                  className={`p-4 border-l-4 ${getPriorityColor(announcement.priority || "low")} ${isRead ? 'opacity-60' : ''} flex flex-col`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Megaphone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-2">{announcement.title}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getPriorityBadge(announcement.priority || "low")}
                        {isRead && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500">
                            <Check className="h-3 w-3 mr-1" />
                            Read
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-1">
                    {announcement.content}
                  </p>
                  
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(announcement.createdAt), "MMM dd, yyyy")}
                    </div>
                    {!isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(announcement.id)}
                        className="h-7 text-xs"
                      >
                        Mark Read
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No announcements for {filterMode === "today" ? "today" : filterMode === "week" ? "this week" : "previous periods"}</p>
              <p className="text-sm mt-1">Check back later for updates</p>
            </div>
          </Card>
        )}
      </div>
    </LayoutWrapper>
  );
}
