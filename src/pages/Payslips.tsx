import { Card } from "@/components/ui/card";
import LayoutWrapper from "@/components/LayoutWrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, DollarSign, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

export default function Payslips() {
  const { data: payslips = [], isLoading } = trpc.dashboard.getPayslips.useQuery();
  const latestPayslip = useMemo(() => payslips[0], [payslips]);

  const handleDownload = (payslipId: number) => {
    // Placeholder for download functionality
    console.log(`Downloading payslip ${payslipId}`);
  };

  return (
    <LayoutWrapper>
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Payslips</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View and download your salary payslips
        </p>
      </div>

      {/* Latest Payslip Summary */}
      {latestPayslip ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Basic Salary</p>
                <p className="text-xl font-bold">PKR {Number(latestPayslip.basicSalary || 0).toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Allowances</p>
                <p className="text-xl font-bold">PKR {Number(latestPayslip.allowances || 0).toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Deductions</p>
                <p className="text-xl font-bold">PKR {Number(latestPayslip.deductions || 0).toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-primary text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs opacity-90">Net Salary</p>
                <p className="text-xl font-bold">PKR {Number(latestPayslip.netSalary || 0).toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-6 text-center text-muted-foreground">
          {isLoading ? "Loading payslips..." : "No payslip data available yet"}
        </Card>
      )}

      {/* Payslip History */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Payslip History</h2>
        </div>

        <div className="p-4">
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-6">Loading payslips...</div>
            ) : payslips.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">No payslips found</div>
            ) : (
              payslips.map((payslip: any) => (
                <Card key={payslip.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {payslip.month && payslip.year
                            ? format(new Date(payslip.year, payslip.month - 1, 1), "MMMM yyyy")
                            : "Payslip"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {payslip.paidAt
                            ? `Paid on ${format(new Date(payslip.paidAt), "MMMM dd, yyyy")}`
                            : payslip.createdAt
                              ? `Created on ${format(new Date(payslip.createdAt), "MMMM dd, yyyy")}`
                              : "Payment date unavailable"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Net Salary</p>
                        <p className="text-xl font-bold">
                          PKR {Number(payslip.netSalary || 0).toLocaleString()}
                        </p>
                      </div>

                      <Badge variant="default" className="capitalize">
                        {payslip.paidAt ? "paid" : "pending"}
                      </Badge>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(Number(payslip.id))}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Basic Salary</p>
                      <p className="font-semibold">PKR {Number(payslip.basicSalary || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Allowances</p>
                      <p className="font-semibold text-green-600">
                        + PKR {Number(payslip.allowances || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Deductions</p>
                      <p className="font-semibold text-red-600">
                        - PKR {Number(payslip.deductions || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
    </LayoutWrapper>
  );
}
