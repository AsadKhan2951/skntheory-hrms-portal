import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  Grid3x3,
  List,
  Filter,
  Download,
  Upload,
  FileText,
  Award,
  DollarSign,
  Calendar,
  Shield,
  History
} from "lucide-react";
import { Redirect } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

export default function EmployeeManagement() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: employeeData = [], isLoading: employeesLoading } = trpc.employees.list.useQuery();
  const createEmployeeMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      utils.employees.list.invalidate();
    },
  });
  const updateEmployeeMutation = trpc.employees.update.useMutation({
    onSuccess: () => {
      utils.employees.list.invalidate();
    },
  });
  const resetPasswordMutation = trpc.employees.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successfully");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to reset password");
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "past">("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [editableEmployee, setEditableEmployee] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    email: "",
    employeeId: "",
    password: "",
    department: "",
    position: "",
  });
  const [cnicFrontFile, setCnicFrontFile] = useState<File | null>(null);
  const [cnicBackFile, setCnicBackFile] = useState<File | null>(null);
  const [offerLetterFile, setOfferLetterFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Redirect if not admin
  if (user?.role !== "admin") {
    return <Redirect to="/" />;
  }

  const employees = employeeData
    .filter((emp: any) => emp?.role !== "admin")
    .map((emp: any) => ({
      ...emp,
      name: emp?.name || "Unknown",
      email: emp?.email || "",
      employeeId: emp?.employeeId || "",
      status: emp?.status || "active",
      department: emp?.department || "General",
      position: emp?.position || "Employee",
      leaveBalance: emp?.leaveBalance || { vacation: 0, sick: 0, casual: 0 },
    }));

  const filteredEmployees = employees.filter((emp: any) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && emp.status === "active") ||
      (filterStatus === "inactive" && emp.status === "inactive");

    const matchesDepartment =
      filterDepartment === "all" || emp.department === filterDepartment;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const handleViewDetails = (employee: any) => {
    setSelectedEmployee(employee);
    setEditableEmployee({ ...employee });
    setResetPasswordValue("");
    setDetailsDialogOpen(true);
  };

  const handleBulkAction = (action: string) => {
    toast.success(`Bulk ${action} action initiated`);
  };

  const apiBaseUrl = import.meta.env.VITE_API_URL?.trim();
  const uploadEndpoint = apiBaseUrl
    ? `${apiBaseUrl.replace(/\/+$/, "")}/api/upload-employee-document`
    : "/api/upload-employee-document";

  const uploadDocument = async (file: File, docType: "cnic_front" | "cnic_back" | "offer_letter") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", docType);
    const response = await fetch(uploadEndpoint, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || "Failed to upload document");
    }
    const payload = await response.json();
    return payload.url as string;
  };

  const handleCreateEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.employeeId || !newEmployee.password || !newEmployee.department || !newEmployee.position) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const uploads: Array<Promise<string>> = [];
      const uploadMap: Array<"cnic_front" | "cnic_back" | "offer_letter"> = [];
      if (cnicFrontFile) {
        uploads.push(uploadDocument(cnicFrontFile, "cnic_front"));
        uploadMap.push("cnic_front");
      }
      if (cnicBackFile) {
        uploads.push(uploadDocument(cnicBackFile, "cnic_back"));
        uploadMap.push("cnic_back");
      }
      if (offerLetterFile) {
        uploads.push(uploadDocument(offerLetterFile, "offer_letter"));
        uploadMap.push("offer_letter");
      }
      const uploadResults = uploads.length ? await Promise.all(uploads) : [];
      const uploadUrls: Record<string, string> = {};
      uploadResults.forEach((url, idx) => {
        uploadUrls[uploadMap[idx]] = url;
      });

      await createEmployeeMutation.mutateAsync({
        ...newEmployee,
        cnicFrontUrl: uploadUrls.cnic_front,
        cnicBackUrl: uploadUrls.cnic_back,
        offerLetterUrl: uploadUrls.offer_letter,
      });

      toast.success("Employee added successfully");
      setAddDialogOpen(false);
      setNewEmployee({
        name: "",
        email: "",
        employeeId: "",
        password: "",
        department: "",
        position: "",
      });
      setCnicFrontFile(null);
      setCnicBackFile(null);
      setOfferLetterFile(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create employee");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!editableEmployee?.id) return;
    setIsUpdating(true);
    try {
      await updateEmployeeMutation.mutateAsync({
        id: editableEmployee.id,
        name: editableEmployee.name,
        email: editableEmployee.email,
        employeeId: editableEmployee.employeeId,
        department: editableEmployee.department,
        position: editableEmployee.position,
      });
      toast.success("Employee updated successfully");
      setDetailsDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update employee");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AdminLayout title="Employee Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Employee Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Comprehensive employee information and management system
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleBulkAction("export")}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, email, department, or skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
                <SelectItem value="past">Past Employees</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Engineering">Engineering</SelectItem>
                <SelectItem value="HR">HR</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4 mr-2" />
                List View
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4 mr-2" />
                Grid View
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {employeesLoading ? "Loading..." : `${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? "s" : ""} found`}
            </div>
          </div>
        </Card>

        {/* Employee List/Grid */}
        {viewMode === "list" ? (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-4 font-medium">Employee ID</th>
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Department</th>
                    <th className="p-4 font-medium">Position</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="border-b hover:bg-muted/50">
                      <td className="p-4 font-mono text-sm">{employee.employeeId}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            {employee.name.charAt(0)}
                          </div>
                          {employee.name}
                        </div>
                      </td>
                      <td className="p-4 text-sm">{employee.email}</td>
                      <td className="p-4">{employee.department}</td>
                      <td className="p-4">{employee.position}</td>
                      <td className="p-4">
                        <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                          {employee.status === "active" ? (
                            <><UserCheck className="h-3 w-3 mr-1" /> Active</>
                          ) : (
                            <><UserX className="h-3 w-3 mr-1" /> Inactive</>
                          )}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold">
                      {employee.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{employee.name}</h3>
                      <p className="text-sm text-muted-foreground">{employee.employeeId}</p>
                    </div>
                  </div>
                  <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                    {employee.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department:</span>
                    <span className="font-medium">{employee.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Position:</span>
                    <span className="font-medium">{employee.position}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium text-xs">{employee.email}</span>
                  </div>
                </div>

                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => handleViewDetails(employee)}
                >
                  View Full Profile
                </Button>
              </Card>
            ))}
          </div>
        )}

        {/* Employee Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employee Profile: {selectedEmployee?.name}
              </DialogTitle>
              <DialogDescription>
                Comprehensive employee information and management
              </DialogDescription>
            </DialogHeader>

            {(editableEmployee || selectedEmployee) && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full flex flex-wrap gap-2 bg-muted/40 p-1 rounded-lg">
                  <TabsTrigger value="overview" className="whitespace-nowrap px-3">Overview</TabsTrigger>
                  <TabsTrigger value="employment" className="whitespace-nowrap px-3">Employment</TabsTrigger>
                  <TabsTrigger value="financial" className="whitespace-nowrap px-3">Financial</TabsTrigger>
                  <TabsTrigger value="performance" className="whitespace-nowrap px-3">Performance</TabsTrigger>
                  <TabsTrigger value="documents" className="whitespace-nowrap px-3">Documents</TabsTrigger>
                  <TabsTrigger value="compliance" className="whitespace-nowrap px-3">Compliance</TabsTrigger>
                  <TabsTrigger value="audit" className="whitespace-nowrap px-3">Audit Log</TabsTrigger>
                </TabsList>

                {/* 1. Overview Tab - Core Employee Information */}
                <TabsContent value="overview" className="space-y-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Employee ID</Label>
                        <Input
                          value={editableEmployee?.employeeId || ""}
                          onChange={(e) =>
                            setEditableEmployee((prev: any) => ({ ...prev, employeeId: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Full Name</Label>
                        <Input
                          value={editableEmployee?.name || ""}
                          onChange={(e) =>
                            setEditableEmployee((prev: any) => ({ ...prev, name: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Date of Birth</Label>
                        <Input type="date" defaultValue={selectedEmployee?.dateOfBirth} onChange={() => {}} />
                      </div>
                      <div>
                        <Label>Gender</Label>
                        <Select value={selectedEmployee?.gender}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Marital Status</Label>
                        <Select value={selectedEmployee?.maritalStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="married">Married</SelectItem>
                            <SelectItem value="divorced">Divorced</SelectItem>
                            <SelectItem value="widowed">Widowed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Nationality</Label>
                        <Input defaultValue={selectedEmployee?.nationality} onChange={() => {}} />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Contact Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Work Email</Label>
                        <Input
                          value={editableEmployee?.email || ""}
                          onChange={(e) =>
                            setEditableEmployee((prev: any) => ({ ...prev, email: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Personal Email</Label>
                        <Input defaultValue={selectedEmployee?.personalEmail} onChange={() => {}} />
                      </div>
                      <div>
                        <Label>Mobile Phone</Label>
                        <Input defaultValue={selectedEmployee?.mobilePhone} onChange={() => {}} />
                      </div>
                      <div>
                        <Label>Current Address</Label>
                        <Textarea defaultValue={selectedEmployee?.currentAddress} rows={2} onChange={() => {}} />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Emergency Contact</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Contact Name</Label>
                        <Input placeholder="Emergency contact name" />
                      </div>
                      <div>
                        <Label>Relationship</Label>
                        <Input placeholder="e.g., Spouse, Parent" />
                      </div>
                      <div>
                        <Label>Contact Number</Label>
                        <Input placeholder="+971..." />
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* 2. Employment Tab */}
                <TabsContent value="employment" className="space-y-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Job Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Job Title</Label>
                        <Input
                          value={editableEmployee?.position || ""}
                          onChange={(e) =>
                            setEditableEmployee((prev: any) => ({ ...prev, position: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Department</Label>
                        <Select
                          value={editableEmployee?.department || ""}
                          onValueChange={(value) =>
                            setEditableEmployee((prev: any) => ({ ...prev, department: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Engineering">Engineering</SelectItem>
                            <SelectItem value="HR">HR</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Employment Status</Label>
                        <Select value={selectedEmployee?.employmentStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full_time">Full Time</SelectItem>
                            <SelectItem value="part_time">Part Time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Work Location</Label>
                        <Input defaultValue={selectedEmployee?.workLocation} onChange={() => {}} />
                      </div>
                      <div>
                        <Label>Shift</Label>
                        <Input defaultValue={selectedEmployee?.shift} onChange={() => {}} />
                      </div>
                      <div>
                        <Label>Weekly Hours</Label>
                        <Input type="number" defaultValue={selectedEmployee?.weeklyHours} onChange={() => {}} />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Key Dates</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Joined Date</Label>
                        <Input type="date" defaultValue={selectedEmployee?.joinedDate} onChange={() => {}} />
                      </div>
                      <div>
                        <Label>Probation End Date</Label>
                        <Input type="date" />
                      </div>
                      <div>
                        <Label>Contract End Date</Label>
                        <Input type="date" />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Account Access</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div>
                        <Label>Reset Password</Label>
                        <Input
                          type="password"
                          placeholder="Enter new temporary password"
                          value={resetPasswordValue}
                          onChange={(e) => setResetPasswordValue(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Minimum 6 characters. Employee will use this to sign in.
                        </p>
                      </div>
                      <div className="flex items-center justify-start md:justify-end">
                        <Button
                          onClick={() => {
                            if (!selectedEmployee?.id) return;
                            if (resetPasswordValue.trim().length < 6) {
                              toast.error("Password must be at least 6 characters");
                              return;
                            }
                            resetPasswordMutation.mutate({
                              id: selectedEmployee.id,
                              newPassword: resetPasswordValue.trim(),
                            });
                            setResetPasswordValue("");
                          }}
                          disabled={resetPasswordMutation.isPending || resetPasswordValue.trim().length < 6}
                        >
                          {resetPasswordMutation.isPending && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Reset Password
                        </Button>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Job History</h3>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Entry
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      No job history records found
                    </div>
                  </Card>
                </TabsContent>

                {/* 3. Financial Tab */}
                <TabsContent value="financial" className="space-y-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Salary Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Annual Salary (AED)</Label>
                        <Input type="number" defaultValue={selectedEmployee.annualSalary} onChange={() => {}} />
                      </div>
                      <div>
                        <Label>Monthly Salary (AED)</Label>
                        <Input type="number" defaultValue={selectedEmployee.monthlySalary} onChange={() => {}} />
                      </div>
                      <div>
                        <Label>Basic Pay</Label>
                        <Input type="number" placeholder="Basic pay component" />
                      </div>
                      <div>
                        <Label>Housing Allowance</Label>
                        <Input type="number" placeholder="Housing allowance" />
                      </div>
                      <div>
                        <Label>Transportation Allowance</Label>
                        <Input type="number" placeholder="Transportation" />
                      </div>
                      <div>
                        <Label>Medical Allowance</Label>
                        <Input type="number" placeholder="Medical" />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Bank Account Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Bank Name</Label>
                        <Input placeholder="e.g., Emirates NBD" />
                      </div>
                      <div>
                        <Label>Account Number</Label>
                        <Input placeholder="Account number" />
                      </div>
                      <div>
                        <Label>IBAN</Label>
                        <Input placeholder="AE..." />
                      </div>
                      <div>
                        <Label>SWIFT Code</Label>
                        <Input placeholder="SWIFT/BIC code" />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Tax & Benefits</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tax ID</Label>
                        <Input placeholder="Tax identification number" />
                      </div>
                      <div>
                        <Label>Health Insurance</Label>
                        <Input placeholder="Insurance provider & policy" />
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* 4. Performance Tab */}
                <TabsContent value="performance" className="space-y-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Performance Reviews
                      </h3>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Review
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      No performance reviews found
                    </div>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Qualifications & Training</h3>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Qualification
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      No qualifications or training records found
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Leave Balance</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 border rounded">
                        <div className="text-sm text-muted-foreground">Vacation Leave</div>
                        <div className="text-2xl font-bold">{selectedEmployee?.leaveBalance?.vacation ?? 0} days</div>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="text-sm text-muted-foreground">Sick Leave</div>
                        <div className="text-2xl font-bold">{selectedEmployee?.leaveBalance?.sick ?? 0} days</div>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="text-sm text-muted-foreground">Casual Leave</div>
                        <div className="text-2xl font-bold">{selectedEmployee?.leaveBalance?.casual ?? 0} days</div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* 5. Documents Tab */}
                <TabsContent value="documents" className="space-y-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Employee Documents
                      </h3>
                      <Button size="sm" variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3 border rounded flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">Offer Letter</div>
                            <div className="text-sm text-muted-foreground">Uploaded on Jan 15, 2024</div>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-3 border rounded flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">Employment Contract</div>
                            <div className="text-sm text-muted-foreground">Uploaded on Jan 15, 2024</div>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* 6. Compliance Tab */}
                <TabsContent value="compliance" className="space-y-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Background Verification
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Verification Status</Label>
                        <Select defaultValue="completed">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Verification Date</Label>
                        <Input type="date" />
                      </div>
                      <div className="col-span-2">
                        <Label>Notes</Label>
                        <Textarea placeholder="Background check notes..." rows={3} />
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Work Authorization</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Work Permit Number</Label>
                        <Input placeholder="Work permit number" />
                      </div>
                      <div>
                        <Label>Work Permit Expiry</Label>
                        <Input type="date" />
                      </div>
                      <div>
                        <Label>Visa Number</Label>
                        <Input placeholder="Visa number" />
                      </div>
                      <div>
                        <Label>Visa Expiry Date</Label>
                        <Input type="date" />
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* 7. Audit Log Tab */}
                <TabsContent value="audit" className="space-y-4">
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Change History
                    </h3>
                    <div className="space-y-3">
                      <div className="p-3 border-l-4 border-primary bg-muted/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">Salary Updated</span>
                          <span className="text-sm text-muted-foreground">2 days ago</span>
                        </div>
                        <div className="text-sm">
                          Changed by: <span className="font-medium">{user?.name || "Admin"}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Monthly salary changed from AED 14,000 to AED 15,000
                        </div>
                      </div>
                      <div className="p-3 border-l-4 border-blue-500 bg-muted/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">Department Transfer</span>
                          <span className="text-sm text-muted-foreground">1 week ago</span>
                        </div>
                        <div className="text-sm">
                          Changed by: <span className="font-medium">{user?.name || "Admin"}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Transferred from Marketing to Engineering
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={handleSaveChanges} disabled={isUpdating}>
                {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Employee Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Fill in the employee details and upload required documents
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input
                  placeholder="John Doe"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="john@rad.com"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label>Employee ID *</Label>
                <Input
                  placeholder="EMP001"
                  value={newEmployee.employeeId}
                  onChange={(e) => setNewEmployee((prev) => ({ ...prev, employeeId: e.target.value }))}
                />
              </div>
              <div>
                <Label>Password *</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>
              <div>
                <Label>Department *</Label>
                <Input
                  placeholder="Engineering"
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee((prev) => ({ ...prev, department: e.target.value }))}
                />
              </div>
              <div>
                <Label>Designation *</Label>
                <Input
                  placeholder="Software Developer"
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee((prev) => ({ ...prev, position: e.target.value }))}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Required Documents</h4>
              <div className="space-y-3">
                <div>
                  <Label>CNIC Front</Label>
                  <Input type="file" onChange={(e) => setCnicFrontFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <Label>CNIC Back</Label>
                  <Input type="file" onChange={(e) => setCnicBackFile(e.target.files?.[0] || null)} />
                </div>
                <div>
                  <Label>Job Offer Letter</Label>
                  <Input type="file" onChange={(e) => setOfferLetterFile(e.target.files?.[0] || null)} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateEmployee} disabled={isCreating || createEmployeeMutation.isPending}>
                {(isCreating || createEmployeeMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Employee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
