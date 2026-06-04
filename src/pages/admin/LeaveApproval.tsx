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
  FileCheck,
  Check,
  X,
  Clock,
  User,
  Loader2,
} from "lucide-react";
import { Redirect } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";

export default function LeaveApproval() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [comments, setComments] = useState("");

  const utils = trpc.useUtils();
  const { data: leaveRequests = [], isLoading } = trpc.admin.getLeaveRequests.useQuery();
  const updateLeaveMutation = trpc.admin.updateLeaveRequest.useMutation({
    onSuccess: () => {
      utils.admin.getLeaveRequests.invalidate();
    },
  });

  if (user && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  const filteredRequests = useMemo(() => {
    return leaveRequests.filter((req: any) => (filter === "all" ? true : req.status === filter));
  }, [leaveRequests, filter]);

  const openActionDialog = (leave: any, action: "approve" | "reject") => {
    setSelectedLeave(leave);
    setActionType(action);
    setComments("");
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedLeave) return;
    if (actionType === "reject" && !comments.trim()) {
      toast.error("Please add a rejection reason");
      return;
    }
    await updateLeaveMutation.mutateAsync({
      id: selectedLeave.id,
      status: actionType === "approve" ? "approved" : "rejected",
      rejectionReason: actionType === "reject" ? comments : undefined,
    });
    toast.success(`Leave request ${actionType === "approve" ? "approved" : "rejected"} successfully`);
    setActionDialogOpen(false);
    setSelectedLeave(null);
    setComments("");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive", className: string }> = {
      pending: { variant: "secondary", className: "bg-yellow-500/10 text-yellow-600" },
      approved: { variant: "default", className: "bg-green-500/10 text-green-600" },
      rejected: { variant: "destructive", className: "bg-red-500/10 text-red-600" },
    };

    const { variant, className } = config[status] || config.pending;

    return (
      <Badge variant={variant} className={className}>
        {status}
      </Badge>
    );
  };

  const pendingCount = leaveRequests.filter((r: any) => r.status === "pending").length;

  return (
    <AdminLayout title="Leave Approval">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileCheck className="h-6 w-6" />
              Leave Approval
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount} pending
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review and manage employee leave requests
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
            variant={filter === "approved" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("approved")}
          >
            Approved
          </Button>
          <Button
            variant={filter === "rejected" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("rejected")}
          >
            Rejected
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
            filteredRequests.map((request: any) => {
              const days = request.startDate && request.endDate
                ? Math.floor((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
                : 0;
              return (
                <Card key={request.id} className="p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{request.user?.name || "Employee"}</h3>
                          <p className="text-sm text-muted-foreground">{request.user?.employeeId || "--"}</p>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Leave Type</p>
                        <p className="font-medium">{request.leaveType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Duration</p>
                        <p className="font-medium">{days} days</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                        <p className="font-medium">{request.startDate ? format(new Date(request.startDate), "MMM dd, yyyy") : "--"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">End Date</p>
                        <p className="font-medium">{request.endDate ? format(new Date(request.endDate), "MMM dd, yyyy") : "--"}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Reason</p>
                      <p className="text-sm">{request.reason}</p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Applied on {request.createdAt ? format(new Date(request.createdAt), "MMM dd, yyyy 'at' HH:mm") : "--"}
                      </div>

                      {request.status === "pending" && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openActionDialog(request, "reject")}
                            className="text-red-500 hover:text-red-600"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openActionDialog(request, "approve")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}

          {!isLoading && filteredRequests.length === 0 && (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <FileCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No leave requests found</p>
                <p className="text-sm mt-1">
                  {filter === "pending" ? "All leave requests have been reviewed" : "Try adjusting your filter"}
                </p>
              </div>
            </Card>
          )}
        </div>

        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" ? "Approve" : "Reject"} Leave Request
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? "Confirm approval of this leave request"
                  : "Provide a reason for rejecting this leave request"}
              </DialogDescription>
            </DialogHeader>

            {selectedLeave && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Employee:</span>
                    <span className="text-sm">{selectedLeave.user?.name || "Employee"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Leave Type:</span>
                    <span className="text-sm">{selectedLeave.leaveType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Duration:</span>
                    <span className="text-sm">
                      {selectedLeave.startDate && selectedLeave.endDate
                        ? Math.floor((new Date(selectedLeave.endDate).getTime() - new Date(selectedLeave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
                        : 0} days
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Dates:</span>
                    <span className="text-sm">
                      {selectedLeave.startDate ? format(new Date(selectedLeave.startDate), "MMM dd") : "--"} - {selectedLeave.endDate ? format(new Date(selectedLeave.endDate), "MMM dd, yyyy") : "--"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {actionType === "approve" ? "Comments (Optional)" : "Rejection Reason *"}
                  </label>
                  <Textarea
                    placeholder={actionType === "approve"
                      ? "Add any comments or notes..."
                      : "Explain why this request is being rejected..."}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                className={actionType === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                disabled={updateLeaveMutation.isPending}
              >
                {updateLeaveMutation.isPending ? "Saving..." : actionType === "approve" ? "Approve Leave" : "Reject Leave"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
