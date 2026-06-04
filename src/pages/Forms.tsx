import { useState } from "react";
import LayoutWrapper from "@/components/LayoutWrapper";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, Loader2, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

type FormType = "resignation" | "leave" | "grievance" | "feedback";

export default function Forms() {
  const [selectedForm, setSelectedForm] = useState<FormType | null>(null);
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
    noticePeriod: "30",
    lastWorkingDate: "",
  });

  const utils = trpc.useUtils();
  const { data: submissions, isLoading } = trpc.forms.getMyForms.useQuery();

  const submitFormMutation = trpc.forms.submit.useMutation({
    onSuccess: () => {
      toast.success("Form submitted successfully!");
      setSelectedForm(null);
      setFormData({
        subject: "",
        description: "",
        leaveType: "",
        startDate: "",
        endDate: "",
        reason: "",
        noticePeriod: "30",
        lastWorkingDate: "",
      });
      utils.forms.getMyForms.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit form");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedForm) return;

    let content = "";
    
    switch (selectedForm) {
      case "resignation":
        content = `Notice Period: ${formData.noticePeriod} days\nLast Working Date: ${formData.lastWorkingDate}\nReason: ${formData.reason}`;
        break;
      case "leave":
        content = `Leave Type: ${formData.leaveType}\nStart Date: ${formData.startDate}\nEnd Date: ${formData.endDate}\nReason: ${formData.reason}`;
        break;
      case "grievance":
      case "feedback":
        content = formData.description;
        break;
    }

    submitFormMutation.mutate({
      formType: selectedForm,
      subject: formData.subject,
      content,
    });
  };

  const formTypes = [
    {
      type: "resignation" as FormType,
      title: "Resignation Form",
      description: "Submit your resignation with notice period",
      icon: FileText,
      color: "text-red-500",
    },
    {
      type: "leave" as FormType,
      title: "Leave Application",
      description: "Apply for leave with dates and reason",
      icon: FileText,
      color: "text-blue-500",
    },
    {
      type: "grievance" as FormType,
      title: "Grievance Form",
      description: "Report workplace issues or concerns",
      icon: FileText,
      color: "text-orange-500",
    },
    {
      type: "feedback" as FormType,
      title: "General Feedback",
      description: "Share your feedback and suggestions",
      icon: FileText,
      color: "text-green-500",
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      approved: { variant: "default", icon: CheckCircle2 },
      rejected: { variant: "destructive", icon: FileText },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="capitalize">
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  return (
    <LayoutWrapper>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Forms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit various forms and track their status
          </p>
        </div>

        {/* Form Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {formTypes.map((form) => {
            const Icon = form.icon;
            return (
              <Card
                key={form.type}
                className="p-4 cursor-pointer hover:border-primary transition-colors"
                onClick={() => setSelectedForm(form.type)}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`p-3 bg-muted rounded-lg ${form.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{form.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {form.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Submission History */}
        <Card>
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Submission History</h2>
          </div>

          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : submissions && submissions.length > 0 ? (
              <div className="space-y-2">
                {submissions.map((submission: any) => (
                  <Card key={submission.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="capitalize">
                            {submission.type}
                          </Badge>
                          {getStatusBadge(submission.status)}
                        </div>
                        <h4 className="font-medium text-sm">{submission.subject}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted on {format(new Date(submission.createdAt), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No form submissions yet</p>
                <p className="text-xs mt-1">Click on a form type above to get started</p>
              </div>
            )}
          </div>
        </Card>

        {/* Form Dialog */}
        <Dialog open={!!selectedForm} onOpenChange={() => setSelectedForm(null)}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {formTypes.find((f) => f.type === selectedForm)?.title}
                </DialogTitle>
                <DialogDescription>
                  Fill out the form below and submit for review
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Enter subject"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    required
                  />
                </div>

                {selectedForm === "resignation" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="noticePeriod">Notice Period (days) *</Label>
                      <Select
                        value={formData.noticePeriod}
                        onValueChange={(value) =>
                          setFormData({ ...formData, noticePeriod: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="60">60 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastWorkingDate">Last Working Date *</Label>
                      <Input
                        id="lastWorkingDate"
                        type="date"
                        value={formData.lastWorkingDate}
                        onChange={(e) =>
                          setFormData({ ...formData, lastWorkingDate: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason *</Label>
                      <Textarea
                        id="reason"
                        placeholder="Please provide your reason for resignation"
                        value={formData.reason}
                        onChange={(e) =>
                          setFormData({ ...formData, reason: e.target.value })
                        }
                        required
                        rows={3}
                      />
                    </div>
                  </>
                )}

                {selectedForm === "leave" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="leaveType">Leave Type *</Label>
                      <Select
                        value={formData.leaveType}
                        onValueChange={(value) =>
                          setFormData({ ...formData, leaveType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select leave type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="annual">Annual Leave</SelectItem>
                          <SelectItem value="sick">Sick Leave</SelectItem>
                          <SelectItem value="casual">Casual Leave</SelectItem>
                          <SelectItem value="emergency">Emergency Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={formData.startDate}
                          onChange={(e) =>
                            setFormData({ ...formData, startDate: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date *</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={(e) =>
                            setFormData({ ...formData, endDate: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason *</Label>
                      <Textarea
                        id="reason"
                        placeholder="Please provide reason for leave"
                        value={formData.reason}
                        onChange={(e) =>
                          setFormData({ ...formData, reason: e.target.value })
                        }
                        required
                        rows={3}
                      />
                    </div>
                  </>
                )}

                {(selectedForm === "grievance" || selectedForm === "feedback") && (
                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder={
                        selectedForm === "grievance"
                          ? "Describe your grievance in detail"
                          : "Share your feedback and suggestions"
                      }
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      required
                      rows={5}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedForm(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitFormMutation.isPending}>
                  {submitFormMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </LayoutWrapper>
  );
}
