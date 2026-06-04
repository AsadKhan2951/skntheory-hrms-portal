import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus,
  Megaphone,
  Calendar,
  Users,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

export default function AnnouncementsManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const utils = trpc.useUtils();
  const { data: announcements = [], isLoading } = trpc.admin.getAnnouncements.useQuery();
  const createAnnouncement = trpc.admin.createAnnouncement.useMutation({
    onSuccess: async () => {
      await utils.admin.getAnnouncements.invalidate();
      toast.success("Announcement published successfully!");
      setTitle("");
      setContent("");
      setPriority("medium");
      setShowCreateDialog(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish announcement");
    },
  });
  const deleteAnnouncement = trpc.admin.deleteAnnouncement.useMutation({
    onSuccess: async () => {
      await utils.admin.getAnnouncements.invalidate();
      toast.success("Announcement deleted");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete announcement");
    },
  });

  const handleCreateAnnouncement = () => {
    if (!title || !content) {
      toast.error("Please fill in all fields");
      return;
    }
    createAnnouncement.mutate({
      title,
      content,
      priority,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      default: return "secondary";
    }
  };

  return (
    <AdminLayout title="Announcements Management">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Announcements</h2>
            <p className="text-sm text-muted-foreground">
              Create and manage announcements for all employees
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(!showCreateDialog)}>
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>

        {/* Create Announcement Form */}
        {showCreateDialog && (
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Create New Announcement
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  placeholder="Enter announcement title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Content</label>
                <Textarea
                  placeholder="Enter announcement content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Priority</label>
                <div className="flex gap-2">
                  <Button
                    variant={priority === "low" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPriority("low")}
                  >
                    Normal
                  </Button>
                  <Button
                    variant={priority === "medium" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPriority("medium")}
                  >
                    Important
                  </Button>
                  <Button
                    variant={priority === "high" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPriority("high")}
                  >
                    Urgent
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateAnnouncement}>
                  Publish Announcement
                </Button>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Announcements List */}
        <div className="space-y-3">
          {isLoading ? (
            <Card className="p-6 text-center text-muted-foreground">Loading announcements...</Card>
          ) : announcements.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">No announcements found</Card>
          ) : (
            announcements.map((announcement: any) => (
              <Card key={announcement.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{announcement.title}</h3>
                      <Badge variant={getPriorityColor(announcement.priority)}>
                        {announcement.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {announcement.createdAt ? format(new Date(announcement.createdAt), "MMM dd, yyyy") : "--"}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {announcement.readCount ?? 0} employees read
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteAnnouncement.mutate({ id: String(announcement.id) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
