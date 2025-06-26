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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Settings,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Percent,
  Target,
  TrendingUp,
  Award,
  Calendar,
  Users,
} from "lucide-react";
import { format } from "date-fns";

const commissionConfigSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["active", "inactive", "draft"]),
  baseCommissionRate: z.coerce.string().min(1, "Base commission rate is required"),
  highValueCap: z.coerce.string().optional(),
  highValueRate: z.coerce.string().optional(),
  pilotBonusUnpaid: z.coerce.string().optional(),
  pilotBonusLow: z.coerce.string().optional(),
  pilotBonusHigh: z.coerce.string().optional(),
  pilotBonusLowMin: z.coerce.string().optional(),
  pilotBonusHighMin: z.coerce.string().optional(),
  multiYearBonus: z.coerce.string().optional(),
  multiYearMinAcv: z.coerce.string().optional(),
  upfrontBonus: z.coerce.string().optional(),
  oteCapAmount: z.coerce.string().optional(),
  oteDecelerator: z.coerce.string().optional(),
});

type CommissionConfigFormValues = z.infer<typeof commissionConfigSchema>;

export default function CommissionConfigsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const form = useForm<CommissionConfigFormValues>({
    resolver: zodResolver(commissionConfigSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "draft",
      baseCommissionRate: "0.1",
      highValueCap: "8250000",
      highValueRate: "0.025",
      pilotBonusUnpaid: "500",
      pilotBonusLow: "2500",
      pilotBonusHigh: "5000",
      pilotBonusLowMin: "25000",
      pilotBonusHighMin: "50000",
      multiYearBonus: "10000",
      multiYearMinAcv: "250000",
      upfrontBonus: "15000",
      oteCapAmount: "1000000",
      oteDecelerator: "0.9",
    },
  });

  const { data: configs, isLoading } = useQuery({
    queryKey: ["/api/admin/commission-configs"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CommissionConfigFormValues) => {
      const response = await apiRequest("POST", "/api/admin/commission-configs", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission-configs"] });
      setIsCreateModalOpen(false);
      form.reset();
      toast({
        title: "Commission Configuration Created",
        description: "The commission configuration has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create commission configuration.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CommissionConfigFormValues> }) => {
      const response = await apiRequest("PUT", `/api/admin/commission-configs/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission-configs"] });
      setIsEditModalOpen(false);
      setEditingConfig(null);
      form.reset();
      toast({
        title: "Commission Configuration Updated",
        description: "The commission configuration has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update commission configuration.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/commission-configs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission-configs"] });
      toast({
        title: "Commission Configuration Deleted",
        description: "The commission configuration has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete commission configuration.",
        variant: "destructive",
      });
    },
  });

  const migrateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/migrate-commission-config");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/commission-configs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ae-commission-assignments"] });
      toast({
        title: "Migration Completed",
        description: "Successfully created default commission configuration and assigned it to all AEs.",
      });
    },
    onError: () => {
      toast({
        title: "Migration Failed",
        description: "Failed to migrate commission configuration.",
        variant: "destructive",
      });
    },
  });

  const filteredConfigs = configs?.filter((config: any) =>
    config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    config.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const onSubmit = (data: CommissionConfigFormValues) => {
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (config: any) => {
    setEditingConfig(config);
    form.reset({
      name: config.name,
      description: config.description || "",
      status: config.status,
      baseCommissionRate: config.baseCommissionRate,
      highValueCap: config.highValueCap,
      highValueRate: config.highValueRate,
      pilotBonusUnpaid: config.pilotBonusUnpaid,
      pilotBonusLow: config.pilotBonusLow,
      pilotBonusHigh: config.pilotBonusHigh,
      pilotBonusLowMin: config.pilotBonusLowMin,
      pilotBonusHighMin: config.pilotBonusHighMin,
      multiYearBonus: config.multiYearBonus,
      multiYearMinAcv: config.multiYearMinAcv,
      upfrontBonus: config.upfrontBonus,
      oteCapAmount: config.oteCapAmount,
      oteDecelerator: config.oteDecelerator,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this commission configuration?")) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      inactive: "secondary",
      draft: "outline",
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status}
      </Badge>
    );
  };

  return (
    <Layout title="Commission Configurations">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="h-6 w-6 text-primary-500 mr-2" />
        <h2 className="text-2xl font-bold">Commission Configurations</h2>
      </div>
      <Separator className="my-4" />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Manage Commission Structures</CardTitle>
              <CardDescription className="mt-1.5">
                Create and manage commission configurations that can be assigned to Account Executives
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {(!configs || configs.length === 0) && (
                <Button 
                  variant="outline" 
                  onClick={() => migrateMutation.mutate()}
                  disabled={migrateMutation.isPending}
                >
                  {migrateMutation.isPending ? (
                    <>
                      <Settings className="mr-2 h-4 w-4 animate-spin" />
                      Migrating...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Migrate Current Settings
                    </>
                  )}
                </Button>
              )}
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Configuration
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <Input
              placeholder="Search configurations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Configurations Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Base Rate</TableHead>
                  <TableHead>OTE Cap</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Loading configurations...
                    </TableCell>
                  </TableRow>
                ) : filteredConfigs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No commission configurations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConfigs.map((config: any) => (
                    <TableRow key={config.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{config.name}</div>
                          {config.description && (
                            <div className="text-sm text-muted-foreground">
                              {config.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(config.status)}</TableCell>
                      <TableCell>
                        {(parseFloat(config.baseCommissionRate) * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        ${parseInt(config.oteCapAmount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {format(new Date(config.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(config)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(config.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setEditingConfig(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Edit Commission Configuration" : "Create Commission Configuration"}
            </DialogTitle>
            <DialogDescription>
              Configure commission rates, bonuses, and caps for Account Executives
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Configuration Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Standard Commission Plan" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe this commission configuration..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Base Commission */}
              <div className="space-y-4">
                <h4 className="flex items-center font-medium">
                  <Percent className="mr-2 h-4 w-4" />
                  Base Commission
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="baseCommissionRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Rate (decimal)</FormLabel>
                        <FormControl>
                          <Input placeholder="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="highValueCap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>High Value Cap ($)</FormLabel>
                        <FormControl>
                          <Input placeholder="8250000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="highValueRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate After Cap (decimal)</FormLabel>
                        <FormControl>
                          <Input placeholder="0.025" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Pilot Bonuses */}
              <div className="space-y-4">
                <h4 className="flex items-center font-medium">
                  <Award className="mr-2 h-4 w-4" />
                  Pilot Bonuses
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="pilotBonusUnpaid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unpaid Pilot Bonus ($)</FormLabel>
                        <FormControl>
                          <Input placeholder="500" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pilotBonusLow"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Low Tier Bonus ($)</FormLabel>
                        <FormControl>
                          <Input placeholder="2500" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pilotBonusHigh"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>High Tier Bonus ($)</FormLabel>
                        <FormControl>
                          <Input placeholder="5000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pilotBonusLowMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Low Tier Min ($)</FormLabel>
                        <FormControl>
                          <Input placeholder="25000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pilotBonusHighMin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>High Tier Min ($)</FormLabel>
                        <FormControl>
                          <Input placeholder="50000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Other Bonuses */}
              <div className="space-y-4">
                <h4 className="flex items-center font-medium">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Additional Bonuses
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="multiYearBonus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Multi-Year Bonus ($)</FormLabel>
                        <FormControl>
                          <Input placeholder="10000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="multiYearMinAcv"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Multi-Year Min ACV ($)</FormLabel>
                        <FormControl>
                          <Input placeholder="250000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="upfrontBonus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Upfront Payment Bonus ($)</FormLabel>
                        <FormControl>
                          <Input placeholder="15000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* OTE Settings */}
              <div className="space-y-4">
                <h4 className="flex items-center font-medium">
                  <Target className="mr-2 h-4 w-4" />
                  OTE (On-Target Earnings) Settings
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="oteCapAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OTE Cap Amount ($)</FormLabel>
                        <FormControl>
                          <Input placeholder="1000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="oteDecelerator"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>OTE Decelerator (decimal)</FormLabel>
                        <FormControl>
                          <Input placeholder="0.9" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                    setEditingConfig(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingConfig ? "Update Configuration" : "Create Configuration"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}