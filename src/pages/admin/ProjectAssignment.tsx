import AdminLayout from "@/components/AdminLayout";
import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  FolderKanban,
  Plus,
  Users,
  Calendar,
  CheckCircle2,
  Trash2,
  ClipboardList,
  Edit,
} from "lucide-react";
import { Redirect } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

export default function ProjectAssignment() {
  const { user } = useAuth();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectPriority, setProjectPriority] = useState("medium");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectEndDate, setProjectEndDate] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    completionDate: "",
    isOngoing: false,
    assigneeIds: [] as string[],
  });
  const [employeeFilterId, setEmployeeFilterId] = useState("");
  const [projectDetailsOpen, setProjectDetailsOpen] = useState(false);
  const [projectDetails, setProjectDetails] = useState<any>(null);
  const [showArchived, setShowArchived] = useState(false);

  const utils = trpc.useUtils();
  const { data: employeeData = [], isLoading: employeesLoading } = trpc.employees.list.useQuery();
  const employees = employeeData.filter((emp: any) => emp?.role === "user");
  const { data: projects = [], isLoading: projectsLoading } = trpc.admin.getProjectsOverview.useQuery();
  const { data: projectTasks = [], isLoading: projectTasksLoading } = trpc.admin.getProjectTasks.useQuery(
    { projectId: selectedProjectId },
    { enabled: Boolean(selectedProjectId) }
  );
  const { data: detailTasks = [], isLoading: detailTasksLoading } = trpc.admin.getProjectTasks.useQuery(
    { projectId: projectDetails?.id ? String(projectDetails.id) : "" },
    { enabled: Boolean(projectDetails?.id) }
  );
  const [dailyTasksDate, setDailyTasksDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const { data: dailyTasks = [], isLoading: dailyTasksLoading } = trpc.admin.getTasksByDate.useQuery({
    date: new Date(`${dailyTasksDate}T00:00:00`),
  });
  const { data: employeeProjects = [] } = trpc.admin.getEmployeeProjects.useQuery(
    { employeeId: employeeFilterId },
    { enabled: Boolean(employeeFilterId) }
  );
  const { data: employeeTasks = [] } = trpc.admin.getEmployeeTasks.useQuery(
    { employeeId: employeeFilterId },
    { enabled: Boolean(employeeFilterId) }
  );
  const assignProjectMutation = trpc.admin.assignProject.useMutation({
    onSuccess: () => {
      utils.admin.getProjectsOverview.invalidate();
    },
  });
  const deleteProjectMutation = trpc.admin.deleteProject.useMutation({
    onSuccess: () => {
      utils.admin.getProjectsOverview.invalidate();
      toast.success("Project removed");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to remove project");
    },
  });
  const deleteTaskMutation = trpc.admin.deleteTask.useMutation({
    onSuccess: () => {
      utils.admin.getTasksByDate.invalidate();
      utils.admin.getProjectsOverview.invalidate();
      utils.admin.getProjectTasks.invalidate();
      toast.success("Task removed");
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to remove task");
    },
  });
  const createTaskMutation = trpc.admin.createTaskForProject.useMutation({
    onSuccess: () => {
      utils.admin.getProjectTasks.invalidate();
      utils.admin.getEmployeeTasks.invalidate();
      utils.admin.getEmployeeProjects.invalidate();
      toast.success("Task created");
      setTaskDialogOpen(false);
      setEditingTask(null);
      setTaskForm({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        completionDate: "",
        isOngoing: false,
        assigneeIds: [],
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create task");
    },
  });
  const updateTaskMutation = trpc.admin.updateTaskForProject.useMutation({
    onSuccess: () => {
      utils.admin.getProjectTasks.invalidate();
      utils.admin.getEmployeeTasks.invalidate();
      utils.admin.getEmployeeProjects.invalidate();
      toast.success("Task updated");
      setTaskDialogOpen(false);
      setEditingTask(null);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update task");
    },
  });

  if (user && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  const handleAssignProject = async () => {
    if (!projectName || selectedEmployees.length === 0) {
      toast.error("Please enter project name and select at least one employee");
      return;
    }
    if (projectStartDate && projectEndDate) {
      const start = new Date(`${projectStartDate}T00:00:00`);
      const end = new Date(`${projectEndDate}T00:00:00`);
      if (end < start) {
        toast.error("Project end date must be after start date");
        return;
      }
    }
    await assignProjectMutation.mutateAsync({
      name: projectName,
      description: projectDescription,
      priority: projectPriority as "low" | "medium" | "high",
      employeeIds: selectedEmployees,
      startDate: projectStartDate ? new Date(`${projectStartDate}T00:00:00`) : undefined,
      endDate: projectEndDate ? new Date(`${projectEndDate}T00:00:00`) : undefined,
    });
    toast.success(`Project assigned to ${selectedEmployees.length} employee(s)`);
    setAssignDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setProjectName("");
    setProjectDescription("");
    setProjectPriority("medium");
    setProjectStartDate("");
    setProjectEndDate("");
    setSelectedEmployees([]);
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toDateInput = (value?: string | Date) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: "",
      description: "",
      priority: "medium",
      status: "todo",
      completionDate: "",
      isOngoing: false,
      assigneeIds: [],
    });
  };

  const handleCreateTask = () => {
    if (!selectedProjectId) {
      toast.error("Please select a project first");
      return;
    }
    setEditingTask(null);
    resetTaskForm();
    setTaskDialogOpen(true);
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "medium",
      status: task.status || "todo",
      completionDate: toDateInput(task.completionDate),
      isOngoing: !task.completionDate,
      assigneeIds: Array.isArray(task.assignees)
        ? task.assignees.map((u: any) => String(u.id)).filter(Boolean)
        : [],
    });
    setTaskDialogOpen(true);
  };

  const handleSaveTask = () => {
    if (!selectedProjectId) {
      toast.error("Please select a project first");
      return;
    }
    if (!taskForm.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    if (taskForm.assigneeIds.length === 0) {
      toast.error("Select at least one assignee");
      return;
    }
    const completionDate = taskForm.isOngoing || !taskForm.completionDate
      ? undefined
      : new Date(`${taskForm.completionDate}T00:00:00`);

    if (editingTask?.id) {
      updateTaskMutation.mutate({
        taskId: editingTask.id,
        title: taskForm.title.trim(),
        description: taskForm.description || undefined,
        priority: taskForm.priority as "low" | "medium" | "high",
        status: taskForm.status as "todo" | "in_progress" | "completed" | "blocked",
        assigneeIds: taskForm.assigneeIds,
        completionDate,
      });
      return;
    }

    createTaskMutation.mutate({
      projectId: selectedProjectId,
      title: taskForm.title.trim(),
      description: taskForm.description || undefined,
      priority: taskForm.priority as "low" | "medium" | "high",
      status: taskForm.status as "todo" | "in_progress" | "completed" | "blocked",
      assigneeIds: taskForm.assigneeIds,
      completionDate,
    });
  };

  const handleViewProjectDetails = (project: any) => {
    setProjectDetails(project);
    setProjectDetailsOpen(true);
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { className: string }> = {
      high: { className: "bg-red-500/10 text-red-500" },
      medium: { className: "bg-yellow-500/10 text-yellow-600" },
      low: { className: "bg-green-500/10 text-green-600" },
    };

    const { className } = config[priority] || config.medium;

    return (
      <Badge variant="outline" className={className}>
        {priority}
      </Badge>
    );
  };

  const isArchivedProject = (status?: string) =>
    status === "completed" || status === "cancelled";
  const activeProjects = useMemo(
    () => projects.filter((project: any) => project.status === "active"),
    [projects]
  );
  const completedProjects = useMemo(
    () => projects.filter((project: any) => project.status === "completed"),
    [projects]
  );
  const archivedProjects = useMemo(
    () => projects.filter((project: any) => isArchivedProject(project.status)),
    [projects]
  );
  const visibleProjects = useMemo(
    () => (showArchived ? projects : projects.filter((project: any) => !isArchivedProject(project.status))),
    [projects, showArchived]
  );

  return (
    <AdminLayout title="Project Assignment">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderKanban className="h-6 w-6" />
              Project Assignment
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Assign and manage employee projects
            </p>
          </div>

          <Button onClick={() => setAssignDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Assign New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <FolderKanban className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">{activeProjects.length}</h3>
            <p className="text-sm text-muted-foreground">Active Projects</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Users className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">
              {employeesLoading ? "--" : employees.length}
            </h3>
            <p className="text-sm text-muted-foreground">Total Employees</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-1">{completedProjects.length}</h3>
            <p className="text-sm text-muted-foreground">Completed Projects</p>
          </Card>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {visibleProjects.length} project(s) shown
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={showArchived}
              onCheckedChange={(value) => setShowArchived(Boolean(value))}
            />
            Show archived projects ({archivedProjects.length})
          </label>
        </div>

        <div className="grid gap-4">
          {projectsLoading ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">Loading projects...</div>
            </Card>
          ) : visibleProjects.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No projects to show</p>
                <p className="text-sm mt-1">Try enabling archived projects</p>
              </div>
            </Card>
          ) : (
            visibleProjects.map((project: any) => (
              <Card key={project.id} className="p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{project.name}</h3>
                        {getPriorityBadge(project.priority)}
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                          {project.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {project.description || "No description"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Assigned To:</p>
                    <div className="flex flex-wrap gap-2">
                      {(project.assignees || []).map((emp: any, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {emp}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {project.startDate || project.endDate ? (
                        <>
                          {project.startDate ? new Date(project.startDate).toLocaleDateString() : "--"} -{" "}
                          {project.endDate ? new Date(project.endDate).toLocaleDateString() : "--"}
                        </>
                      ) : (
                        <>Created on {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "--"}</>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewProjectDetails(project)}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => {
                          if (!project?.id) return;
                          const confirmDelete = window.confirm(
                            "Remove this project and all its tasks?"
                          );
                          if (!confirmDelete) return;
                          deleteProjectMutation.mutate({ id: String(project.id) });
                        }}
                        disabled={deleteProjectMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Project Tasks Manager</h3>
              <p className="text-sm text-muted-foreground">
                Add, update, and assign tasks for any project
              </p>
            </div>
            <Button onClick={handleCreateTask}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Select Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No projects available
                    </SelectItem>
                  ) : (
                    projects.map((project: any) => (
                      <SelectItem key={project.id} value={String(project.id)}>
                        {project.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!selectedProjectId ? (
            <div className="text-center text-muted-foreground py-8">
              Select a project to manage tasks
            </div>
          ) : projectTasksLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading tasks...</div>
          ) : projectTasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No tasks for this project yet
            </div>
          ) : (
            <div className="space-y-3">
              {projectTasks.map((task: any) => (
                <div key={task.id} className="rounded-xl border border-border/60 p-4 bg-muted/10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{task.title}</h4>
                        {getPriorityBadge(task.priority || "medium")}
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                          {task.status || "todo"}
                        </Badge>
                      </div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground">{task.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Assignees:{" "}
                        {Array.isArray(task.assignees) && task.assignees.length > 0
                          ? task.assignees
                              .map((u: any) => u?.name || u?.employeeId || "Employee")
                              .join(", ")
                          : "Unassigned"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Completion:{" "}
                        {task.completionDate
                          ? new Date(task.completionDate).toLocaleDateString()
                          : "Ongoing"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTask(task)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => {
                          if (!task?.id) return;
                          const confirmDelete = window.confirm("Remove this task?");
                          if (!confirmDelete) return;
                          deleteTaskMutation.mutate({ id: String(task.id) });
                        }}
                        disabled={deleteTaskMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold">Employee Wise View</h3>
              <p className="text-sm text-muted-foreground">
                View projects and tasks assigned to a specific employee
              </p>
            </div>
            <div className="min-w-[220px]">
              <Select value={employeeFilterId} onValueChange={setEmployeeFilterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employeesLoading ? (
                    <SelectItem value="none" disabled>
                      Loading employees...
                    </SelectItem>
                  ) : employees.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No employees available
                    </SelectItem>
                  ) : (
                    employees.map((emp: any) => (
                      <SelectItem key={emp.id} value={String(emp.id)}>
                        {emp.name} ({emp.employeeId || "ID"})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!employeeFilterId ? (
            <div className="text-center text-muted-foreground py-8">
              Select an employee to view assigned projects and tasks
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">Projects</h4>
                  <Badge variant="secondary" className="text-xs">{employeeProjects.length}</Badge>
                </div>
                {employeeProjects.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No projects assigned</div>
                ) : (
                  <div className="space-y-2">
                    {employeeProjects.map((project: any) => (
                      <div key={project.id} className="p-3 rounded-lg border bg-muted/20">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{project.name}</div>
                          {getPriorityBadge(project.priority || "medium")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Status: {project.status || "active"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">Tasks</h4>
                  <Badge variant="secondary" className="text-xs">{employeeTasks.length}</Badge>
                </div>
                {employeeTasks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No tasks assigned</div>
                ) : (
                  <div className="space-y-2">
                    {employeeTasks.map((task: any) => (
                      <div key={task.id} className="p-3 rounded-lg border bg-muted/20">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-sm">{task.title}</div>
                          <Badge variant="outline" className="text-xs">
                            {task.status || "todo"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Project: {task.project?.name || "Unknown"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Daily Tasks</h3>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="daily-tasks-date" className="text-sm text-muted-foreground">
                Date
              </Label>
              <Input
                id="daily-tasks-date"
                type="date"
                value={dailyTasksDate}
                onChange={(e) => setDailyTasksDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {dailyTasksLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading tasks...</div>
          ) : dailyTasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No tasks created for this date
            </div>
          ) : (
            <div className="space-y-3">
              {dailyTasks.map((task: any) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-border/60 p-4 bg-muted/10"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{task.title}</h4>
                        {getPriorityBadge(task.priority || "medium")}
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                          {task.status || "todo"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Project: {task.project?.name || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {task.assignees?.length
                          ? `Assignees: ${task.assignees
                              .map((u: any) => u?.name || u?.employeeId || "Employee")
                              .join(", ")}`
                          : "Assignees: Unassigned"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {task.createdAt ? new Date(task.createdAt).toLocaleTimeString() : "--"}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => {
                          if (!task?.id) return;
                          const confirmDelete = window.confirm("Remove this task?");
                          if (!confirmDelete) return;
                          deleteTaskMutation.mutate({ id: String(task.id) });
                        }}
                        disabled={deleteTaskMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign New Project</DialogTitle>
              <DialogDescription>
                Create a project and assign it to employees
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name *</Label>
                <Input
                  id="project-name"
                  placeholder="Website Redesign"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  placeholder="Project description and objectives..."
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select value={projectPriority} onValueChange={setProjectPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={projectStartDate}
                    onChange={(e) => setProjectStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={projectEndDate}
                    onChange={(e) => setProjectEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assign To Employees *</Label>
                <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                  {employeesLoading ? (
                    <div className="text-sm text-muted-foreground">Loading employees...</div>
                  ) : employees.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No employees found</div>
                  ) : (
                    employees.map((employee: any) => (
                      <div key={employee.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`emp-${employee.id}`}
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={() => toggleEmployee(employee.id)}
                        />
                        <label
                          htmlFor={`emp-${employee.id}`}
                          className="flex-1 flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {employee.employeeId || "--"} - {employee.department || "General"}
                            </p>
                          </div>
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedEmployees.length} employee(s) selected
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignProject} disabled={assignProjectMutation.isPending}>
                {assignProjectMutation.isPending ? "Assigning..." : "Assign Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Update Task" : "Add Task"}</DialogTitle>
              <DialogDescription>
                {editingTask ? "Update task details and assignments" : "Create a new task for the selected project"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Task Title *</Label>
                <Input
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="Enter task title"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Add task details"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={taskForm.priority}
                    onValueChange={(value) =>
                      setTaskForm({ ...taskForm, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={taskForm.status}
                    onValueChange={(value) =>
                      setTaskForm({ ...taskForm, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">Todo</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Completion Date</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={taskForm.completionDate}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, completionDate: e.target.value })
                    }
                    disabled={taskForm.isOngoing}
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                    <Checkbox
                      checked={taskForm.isOngoing}
                      onCheckedChange={(value) =>
                        setTaskForm({ ...taskForm, isOngoing: Boolean(value) })
                      }
                    />
                    Ongoing
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assign Employees *</Label>
                <Select
                  onValueChange={(value) => {
                    if (!taskForm.assigneeIds.includes(value)) {
                      setTaskForm({
                        ...taskForm,
                        assigneeIds: [...taskForm.assigneeIds, value],
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employees" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No employees available
                      </SelectItem>
                    ) : (
                      employees.map((emp: any) => (
                        <SelectItem key={emp.id} value={String(emp.id)}>
                          {emp.name} ({emp.employeeId || "ID"})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {taskForm.assigneeIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {taskForm.assigneeIds.map((id) => {
                      const emp = employees.find((e: any) => String(e.id) === String(id));
                      const label = emp?.name || "Employee";
                      return (
                        <button
                          key={id}
                          type="button"
                          className="text-xs px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80"
                          onClick={() =>
                            setTaskForm({
                              ...taskForm,
                              assigneeIds: taskForm.assigneeIds.filter((eid) => eid !== id),
                            })
                          }
                        >
                          {label} x
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveTask}
                disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
              >
                {createTaskMutation.isPending || updateTaskMutation.isPending
                  ? "Saving..."
                  : editingTask
                    ? "Update Task"
                    : "Create Task"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={projectDetailsOpen} onOpenChange={setProjectDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Project Details</DialogTitle>
              <DialogDescription>
                {projectDetails?.name || "Project information and tasks"}
              </DialogDescription>
            </DialogHeader>

            {!projectDetails ? (
              <div className="text-center text-muted-foreground py-8">No project selected</div>
            ) : (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{projectDetails.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {projectDetails.description || "No description"}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        {getPriorityBadge(projectDetails.priority || "medium")}
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                          {projectDetails.status || "active"}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      <div>Timeline</div>
                      <div>
                        {projectDetails.startDate
                          ? new Date(projectDetails.startDate).toLocaleDateString()
                          : "--"}{" "}
                        -{" "}
                        {projectDetails.endDate
                          ? new Date(projectDetails.endDate).toLocaleDateString()
                          : "--"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-muted-foreground">
                    Assigned: {projectDetails.assignees?.join(", ") || "Unassigned"}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm">Tasks</h4>
                    <Badge variant="secondary" className="text-xs">
                      {detailTasks.length}
                    </Badge>
                  </div>
                  {detailTasksLoading ? (
                    <div className="text-center text-muted-foreground py-6">Loading tasks...</div>
                  ) : detailTasks.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6">No tasks found</div>
                  ) : (
                    <div className="space-y-2">
                      {detailTasks.map((task: any) => (
                        <div key={task.id} className="p-3 rounded-lg border bg-muted/20">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">{task.title}</div>
                            <Badge variant="outline" className="text-xs">
                              {task.status || "todo"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Assignees:{" "}
                            {Array.isArray(task.assignees) && task.assignees.length > 0
                              ? task.assignees
                                  .map((u: any) => u?.name || u?.employeeId || "Employee")
                                  .join(", ")
                              : "Unassigned"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Timeline:{" "}
                            {task.completionDate
                              ? new Date(task.completionDate).toLocaleDateString()
                              : "Ongoing"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setProjectDetailsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

