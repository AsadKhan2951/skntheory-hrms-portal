import { useMemo, useState } from "react";
import LayoutWrapper from "@/components/LayoutWrapper";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Projects() {
  const { user } = useAuth();
  const currentUserId = user?.id ? String(user.id) : null;
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [projectData, setProjectData] = useState<{
    name: string;
    description: string;
    priority: "low" | "medium" | "high";
    employeeIds: string[];
  }>({
    name: "",
    description: "",
    priority: "medium",
    employeeIds: [],
  });
  const [taskData, setTaskData] = useState<{
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    assigneeIds: string[];
    completionDate: string;
    isOngoing: boolean;
  }>({
    title: "",
    description: "",
    priority: "medium",
    assigneeIds: [],
    completionDate: format(new Date(), "yyyy-MM-dd"),
    isOngoing: false,
  });

  const { data: projects, isLoading: projectsLoading } = trpc.projects.getMyProjects.useQuery();
  const { data: employees = [] } = trpc.dashboard.getUsers.useQuery();
  const { data: tasks, isLoading: tasksLoading } = trpc.projects.getTasks.useQuery(
    { projectId: selectedProject! },
    { enabled: !!selectedProject }
  );

  const utils = trpc.useUtils();

  const createProjectMutation = trpc.projects.createCustomProject.useMutation({
    onSuccess: () => {
      toast.success("Project created successfully!");
      setShowProjectDialog(false);
      setProjectData({ name: "", description: "", priority: "medium", employeeIds: [] });
      utils.projects.getMyProjects.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create project");
    },
  });

  const createTaskMutation = trpc.projects.createTask.useMutation({
    onSuccess: () => {
      toast.success("Task created successfully!");
      setShowTaskDialog(false);
      setTaskData({
        title: "",
        description: "",
        priority: "medium",
        assigneeIds: currentUserId ? [currentUserId] : [],
        completionDate: format(new Date(), "yyyy-MM-dd"),
        isOngoing: false,
      });
      utils.projects.getTasks.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create task");
    },
  });

  const updateTaskMutation = trpc.projects.updateTask.useMutation({
    onSuccess: () => {
      toast.success("Task updated successfully!");
      utils.projects.getTasks.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update task");
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    createProjectMutation.mutate(projectData);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    createTaskMutation.mutate({
      projectId: selectedProject,
      ...taskData,
      completionDate: taskData.isOngoing || !taskData.completionDate
        ? undefined
        : new Date(`${taskData.completionDate}T00:00:00`),
    });
  };

  const handleStatusChange = (taskId: string, status: "todo" | "in_progress" | "completed" | "blocked") => {
    updateTaskMutation.mutate({
      taskId,
      status,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      { variant: "default" | "secondary" | "destructive"; icon: any; label: string }
    > = {
      todo: { variant: "secondary", icon: Clock, label: "To Do" },
      in_progress: { variant: "default", icon: AlertCircle, label: "In Progress" },
      completed: { variant: "default", icon: CheckCircle2, label: "Completed" },
      blocked: { variant: "destructive", icon: AlertCircle, label: "Blocked" },
    };

    const config = variants[status] || variants.todo;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-blue-500/10 text-blue-500",
      medium: "bg-yellow-500/10 text-yellow-500",
      high: "bg-red-500/10 text-red-500",
    };

    return (
      <Badge variant="outline" className={colors[priority] || colors.medium}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const getProjectStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "border-l-primary",
      on_hold: "border-l-yellow-500",
      completed: "border-l-green-500",
      cancelled: "border-l-red-500",
    };
    return colors[status] || colors.active;
  };

  const availableEmployees = useMemo(() => {
    if (!employees) return [];
    const currentId = user?.id ? String(user.id) : null;
    return employees.filter((emp: any) => String(emp.id) !== currentId);
  }, [employees, user]);

  const assignableEmployees = useMemo(() => {
    if (!employees) return [];
    return employees.filter((emp: any) => emp && emp.id && emp.role !== "admin");
  }, [employees]);

  const isTaskFormValid =
    Boolean(taskData.title.trim()) &&
    (taskData.isOngoing || Boolean(taskData.completionDate));

  const handleOpenTaskDialog = () => {
    setTaskData({
      title: "",
      description: "",
      priority: "medium",
      assigneeIds: currentUserId ? [currentUserId] : [],
      completionDate: format(new Date(), "yyyy-MM-dd"),
      isOngoing: false,
    });
    setShowTaskDialog(true);
  };

  return (
    <LayoutWrapper>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your projects and track tasks
            </p>
          </div>
          <Button onClick={() => setShowProjectDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>

        {projectsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Projects List */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-lg font-semibold">My Projects</h2>
              {projects.map((project: any) => (
                <Card
                  key={project.id}
                  className={`p-4 cursor-pointer transition-all border-l-4 ${getProjectStatusColor(
                    project.status
                  )} ${selectedProject === project.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedProject(project.id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-sm line-clamp-1">{project.name}</h3>
                      {getPriorityBadge(project.priority)}
                    </div>
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <Badge variant="outline" className="capitalize">
                        {project.status.replace("_", " ")}
                      </Badge>
                      {project.source && (
                        <Badge 
                          variant="outline" 
                          className={project.source === 'team_lead' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}
                        >
                          {project.source === 'team_lead' ? '👔 Team Lead' : '👤 Custom'}
                        </Badge>
                      )}
                      {project.role && (
                        <span className="text-xs">• {project.role}</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Tasks View */}
            <div className="lg:col-span-2">
              {selectedProject ? (
                <Card>
                  <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Tasks</h2>
                    <Button size="sm" onClick={handleOpenTaskDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>

                  <div className="p-4">
                    {tasksLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : tasks && tasks.length > 0 ? (
                      <div className="space-y-3">
                        {tasks.map((task: any) => (
                          <Card key={task.id} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm">{task.title}</h4>
                                  {task.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {task.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Completion: {task.completionDate ? format(new Date(task.completionDate), "MMM dd, yyyy") : "Ongoing"}
                                  </p>
                                </div>
                                {getPriorityBadge(task.priority)}
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(task.status)}
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(task.createdAt), "MMM dd")}
                                  </span>
                                </div>

                                <Select
                                  value={task.status}
                                  onValueChange={(value) =>
                                    handleStatusChange(task.id, value as "todo" | "in_progress" | "completed" | "blocked")
                                  }
                                >
                                  <SelectTrigger className="w-[140px] h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="todo">To Do</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="blocked">Blocked</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FolderKanban className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No tasks yet</p>
                        <p className="text-xs mt-1">Click "Add Task" to create one</p>
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="p-12">
                  <div className="text-center text-muted-foreground">
                    <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Select a project to view tasks</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No projects assigned</p>
              <p className="text-xs mt-1">Contact your manager to get assigned to projects</p>
            </div>
          </Card>
        )}

        {/* Create Project Dialog */}
        <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreateProject}>
              <DialogHeader>
                <DialogTitle>Create Custom Project</DialogTitle>
                <DialogDescription>
                  Create your own project to track personal tasks
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name *</Label>
                  <Input
                    id="project-name"
                    placeholder="Enter project name"
                    value={projectData.name}
                    onChange={(e) =>
                      setProjectData({ ...projectData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    placeholder="Enter project description"
                    value={projectData.description}
                    onChange={(e) =>
                      setProjectData({ ...projectData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-priority">Priority</Label>
                  <Select
                    value={projectData.priority}
                    onValueChange={(value) =>
                      setProjectData({ ...projectData, priority: value as "low" | "medium" | "high" })
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
                  <Label>Assign Employees</Label>
                  <Select
                    onValueChange={(value) => {
                      if (!projectData.employeeIds.includes(value)) {
                        setProjectData({
                          ...projectData,
                          employeeIds: [...projectData.employeeIds, value],
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employees" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEmployees.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No employees available
                        </SelectItem>
                      ) : (
                        availableEmployees.map((emp: any) => (
                          <SelectItem key={emp.id} value={String(emp.id)}>
                            {emp.name} ({emp.employeeId || "ID"})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {projectData.employeeIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {projectData.employeeIds.map((id) => {
                        const emp = availableEmployees.find((e: any) => String(e.id) === String(id));
                        return (
                          <button
                            key={id}
                            type="button"
                            className="text-xs px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80"
                            onClick={() =>
                              setProjectData({
                                ...projectData,
                                employeeIds: projectData.employeeIds.filter((eid) => eid !== id),
                              })
                            }
                          >
                            {emp?.name || "Employee"} ×
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    You will be assigned automatically.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={createProjectMutation.isPending}>
                  {createProjectMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Project"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Task Dialog */}
        <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreateTask}>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>
                  Create a new task for the selected project
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter task title"
                    value={taskData.title}
                    onChange={(e) =>
                      setTaskData({ ...taskData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter task description"
                    value={taskData.description}
                    onChange={(e) =>
                      setTaskData({ ...taskData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={taskData.priority}
                    onValueChange={(value) =>
                      setTaskData({ ...taskData, priority: value as "low" | "medium" | "high" })
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
                  <Label>Completion Date</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={taskData.completionDate}
                      onChange={(e) =>
                        setTaskData({ ...taskData, completionDate: e.target.value })
                      }
                      disabled={taskData.isOngoing}
                    />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                      <Checkbox
                        checked={taskData.isOngoing}
                        onCheckedChange={(value) =>
                          setTaskData({ ...taskData, isOngoing: Boolean(value) })
                        }
                      />
                      Ongoing
                    </label>
                  </div>
                  {!taskData.isOngoing && !taskData.completionDate && (
                    <p className="text-xs text-red-500">Please select a completion date or mark as ongoing.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Assign Employees</Label>
                  <Select
                    onValueChange={(value) => {
                      if (!taskData.assigneeIds.includes(value)) {
                        setTaskData({
                          ...taskData,
                          assigneeIds: [...taskData.assigneeIds, value],
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employees" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableEmployees.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No employees available
                        </SelectItem>
                      ) : (
                        assignableEmployees.map((emp: any) => (
                          <SelectItem key={emp.id} value={String(emp.id)}>
                            {emp.name} ({emp.employeeId || "ID"})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {taskData.assigneeIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {taskData.assigneeIds.map((id) => {
                        const emp = assignableEmployees.find((e: any) => String(e.id) === String(id));
                        const label = emp?.name || (String(id) === String(currentUserId) ? "You" : "Employee");
                        return (
                          <button
                            key={id}
                            type="button"
                            className="text-xs px-2 py-1 rounded-full bg-secondary hover:bg-secondary/80"
                            onClick={() =>
                              setTaskData({
                                ...taskData,
                                assigneeIds: taskData.assigneeIds.filter((eid) => eid !== id),
                              })
                            }
                          >
                            {label} Ã—
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    If no one is selected, you will be assigned automatically.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTaskDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTaskMutation.isPending || !isTaskFormValid}>
                  {createTaskMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Task
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
