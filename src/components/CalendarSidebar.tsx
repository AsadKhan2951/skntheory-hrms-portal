import { useEffect } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin,
  Users,
  ArrowRight,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";

interface CalendarSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CalendarSidebar({ isOpen, onClose }: CalendarSidebarProps) {
  const { data: meetings, isLoading: meetingsLoading } = trpc.meetings.getMyMeetings.useQuery();
  const { data: events, isLoading: eventsLoading } = trpc.calendar.getMyEvents.useQuery();

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

  // Filter today's meetings and events
  const today = new Date();
  const todayStr = today.toDateString();

  const todayMeetings = meetings?.filter((m: any) => {
    const meetingDate = new Date(m.startTime);
    return meetingDate.toDateString() === todayStr;
  }) || [];

  const todayEvents = events?.filter((e: any) => {
    const eventDate = new Date(e.startTime);
    return eventDate.toDateString() === todayStr;
  }) || [];

  const allTodayItems = [
    ...todayMeetings.map((m: any) => ({ ...m, type: 'meeting' })),
    ...todayEvents.map((e: any) => ({ ...e, type: 'event' }))
  ].sort((a: any, b: any) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  const isLoading = meetingsLoading || eventsLoading;

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
              <Calendar className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Today's Schedule</h2>
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

          {/* Date Display */}
          <div className="px-4 py-3 bg-muted/30 border-b">
            <p className="text-sm font-medium">{format(today, "EEEE, MMMM dd, yyyy")}</p>
          </div>

          {/* Today's Events List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : allTodayItems.length > 0 ? (
              allTodayItems.map((item: any) => (
                <Card
                  key={`${item.type}-${item.id}`}
                  className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    onClose();
                  }}
                >
                  <Link href="/calendar">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm line-clamp-1">
                          {item.title}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          item.type === 'meeting' 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          {item.type === 'meeting' ? 'Meeting' : 'Event'}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(item.startTime), "HH:mm")}</span>
                          {item.endTime && (
                            <span> - {format(new Date(item.endTime), "HH:mm")}</span>
                          )}
                        </div>
                      </div>

                      {item.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="line-clamp-1">{item.location}</span>
                        </div>
                      )}

                      {item.type === 'meeting' && item.participantCount && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{item.participantCount} participants</span>
                        </div>
                      )}
                    </div>
                  </Link>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium mb-1">No events today</p>
                <p className="text-xs">Your schedule is clear</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t space-y-2">
            <Link href="/calendar">
              <Button
                variant="outline"
                className="w-full"
                onClick={onClose}
              >
                View Full Calendar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link href="/schedule-meeting">
              <Button
                className="w-full"
                onClick={onClose}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Meeting
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
