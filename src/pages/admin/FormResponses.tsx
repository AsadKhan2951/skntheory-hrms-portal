import AdminLayout from "@/components/AdminLayout";
import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageSquareText,
  Eye,
  CheckCircle2,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import { Redirect } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";

export default function FormResponses() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "resolved">("pending");
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState("");

  const utils = trpc.useUtils();
  const { data: formSubmissions = [], isLoading } = trpc.admin.getFormSubmissions.useQuery();
  const updateFormMutation = trpc.admin.updateFormSubmission.useMutation({
    onSuccess: () => utils.admin.getFormSubmissions.invalidate(),
  });

  if (user && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  const statusMap: Record<string, "pending" | "reviewed" | "resolved"> = {
    submitted: "pending",
    under_review: "reviewed",
    resolved: "resolved",
    closed: "resolved",
  };

  const filteredForms = useMemo(() => {
    return formSubmissions.filter((form: any) => {
      if (filter === "all") return true;
      return statusMap[form.status] === filter;
    });
  }, [formSubmissions, filter]);

  const openViewDialog = (form: any) => {
    setSelectedForm(form);
    setResponseText(form.response || "");
    setViewDialogOpen(true);
  };

  const handleRespond = async (status: "reviewed" | "resolved") => {
    if (!selectedForm) return;
    const mappedStatus = status === "reviewed" ? "under_review" : "resolved";
    await updateFormMutation.mutateAsync({
      id: selectedForm.id,
      status: mappedStatus,
      response: responseText,
    });
    toast.success(`Form marked as ${status} successfully`);
    setViewDialogOpen(false);
    setSelectedForm(null);
    setResponseText("");
  };

  const getStatusBadge = (status: string) => {
    const normalized = statusMap[status] || "pending";
    const config: Record<string, { variant: "default" | "secondary" | "destructive", className: string }> = {
      pending: { variant: "secondary", className: "bg-yellow-500/10 text-yellow-600" },
      reviewed: { variant: "default", className: "bg-blue-500/10 text-blue-600" },
      resolved: { variant: "default", className: "bg-green-500/10 text-green-600" },
    };

    const { variant, className } = config[normalized] || config.pending;

    return (
      <Badge variant={variant} className={className}>
        {normalized}
      </Badge>
    );
  };

  const pendingCount = formSubmissions.filter((f: any) => statusMap[f.status] === "pending").length;

  return (
    <AdminLayout title="Form Responses">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquareText className="h-6 w-6" />
              Form Responses
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount} pending
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review and respond to employee form submissions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Pending ({pendingCount})
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "reviewed" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("reviewed")}
          >
            Reviewed
          </Button>
          <Button
            variant={filter === "resolved" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("resolved")}
          >
            Resolved
          </Button>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <Card className="p-12">
              <div className="flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            </Card>
          ) : (
            filteredForms.map((form: any) => (
              <Card key={form.id} className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{form.user?.name || "Employee"}</h3>
                        <p className="text-sm text-muted-foreground">{form.user?.employeeId || "--"}</p>
                      </div>
                    </div>
                    {getStatusBadge(form.status)}
                  </div>

                  <div>
                    <Badge variant="outline" className="mb-2">
                      {form.formType}
                    </Badge>
                    <h4 className="font-semibold mb-2">{form.subject}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {form.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Submitted on {form.createdAt ? format(new Date(form.createdAt), "MMM dd, yyyy 'at' HH:mm") : "--"}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openViewDialog(form)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View & Respond
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}

          {!isLoading && filteredForms.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <MessageSquareText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No form submissions found</p>
                <p className="text-sm mt-1">
                  {filter === "pending" ? "All forms have been reviewed" : "Try adjusting your filter"}
                </p>
              </div>
            </Card>
          )}
        </div>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Form Submission Details</DialogTitle>
              <DialogDescription>
                Review and respond to this form submission
              </DialogDescription>
            </DialogHeader>

            {selectedForm && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Employee:</span>
                    <span className="text-sm">{selectedForm.user?.name || "Employee"} ({selectedForm.user?.employeeId || "--"})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Form Type:</span>
                    <Badge variant="outline">{selectedForm.formType}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    {getStatusBadge(selectedForm.status)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Submitted:</span>
                    <span className="text-sm">
                      {selectedForm.createdAt ? format(new Date(selectedForm.createdAt), "MMM dd, yyyy 'at' HH:mm") : "--"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedForm.subject}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedForm.content}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Response</label>
                  <Textarea
                    placeholder="Add your response or action taken..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => handleRespond("reviewed")}
                disabled={updateFormMutation.isPending}
              >
                Mark as Reviewed
              </Button>
              <Button
                onClick={() => handleRespond("resolved")}
                className="bg-green-600 hover:bg-green-700"
                disabled={updateFormMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {updateFormMutation.isPending ? "Saving..." : "Mark as Resolved"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
