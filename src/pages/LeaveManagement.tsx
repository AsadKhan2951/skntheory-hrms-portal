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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, FileText, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function LeaveManagement() {
  const [open, setOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const utils = trpc.useUtils();
  const { data: leaves, isLoading } = trpc.leaves.getMyLeaves.useQuery();

  const submitMutation = trpc.leaves.submit.useMutation({
    onSuccess: () => {
      toast.success("Leave application submitted successfully!");
      setOpen(false);
      setLeaveType("");
      setStartDate("");
      setEndDate("");
      setReason("");
      utils.leaves.getMyLeaves.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!leaveType || !startDate || !endDate || !reason.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    submitMutation.mutate({
      leaveType: leaveType as any,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason.trim(),
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const getLeaveTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      sick: "text-red-500",
      casual: "text-blue-500",
      annual: "text-green-500",
      unpaid: "text-gray-500",
      other: "text-purple-500",
    };
    return colors[type] || "text-gray-500";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Apply for leave and track your applications
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Apply for Leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Fill in the details for your leave application
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select value={leaveType} onValueChange={setLeaveType}>
                  <SelectTrigger id="leaveType">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="annual">Annual Leave</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a reason for your leave..."
                  rows={4}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Applications</p>
              <p className="text-2xl font-bold">{leaves?.length || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Clock className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">
                {leaves?.filter((l) => l.status === "approved").length || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <FileText className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">
                {leaves?.filter((l) => l.status === "pending").length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Leave History */}
      <Card>
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Leave History</h2>
        </div>

        <div className="p-6">
          {leaves && leaves.length > 0 ? (
            <div className="space-y-4">
              {leaves.map((leave) => {
                const days = Math.ceil(
                  (new Date(leave.endDate).getTime() -
                    new Date(leave.startDate).getTime()) /
                    (1000 * 60 * 60 * 24)
                ) + 1;

                return (
                  <Card key={leave.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <FileText className={`h-5 w-5 ${getLeaveTypeColor(leave.leaveType)}`} />
                          <h3 className="font-semibold capitalize">
                            {leave.leaveType.replace("_", " ")} Leave
                          </h3>
                          {getStatusBadge(leave.status)}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(leave.startDate), "MMM dd, yyyy")} -{" "}
                            {format(new Date(leave.endDate), "MMM dd, yyyy")}
                          </div>
                          <div>({days} {days === 1 ? "day" : "days"})</div>
                        </div>

                        <p className="text-sm">{leave.reason}</p>

                        <div className="text-xs text-muted-foreground">
                          Applied on {format(new Date(leave.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leave applications yet</p>
              <p className="text-sm mt-1">Click "Apply for Leave" to submit your first application</p>
            </div>
          )}
        </div>
      </Card>
    </div>
    </LayoutWrapper>
  );
}
