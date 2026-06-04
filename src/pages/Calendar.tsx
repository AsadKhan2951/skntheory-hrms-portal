import { useState, useMemo } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, View } from "react-big-calendar";
import { enUS } from "date-fns/locale";
import { format, parse, startOfWeek, getDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../_core/hooks/useAuth";
import { toast as showToast } from "sonner";
import { CalendarIcon, Users, Clock, MapPin, Link as LinkIcon, FileText } from "lucide-react";
import LayoutWrapper from "@/components/LayoutWrapper";

// Setup localizer for react-big-calendar
const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "meeting" | "event" | "deadline";
  description?: string;
  location?: string;
  meetingLink?: string;
  organizerId?: string;
  status?: string;
}

export default function Calendar() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showMinutesDialog, setShowMinutesDialog] = useState(false);

  // Fetch meetings and events
  const { data: meetings = [], refetch: refetchMeetings } = trpc.meetings.getMyMeetings.useQuery();
  const { data: calendarData } = trpc.calendar.getEventsByDateRange.useQuery({
    startDate: new Date(date.getFullYear(), date.getMonth(), 1),
    endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0),
  });

  // Mutations
  const createMeeting = trpc.meetings.create.useMutation({
    onSuccess: () => {
      showToast.success("Meeting created successfully");
      refetchMeetings();
      setShowMeetingDialog(false);
    },
  });

  const createEvent = trpc.calendar.createEvent.useMutation({
    onSuccess: () => {
      showToast.success("Event created successfully");
      refetchMeetings();
      setShowEventDialog(false);
    },
  });

  const addMinutes = trpc.meetings.addMinutes.useMutation({
    onSuccess: () => {
      showToast.success("Meeting minutes saved");
      refetchMeetings();
      setShowMinutesDialog(false);
    },
  });

  // Transform data for calendar
  const events: CalendarEvent[] = useMemo(() => {
    const meetingEvents: CalendarEvent[] = (meetings || []).map((meeting: any) => ({
      id: meeting.id,
      title: meeting.title,
      start: new Date(meeting.startTime),
      end: new Date(meeting.endTime),
      type: "meeting" as const,
      description: meeting.description,
      location: meeting.location,
      meetingLink: meeting.meetingLink,
      organizerId: meeting.organizerId,
      status: meeting.status,
    }));

    const calendarEvents: CalendarEvent[] = (calendarData?.events || []).map((event: any) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.startTime),
      end: new Date(event.endTime),
      type: event.eventType === "deadline" ? "deadline" : "event",
      description: event.description,
    }));

    return [...meetingEvents, ...calendarEvents];
  }, [meetings, calendarData]);

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    // User clicked on empty slot - show create dialog
    setShowMeetingDialog(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = "#3174ad";
    if (event.type === "meeting") backgroundColor = "#ff2801";
    if (event.type === "deadline") backgroundColor = "#f59e0b";
    if (event.type === "event") backgroundColor = "#10b981";

    return {
      style: {
        backgroundColor,
        borderRadius: "5px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  return (
    <LayoutWrapper>
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">Manage your meetings, events, and deadlines</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
            <DialogTrigger asChild>
              <Button>
                <Users className="mr-2 h-4 w-4" />
                New Meeting
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Meeting</DialogTitle>
              </DialogHeader>
              <MeetingForm
                onSubmit={(data) => createMeeting.mutate(data)}
                onCancel={() => setShowMeetingDialog(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Event</DialogTitle>
              </DialogHeader>
              <EventForm
                onSubmit={(data) => createEvent.mutate(data)}
                onCancel={() => setShowEventDialog(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card rounded-lg p-3 shadow">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          eventPropGetter={eventStyleGetter}
        />
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>
                  {format(selectedEvent.start, "PPp")} - {format(selectedEvent.end, "p")}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.meetingLink && (
                <div className="flex items-center gap-2 text-sm">
                  <LinkIcon className="h-4 w-4" />
                  <a href={selectedEvent.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Join Meeting
                  </a>
                </div>
              )}
              {selectedEvent.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Description:</p>
                  <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                </div>
              )}
              {selectedEvent.type === "meeting" && selectedEvent.status === "scheduled" && (
                <Button
                  onClick={() => {
                    setShowMinutesDialog(true);
                    setSelectedEvent(null);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Add Meeting Minutes
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Meeting Minutes Dialog */}
      <Dialog open={showMinutesDialog} onOpenChange={setShowMinutesDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meeting Minutes</DialogTitle>
          </DialogHeader>
          <MinutesForm
            meetingId={selectedEvent?.id || ""}
            onSubmit={(data) => addMinutes.mutate(data)}
            onCancel={() => setShowMinutesDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
    </LayoutWrapper>
  );
}

// Meeting Form Component
function MeetingForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    agenda: "",
    startTime: "",
    endTime: "",
    location: "",
    meetingLink: "",
    participantIds: [] as string[],
  });

  const { data: users = [] } = trpc.dashboard.getUsers.useQuery();
  const availableUsers = users.filter(
    (emp: any) => String(emp.id) !== String(user?.id ?? "")
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      startTime: new Date(formData.startTime),
      endTime: new Date(formData.endTime),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="agenda">Agenda</Label>
        <Textarea
          id="agenda"
          value={formData.agenda}
          onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Start Time *</Label>
          <Input
            id="startTime"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time *</Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="meetingLink">Meeting Link</Label>
        <Input
          id="meetingLink"
          type="url"
          value={formData.meetingLink}
          onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
          placeholder="https://meet.google.com/..."
        />
      </div>
      <div>
        <Label>Participants</Label>
        <Select
          onValueChange={(value) => {
            if (!formData.participantIds.includes(value)) {
              setFormData({ ...formData, participantIds: [...formData.participantIds, value] });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select participants" />
          </SelectTrigger>
      <SelectContent>
            {availableUsers.length === 0 ? (
              <SelectItem value="none" disabled>
                No employees found
              </SelectItem>
            ) : (
              availableUsers.map((user: any) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name} ({user.email})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <div className="mt-2 flex flex-wrap gap-2">
          {formData.participantIds.map((id) => {
            const user = availableUsers.find((u: any) => String(u.id) === String(id));
            return (
              <div key={id} className="bg-secondary px-2 py-1 rounded text-sm flex items-center gap-1">
                {user?.name}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, participantIds: formData.participantIds.filter((pid) => pid !== id) })}
                  className="text-destructive hover:text-destructive/80"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Meeting</Button>
      </div>
    </form>
  );
}

// Event Form Component
function EventForm({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    eventType: "personal" as "reminder" | "personal" | "deadline" | "holiday",
    isAllDay: false,
    participantIds: [] as string[],
  });
  const { data: users = [] } = trpc.dashboard.getUsers.useQuery();
  const availableUsers = users.filter(
    (emp: any) => String(emp.id) !== String(user?.id ?? "")
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      startTime: new Date(formData.startTime),
      endTime: new Date(formData.endTime),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="eventType">Event Type</Label>
        <Select value={formData.eventType} onValueChange={(value: any) => setFormData({ ...formData, eventType: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="reminder">Reminder</SelectItem>
            <SelectItem value="deadline">Deadline</SelectItem>
            <SelectItem value="holiday">Holiday</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Participants</Label>
        <Select
          onValueChange={(value) => {
            if (!formData.participantIds.includes(value)) {
              setFormData({ ...formData, participantIds: [...formData.participantIds, value] });
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select participants" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.length === 0 ? (
              <SelectItem value="none" disabled>
                No employees found
              </SelectItem>
            ) : (
              availableUsers.map((user: any) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.name} ({user.email})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <div className="mt-2 flex flex-wrap gap-2">
          {formData.participantIds.map((id) => {
            const user = availableUsers.find((u: any) => String(u.id) === String(id));
            return (
              <div key={id} className="bg-secondary px-2 py-1 rounded text-sm flex items-center gap-1">
                {user?.name}
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      participantIds: formData.participantIds.filter((pid) => pid !== id),
                    })
                  }
                  className="text-destructive hover:text-destructive/80"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Start Time *</Label>
          <Input
            id="startTime"
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time *</Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Event</Button>
      </div>
    </form>
  );
}

// Minutes Form Component
function MinutesForm({ meetingId, onSubmit, onCancel }: { meetingId: string; onSubmit: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    meetingMinutes: "",
    actionItems: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingId) {
      return;
    }
    onSubmit({
      meetingId,
      ...formData,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="meetingMinutes">Meeting Minutes *</Label>
        <Textarea
          id="meetingMinutes"
          value={formData.meetingMinutes}
          onChange={(e) => setFormData({ ...formData, meetingMinutes: e.target.value })}
          rows={6}
          required
          placeholder="Summarize what was discussed in the meeting..."
        />
      </div>
      <div>
        <Label htmlFor="actionItems">Action Items *</Label>
        <Textarea
          id="actionItems"
          value={formData.actionItems}
          onChange={(e) => setFormData({ ...formData, actionItems: e.target.value })}
          rows={4}
          required
          placeholder="List action items and who is responsible..."
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Minutes</Button>
      </div>
    </form>
  );
}
