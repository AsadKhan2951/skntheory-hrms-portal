import AdminLayout from "@/components/AdminLayout";
import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  AlertTriangle,
  FileText,
  Activity,
} from "lucide-react";
import { Redirect } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

export default function AdvancedReports() {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState("attendance-summary");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "MMMM yyyy"));

  if (user && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  const reportCategories = [
    {
      title: "Payroll & Compliance Reports",
      reports: [
        { id: "attendance-summary", name: "Detailed Attendance Summary (Pre-Payroll)", icon: FileText },
        { id: "ot-analysis", name: "Overtime (OT) Analysis Report", icon: Clock },
        { id: "audit-trail", name: "Attendance Audit Trail Report", icon: Activity },
        { id: "exceptions", name: "Exceptions Report (Exceptions Log)", icon: AlertTriangle },
      ],
    },
    {
      title: "Operational & Productivity Reports",
      reports: [
        { id: "realtime-dashboard", name: "Real-Time Attendance Dashboard", icon: Activity },
        { id: "absenteeism-trends", name: "Absenteeism and Late Arrival Trend Report", icon: TrendingDown },
        { id: "productivity", name: "Productivity/Working Hours Report", icon: TrendingUp },
      ],
    },
    {
      title: "Strategic & Summary Reports",
      reports: [
        { id: "muster-roll", name: "Monthly Attendance Muster Roll", icon: Users },
        { id: "leave-summary", name: "Leave and Time-Off Report", icon: Calendar },
        { id: "key-metrics", name: "Key Metrics Dashboard", icon: BarChart3 },
      ],
    },
  ];

  const months = [
    "January 2026", "February 2026", "March 2026", "April 2026",
    "May 2026", "June 2026", "July 2026", "August 2026",
    "September 2026", "October 2026", "November 2026", "December 2026",
  ];

  const reportRange = useMemo(() => {
    const [monthName, yearStr] = selectedMonth.split(" ");
    const year = Number(yearStr);
    const monthIndex = months.findIndex(m => m.startsWith(monthName));
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }, [selectedMonth]);

  const { data: employeeData = [] } = trpc.employees.list.useQuery();
  const employees = employeeData.filter((emp: any) => emp?.role === "user");
  const { data: leaveRequests = [] } = trpc.admin.getLeaveRequests.useQuery();
  const { data: timeEntries = [] } = trpc.admin.getTimeEntriesByRange.useQuery(reportRange);
  const { data: employeeStatuses = [] } = trpc.admin.getEmployeeStatusSnapshot.useQuery();

  const daysInMonth = useMemo(() => {
    return reportRange.endDate.getDate();
  }, [reportRange]);

  const employeeMap = useMemo(() => {
    return new Map(employees.map((emp: any) => [String(emp.id), emp]));
  }, [employees]);

  const attendanceSummaryData = useMemo(() => {
    const monthStart = reportRange.startDate;
    const monthEnd = reportRange.endDate;

    return employees.map((emp: any) => {
      const empEntries = timeEntries.filter((e: any) => String(e.userId) === String(emp.id) && e.status !== "active");
      const presentDays = new Set(empEntries.map((e: any) => new Date(e.timeIn).toDateString())).size;
      const empLeaves = leaveRequests.filter((l: any) => l.user?.id === emp.id && l.status === "approved");
      const leaveDays = empLeaves.reduce((sum: number, l: any) => {
        if (!l.startDate || !l.endDate) return sum;
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const overlapStart = start > monthStart ? start : monthStart;
        const overlapEnd = end < monthEnd ? end : monthEnd;
        if (overlapStart > overlapEnd) return sum;
        return sum + (Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      }, 0);
      const totalWorkingHours = empEntries.reduce((sum: number, e: any) => {
        const hours = e.totalHours
          ? Number(e.totalHours)
          : e.timeOut
            ? (new Date(e.timeOut).getTime() - new Date(e.timeIn).getTime()) / (1000 * 60 * 60)
            : 0;
        return sum + hours;
      }, 0);
      const absent = Math.max(daysInMonth - presentDays - leaveDays, 0);
      return {
        employeeId: emp.employeeId || "-",
        employee: emp.name || emp.employeeId || "Employee",
        totalDays: daysInMonth,
        present: presentDays,
        absent,
        leaves: leaveDays,
        payableDays: presentDays + leaveDays,
        totalWorkingHours: Number(totalWorkingHours.toFixed(2)),
      };
    });
  }, [employees, timeEntries, leaveRequests, daysInMonth, reportRange]);

  const attendanceTrailData = useMemo(() => {
    return timeEntries
      .map((entry: any) => {
        const employee = employeeMap.get(String(entry.userId));
        const timeIn = entry.timeIn ? new Date(entry.timeIn) : null;
        const timeOut = entry.timeOut ? new Date(entry.timeOut) : null;
        const totalHours = entry.totalHours
          ? Number(entry.totalHours)
          : timeIn && timeOut
            ? (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
            : 0;

        return {
          id: entry.id,
          employee: employee?.name || employee?.employeeId || "Employee",
          employeeId: employee?.employeeId || "-",
          date: timeIn ? format(timeIn, "dd MMM yyyy") : "-",
          clockIn: timeIn ? format(timeIn, "hh:mm a") : "-",
          clockOut: timeOut ? format(timeOut, "hh:mm a") : "-",
          totalHours: Number(totalHours.toFixed(2)),
          status: entry.status || "-",
          sortTime: timeIn ? timeIn.getTime() : 0,
        };
      })
      .sort((a, b) => b.sortTime - a.sortTime);
  }, [employeeMap, timeEntries]);

  const attendanceSummaryTotals = useMemo(() => {
    return attendanceSummaryData.reduce(
      (totals, row) => {
        totals.totalEmployees += 1;
        totals.presentDays += row.present;
        totals.absentDays += row.absent;
        totals.leaveDays += row.leaves;
        totals.payableDays += row.payableDays;
        totals.workingHours += row.totalWorkingHours;
        return totals;
      },
      {
        totalEmployees: 0,
        presentDays: 0,
        absentDays: 0,
        leaveDays: 0,
        payableDays: 0,
        workingHours: 0,
      },
    );
  }, [attendanceSummaryData]);

  const otAnalysisData = useMemo(() => {
    return employees.map((emp: any) => {
      const empEntries = timeEntries.filter((e: any) => String(e.userId) === String(emp.id) && e.status !== "active");
      const overtime = empEntries.reduce((sum: number, e: any) => {
        const hours = e.totalHours
          ? Number(e.totalHours)
          : e.timeOut
            ? (new Date(e.timeOut).getTime() - new Date(e.timeIn).getTime()) / (1000 * 60 * 60)
            : 0;
        return sum + Math.max(0, hours - 8);
      }, 0);
      return {
        employee: emp.name || emp.employeeId || "Employee",
        regularOT: Number(overtime.toFixed(1)),
        weekendOT: 0,
        holidayOT: 0,
        totalOT: Number(overtime.toFixed(1)),
      };
    });
  }, [employees, timeEntries]);

  const keyMetrics = useMemo(() => {
    const totalEmployees = employees.length || 1;
    const onLeave = employeeStatuses.filter((e: any) => e.status === "on_leave").length;
    return [
      { label: "Absence Rate", value: `${((onLeave / totalEmployees) * 100).toFixed(1)}%`, trend: "down", color: "green" },
      { label: "Tardiness Rate", value: "0%", trend: "up", color: "red" },
      { label: "Overtime Percentage", value: "0%", trend: "down", color: "green" },
      { label: "Capacity Utilization", value: `${((employeeStatuses.filter((e: any) => e.status === "timed_in" || e.status === "on_break").length / totalEmployees) * 100).toFixed(0)}%`, trend: "up", color: "green" },
    ];
  }, [employees, employeeStatuses]);

  const downloadFile = (content: string, fileName: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toCsvValue = (value: string | number) => {
    const text = String(value ?? "");
    return `"${text.replace(/"/g, '""')}"`;
  };

  const getSelectedReportName = () =>
    reportCategories
      .flatMap((c) => c.reports)
      .find((r) => r.id === selectedReport)?.name || "Report";

  const getExcelExportContent = () => {
    switch (selectedReport) {
      case "attendance-summary": {
        const summaryHeaders = [
          "Employee",
          "Employee ID",
          "Total Days",
          "Present",
          "Absent",
          "Leaves",
          "Working Hours",
          "Payable Days",
        ];
        const summaryRows = attendanceSummaryData.map((row) => [
          row.employee,
          row.employeeId,
          row.totalDays,
          row.present,
          row.absent,
          row.leaves,
          row.totalWorkingHours,
          row.payableDays,
        ]);

        const detailHeaders = [
          "Employee",
          "Employee ID",
          "Date",
          "Clock In",
          "Clock Out",
          "Total Hours",
          "Status",
        ];
        const detailRows = attendanceTrailData.map((row) => [
          row.employee,
          row.employeeId,
          row.date,
          row.clockIn,
          row.clockOut,
          row.totalHours,
          row.status,
        ]);

        const csvRows = [
          [getSelectedReportName()],
          [`Month: ${selectedMonth}`],
          [`Employees: ${attendanceSummaryTotals.totalEmployees}`],
          [`Present Days: ${attendanceSummaryTotals.presentDays}`],
          [`Leave Days: ${attendanceSummaryTotals.leaveDays}`],
          [`Working Hours: ${attendanceSummaryTotals.workingHours.toFixed(2)}`],
          [],
          ["Attendance Summary"],
          summaryHeaders,
          ...summaryRows,
          [],
          ["Clock In / Clock Out Details"],
          detailHeaders,
          ...detailRows,
        ];

        return csvRows
          .map((row) => row.map((cell) => toCsvValue(cell ?? "")).join(","))
          .join("\n");
      }

      case "ot-analysis": {
        const rows = [
          ["Employee", "Regular OT (hrs)", "Weekend OT (hrs)", "Holiday OT (hrs)", "Total OT (hrs)"],
          ...otAnalysisData.map((row) => [
            row.employee,
            row.regularOT,
            row.weekendOT,
            row.holidayOT,
            row.totalOT,
          ]),
        ];

        return [
          [getSelectedReportName()],
          [`Month: ${selectedMonth}`],
          [],
          ...rows,
        ]
          .map((row) => row.map((cell) => toCsvValue(cell ?? "")).join(","))
          .join("\n");
      }

      case "key-metrics": {
        return [
          ["Metric", "Value", "Trend"],
          ...keyMetrics.map((metric) => [metric.label, metric.value, metric.trend]),
        ]
          .map((row) => row.map((cell) => toCsvValue(cell ?? "")).join(","))
          .join("\n");
      }

      case "realtime-dashboard": {
        return [
          ["Employee", "Status"],
          ...employeeStatuses.map((employee: any) => [
            employee.name,
            employee.status,
          ]),
        ]
          .map((row) => row.map((cell) => toCsvValue(cell ?? "")).join(","))
          .join("\n");
      }

      default:
        return "";
    }
  };

  const getPdfExportHtml = () => {
    const title = getSelectedReportName();
    const generatedAt = format(new Date(), "dd MMM yyyy hh:mm a");

    const renderTable = (headers: string[], rows: Array<Array<string | number>>) => `
      <table>
        <thead>
          <tr>
            ${headers.map((header) => `<th>${header}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0
            ? rows
                .map(
                  (row) => `
                    <tr>
                      ${row.map((cell) => `<td>${cell}</td>`).join("")}
                    </tr>`,
                )
                .join("")
            : `<tr><td colspan="${headers.length}" style="text-align:center;">No data available</td></tr>`}
        </tbody>
      </table>
    `;

    let body = "";

    switch (selectedReport) {
      case "attendance-summary":
        body = `
          <div class="stats">
            <div class="stat-card">
              <div class="stat-label">Employees</div>
              <div class="stat-value">${attendanceSummaryTotals.totalEmployees}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Present Days</div>
              <div class="stat-value">${attendanceSummaryTotals.presentDays}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Leave Days</div>
              <div class="stat-value">${attendanceSummaryTotals.leaveDays}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Working Hours</div>
              <div class="stat-value">${attendanceSummaryTotals.workingHours.toFixed(2)}</div>
            </div>
          </div>
          <h2>Attendance Summary</h2>
          ${renderTable(
            ["Employee", "Employee ID", "Total Days", "Present", "Absent", "Leaves", "Working Hours", "Payable Days"],
            attendanceSummaryData.map((row) => [
              row.employee,
              row.employeeId,
              row.totalDays,
              row.present,
              row.absent,
              row.leaves,
              row.totalWorkingHours,
              row.payableDays,
            ]),
          )}
          <h2>Clock In / Clock Out Details</h2>
          ${renderTable(
            ["Employee", "Employee ID", "Date", "Clock In", "Clock Out", "Total Hours", "Status"],
            attendanceTrailData.map((row) => [
              row.employee,
              row.employeeId,
              row.date,
              row.clockIn,
              row.clockOut,
              row.totalHours,
              row.status,
            ]),
          )}
        `;
        break;

      case "ot-analysis":
        body = `
          <h2>Overtime Summary</h2>
          ${renderTable(
            ["Employee", "Regular OT (hrs)", "Weekend OT (hrs)", "Holiday OT (hrs)", "Total OT (hrs)"],
            otAnalysisData.map((row) => [
              row.employee,
              row.regularOT,
              row.weekendOT,
              row.holidayOT,
              row.totalOT,
            ]),
          )}
        `;
        break;

      case "key-metrics":
        body = `
          <h2>Key Metrics</h2>
          ${renderTable(
            ["Metric", "Value", "Trend"],
            keyMetrics.map((metric) => [metric.label, metric.value, metric.trend]),
          )}
        `;
        break;

      case "realtime-dashboard":
        body = `
          <h2>Live Status Snapshot</h2>
          ${renderTable(
            ["Employee", "Status"],
            employeeStatuses.map((employee: any) => [employee.name, employee.status]),
          )}
        `;
        break;

      default:
        body = "<p>No export template available for this report.</p>";
        break;
    }

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${title} - ${selectedMonth}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 24px;
              color: #111827;
            }
            h1, h2 {
              margin: 0 0 12px;
            }
            .meta {
              margin-bottom: 20px;
              color: #4b5563;
              font-size: 14px;
            }
            .stats {
              display: grid;
              grid-template-columns: repeat(4, minmax(0, 1fr));
              gap: 12px;
              margin: 20px 0 28px;
            }
            .stat-card {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 12px;
              background: #f9fafb;
            }
            .stat-label {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 4px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            .stat-value {
              font-size: 22px;
              font-weight: 700;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 24px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 10px;
              font-size: 12px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #111827;
              color: #ffffff;
            }
            tr:nth-child(even) td {
              background: #f9fafb;
            }
            @media print {
              body {
                margin: 12px;
              }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">
            <div><strong>Month:</strong> ${selectedMonth}</div>
            <div><strong>Generated:</strong> ${generatedAt}</div>
          </div>
          ${body}
        </body>
      </html>
    `;
  };

  const handleExport = (exportFormat: "pdf" | "excel") => {
    if (selectedReport === "attendance-summary" && attendanceSummaryData.length === 0) {
      toast.error("No attendance data available to export for the selected month.");
      return;
    }

    const safeReportName = getSelectedReportName()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const safeMonth = selectedMonth.toLowerCase().replace(/\s+/g, "-");

    if (exportFormat === "excel") {
      const csvContent = getExcelExportContent();
      if (!csvContent) {
        toast.error("This report is not ready for Excel export yet.");
        return;
      }

      downloadFile(
        `\ufeff${csvContent}`,
        `${safeReportName}-${safeMonth}.csv`,
        "text/csv;charset=utf-8;",
      );
      toast.success("Excel report downloaded.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      toast.error("Popup blocked. Allow popups to export PDF.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(getPdfExportHtml());
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 300);

    toast.success("Print-ready PDF view opened.");
  };

  const renderReportContent = () => {
    switch (selectedReport) {
      case "attendance-summary":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="mt-2 text-2xl font-semibold">{attendanceSummaryTotals.totalEmployees}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Present Days</p>
                <p className="mt-2 text-2xl font-semibold text-green-600">{attendanceSummaryTotals.presentDays}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Leave Days</p>
                <p className="mt-2 text-2xl font-semibold text-blue-600">{attendanceSummaryTotals.leaveDays}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Working Hours</p>
                <p className="mt-2 text-2xl font-semibold">{attendanceSummaryTotals.workingHours.toFixed(2)}</p>
              </Card>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Employee</th>
                    <th className="text-left p-3 font-semibold">Employee ID</th>
                    <th className="text-right p-3 font-semibold">Total Days</th>
                    <th className="text-right p-3 font-semibold">Present</th>
                    <th className="text-right p-3 font-semibold">Absent</th>
                    <th className="text-right p-3 font-semibold">Leaves</th>
                    <th className="text-right p-3 font-semibold">Working Hours</th>
                    <th className="text-right p-3 font-semibold">Payable Days</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceSummaryData.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{row.employee}</td>
                      <td className="p-3 text-muted-foreground">{row.employeeId}</td>
                      <td className="p-3 text-right">{row.totalDays}</td>
                      <td className="p-3 text-right text-green-600">{row.present}</td>
                      <td className="p-3 text-right text-red-600">{row.absent}</td>
                      <td className="p-3 text-right text-blue-600">{row.leaves}</td>
                      <td className="p-3 text-right">{row.totalWorkingHours}</td>
                      <td className="p-3 text-right font-semibold">{row.payableDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4">
              <h3 className="font-semibold mb-3">Clock In / Clock Out Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Employee</th>
                      <th className="text-left p-3 font-semibold">Employee ID</th>
                      <th className="text-left p-3 font-semibold">Date</th>
                      <th className="text-left p-3 font-semibold">Clock In</th>
                      <th className="text-left p-3 font-semibold">Clock Out</th>
                      <th className="text-right p-3 font-semibold">Total Hours</th>
                      <th className="text-left p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceTrailData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted-foreground">
                          No attendance entries found for {selectedMonth}.
                        </td>
                      </tr>
                    ) : (
                      attendanceTrailData.map((row) => (
                        <tr key={row.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{row.employee}</td>
                          <td className="p-3 text-muted-foreground">{row.employeeId}</td>
                          <td className="p-3">{row.date}</td>
                          <td className="p-3">{row.clockIn}</td>
                          <td className="p-3">{row.clockOut}</td>
                          <td className="p-3 text-right">{row.totalHours}</td>
                          <td className="p-3">
                            <Badge variant="outline">{row.status}</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "ot-analysis":
        return (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Employee</th>
                    <th className="text-right p-3 font-semibold">Regular OT (hrs)</th>
                    <th className="text-right p-3 font-semibold">Weekend OT (hrs)</th>
                    <th className="text-right p-3 font-semibold">Holiday OT (hrs)</th>
                    <th className="text-right p-3 font-semibold">Total OT (hrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {otAnalysisData.map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{row.employee}</td>
                      <td className="p-3 text-right">{row.regularOT}</td>
                      <td className="p-3 text-right">{row.weekendOT}</td>
                      <td className="p-3 text-right">{row.holidayOT}</td>
                      <td className="p-3 text-right font-semibold">{row.totalOT}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case "key-metrics":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {keyMetrics.map((metric, idx) => (
              <Card key={idx} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{metric.label}</h3>
                  {metric.trend === "up" ? (
                    <TrendingUp className={`h-5 w-5 ${metric.color === "green" ? "text-green-500" : "text-red-500"}`} />
                  ) : (
                    <TrendingDown className={`h-5 w-5 ${metric.color === "green" ? "text-green-500" : "text-red-500"}`} />
                  )}
                </div>
                <p className="text-3xl font-bold">{metric.value}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {metric.trend === "up" ? "Increased" : "Decreased"} from last month
                </p>
              </Card>
            ))}
          </div>
        );

      case "realtime-dashboard":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <Users className="h-6 w-6 text-green-500" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-1">
                  {employeeStatuses.filter((e: any) => e.status === "timed_in" || e.status === "on_break").length}
                </h3>
                <p className="text-sm text-muted-foreground">Currently Working</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <Users className="h-6 w-6 text-red-500" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-1">
                  {employeeStatuses.filter((e: any) => e.status === "on_leave").length}
                </h3>
                <p className="text-sm text-muted-foreground">Absent Today</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-1">
                  {employeeStatuses.filter((e: any) => e.status === "on_break").length}
                </h3>
                <p className="text-sm text-muted-foreground">On Break</p>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Live Status</h3>
              <div className="space-y-3">
                {employeeStatuses.map((emp: any) => (
                  <div key={emp.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 ${emp.status === "timed_in" ? "bg-green-500" : emp.status === "on_break" ? "bg-blue-500" : "bg-gray-500"} rounded-full`}></div>
                      <span className="font-medium">{emp.name}</span>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600">
                      {emp.status === "timed_in" ? "Working" : emp.status === "on_break" ? "On Break" : emp.status === "on_leave" ? "On Leave" : "Offline"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        );

      default:
        return (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Report data will be displayed here</p>
              <p className="text-sm mt-1">Select a report type to view detailed analytics</p>
            </div>
          </Card>
        );
    }
  };

  return (
    <AdminLayout title="Advanced Reports">
      <div className="space-y-6">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleExport("excel")}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={() => handleExport("pdf")}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>

        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportCategories.map((category) => (
                    <div key={category.title}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {category.title}
                      </div>
                      {category.reports.map((report) => (
                        <SelectItem key={report.id} value={report.id}>
                          {report.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-1">
              {reportCategories
                .flatMap((c) => c.reports)
                .find((r) => r.id === selectedReport)?.name}
            </h2>
            <p className="text-sm text-muted-foreground">Report for {selectedMonth}</p>
          </div>

          {renderReportContent()}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reportCategories.map((category, idx) => (
            <Card key={idx} className="p-6">
              <h3 className="font-semibold mb-4">{category.title}</h3>
              <div className="space-y-2">
                {category.reports.map((report) => (
                  <Button
                    key={report.id}
                    variant={selectedReport === report.id ? "default" : "ghost"}
                    className="w-full justify-start text-sm h-auto py-2"
                    onClick={() => setSelectedReport(report.id)}
                  >
                    <report.icon className="h-4 w-4 mr-2 shrink-0" />
                    <span className="text-left line-clamp-2">{report.name}</span>
                  </Button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
