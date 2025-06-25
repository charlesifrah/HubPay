import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Plus,
  Calendar,
  Settings,
  UserCheck,
  Clock,
} from "lucide-react";
import { format } from "date-fns";

const assignmentSchema = z.object({
  aeId: z.coerce.number().min(1, "Please select an AE"),
  commissionConfigId: z.coerce.number().min(1, "Please select a commission configuration"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  endDate: z.string().optional(),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

export default function AEAssignmentsPage() {
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAE, setSelectedAE] = useState<string>("");
  const { toast } = useToast();

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      effectiveDate: new Date().toISOString().split('T')[0],
    },
  });

  const { data: aes = [] } = useQuery({
    queryKey: ["/api/aes"],
  });

  const { data: configs = [] } = useQuery({
    queryKey: ["/api/admin/commission-configs"],
  });

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["/api/admin/ae-commission-assignments", selectedAE],
    queryFn: async () => {
      if (!selectedAE) return [];
      const response = await fetch(`/api/admin/ae-commission-assignments/${selectedAE}`);
      return await response.json();
    },
    enabled: !!selectedAE,
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormValues) => {
      const response = await apiRequest("POST", "/api/admin/ae-commission-assignments", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ae-commission-assignments"] });
      setIsAssignModalOpen(false);
      form.reset();
      toast({
        title: "Commission Configuration Assigned",
        description: "The commission configuration has been assigned successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign commission configuration.",
        variant: "destructive",
      });
    },
  });

  const filteredAEs = aes.filter((ae: any) =>
    ae.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ae.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = (data: AssignmentFormValues) => {
    createAssignmentMutation.mutate(data);
  };

  const activeConfigs = configs.filter((config: any) => config.status === 'active');

  const getConfigName = (configId: number) => {
    const config = configs.find((c: any) => c.id === configId);
    return config?.name || 'Unknown Configuration';
  };

  const getAEName = (aeId: number) => {
    const ae = aes.find((a: any) => a.id === aeId);
    return ae?.name || 'Unknown AE';
  };

  const isAssignmentActive = (assignment: any) => {
    const today = new Date().toISOString().split('T')[0];
    const isAfterEffective = assignment.effectiveDate <= today;
    const isBeforeEnd = !assignment.endDate || assignment.endDate >= today;
    return isAfterEffective && isBeforeEnd;
  };

  return (
    <Layout title="AE Commission Assignments">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-6 w-6 text-primary-500 mr-2" />
        <h2 className="text-2xl font-bold">AE Commission Assignments</h2>
      </div>
      <Separator className="my-4" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AE Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="mr-2 h-5 w-5" />
              Account Executives
            </CardTitle>
            <CardDescription>
              Select an AE to view their commission assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                placeholder="Search AEs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredAEs.map((ae: any) => (
                  <div
                    key={ae.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAE === ae.id.toString() 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedAE(ae.id.toString())}
                  >
                    <div className="font-medium">{ae.name}</div>
                    <div className="text-sm text-muted-foreground">{ae.email}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Commission Assignments
                  {selectedAE && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      for {getAEName(parseInt(selectedAE))}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="mt-1.5">
                  View and manage commission configuration assignments
                </CardDescription>
              </div>
              {selectedAE && (
                <Button onClick={() => setIsAssignModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Assign Configuration
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedAE ? (
              <div className="text-center py-8 text-muted-foreground">
                Select an Account Executive to view their commission assignments
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Configuration</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          Loading assignments...
                        </TableCell>
                      </TableRow>
                    ) : assignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No commission assignments found for this AE
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignments.map((assignment: any) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <div className="font-medium">
                              {getConfigName(assignment.commissionConfigId)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(assignment.effectiveDate), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {assignment.endDate 
                              ? format(new Date(assignment.endDate), "MMM d, yyyy")
                              : "Ongoing"
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={isAssignmentActive(assignment) ? "default" : "secondary"}>
                              {isAssignmentActive(assignment) ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(assignment.createdAt), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      {selectedAE && assignments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Assignment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-primary">
                  {assignments.filter((a: any) => isAssignmentActive(a)).length}
                </div>
                <div className="text-sm text-muted-foreground">Active Assignments</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-secondary-foreground">
                  {assignments.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Assignments</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <div className="text-2xl font-bold text-muted-foreground">
                  {assignments.filter((a: any) => !isAssignmentActive(a)).length}
                </div>
                <div className="text-sm text-muted-foreground">Historical Assignments</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Commission Configuration</DialogTitle>
            <DialogDescription>
              Assign a commission configuration to {selectedAE ? getAEName(parseInt(selectedAE)) : 'an AE'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="aeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Executive</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={selectedAE}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an AE" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {aes.map((ae: any) => (
                          <SelectItem key={ae.id} value={ae.id.toString()}>
                            {ae.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commissionConfigId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Configuration</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a configuration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeConfigs.map((config: any) => (
                          <SelectItem key={config.id} value={config.id.toString()}>
                            <div>
                              <div className="font-medium">{config.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {(parseFloat(config.baseCommissionRate) * 100).toFixed(1)}% base rate
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createAssignmentMutation.isPending}>
                  Assign Configuration
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}