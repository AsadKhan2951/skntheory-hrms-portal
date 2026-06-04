import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin,
  Video,
  ArrowRight,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface QuickMeetingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickMeetingSidebar({ isOpen, onClose }: QuickMeetingSidebarProps) {
  const [formData, setFormData] = useState({
    title: "",
    startTime: "",
    endTime: "",
    location: "",
    meetingLink: "",
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: upcomingMeetings, isLoading } = trpc.meetings.getMyMeetings.useQuery();
  const createMeeting = trpc.meetings.create.useMutation({
    onSuccess: () => {
      setShowSuccess(true);
      setFormData({
        title: "",
        startTime: "",
        endTime: "",
        location: "",
        meetingLink: "",
      });
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    },
    onError: (error) => {
      toast.error("Failed to schedule meeting: " + error.message);
    },
  });

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

  // Reset success state when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setShowSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    createMeeting.mutate({
      title: formData.title,
      description: "",
      agenda: "",
      startTime: new Date(formData.startTime),
      endTime: new Date(formData.endTime),
      location: formData.location,
      meetingLink: formData.meetingLink,
      participantIds: [],
    });
  };

  // Get next 3 upcoming meetings
  const futureMeetings = upcomingMeetings?.filter((meeting: any) => {
    return new Date(meeting.startTime) > new Date();
  }).sort((a: any, b: any) => {
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  }).slice(0, 3) || [];

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
              <h2 className="text-lg font-semibold">Quick Meeting</h2>
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Success Message */}
            {showSuccess && (
              <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">Meeting Scheduled!</p>
                    <p className="text-sm text-green-700 dark:text-green-300">Your meeting has been created successfully.</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Quick Schedule Form */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Schedule New Meeting</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <Label htmlFor="quick-title" className="text-xs">Meeting Title *</Label>
                  <Input
                    id="quick-title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Team Sync"
                    className="h-9 text-sm"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="quick-start" className="text-xs">Start Time *</Label>
                    <Input
                      id="quick-start"
                      type="datetime-local"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="quick-end" className="text-xs">End Time *</Label>
                    <Input
                      id="quick-end"
                      type="datetime-local"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="quick-location" className="text-xs">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="quick-location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Office, Room 301"
                      className="h-9 text-sm pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="quick-link" className="text-xs">Meeting Link</Label>
                  <div className="relative">
                    <Video className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      id="quick-link"
                      value={formData.meetingLink}
                      onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                      placeholder="https://meet.google.com/..."
                      className="h-9 text-sm pl-8"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-9 text-sm" 
                  disabled={createMeeting.isPending}
                >
                  {createMeeting.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-3.5 w-3.5" />
                      Schedule Meeting
                    </>
                  )}
                </Button>
              </form>
            </Card>

            {/* Upcoming Meetings */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 text-sm">Upcoming Meetings</h3>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : futureMeetings.length > 0 ? (
                <div className="space-y-2">
                  {futureMeetings.map((meeting: any) => (
                    <div
                      key={meeting.id}
                      className="p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => {
                        onClose();
                      }}
                    >
                      <Link href="/calendar">
                        <h4 className="font-medium text-xs mb-1 line-clamp-1">{meeting.title}</h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(meeting.startTime), "MMM dd, HH:mm")}</span>
                        </div>
                        {meeting.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" />
                            <span className="line-clamp-1">{meeting.location}</span>
                          </div>
                        )}
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No upcoming meetings</p>
                </div>
              )}
            </Card>
          </div>

          {/* Footer */}
          <div className="p-4 border-t">
            <Link href="/schedule-meeting">
              <Button
                variant="outline"
                className="w-full h-9 text-sm"
                onClick={onClose}
              >
                Advanced Scheduling
                <ArrowRight className="h-3.5 w-3.5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
