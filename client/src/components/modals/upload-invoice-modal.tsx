import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Schema for invoice form
const invoiceSchema = z.object({
  contractId: z.coerce.number().min(1, { message: "Please select a contract" }),
  amount: z.coerce.number().min(1, { message: "Invoice amount is required" }),
  invoiceDate: z.date({
    required_error: "Invoice date is required",
  }),
  revenueType: z.enum(["recurring", "non-recurring", "service"], { 
    message: "Please select a revenue type" 
  }),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface CommissionPreview {
  baseCommission: string;
  pilotBonus: string;
  multiYearBonus: string;
  upfrontBonus: string;
  totalCommission: string;
}

interface UploadInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadInvoiceModal({ isOpen, onClose }: UploadInvoiceModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commissionPreview, setCommissionPreview] = useState<CommissionPreview>({
    baseCommission: "0.00",
    pilotBonus: "0.00",
    multiYearBonus: "0.00",
    upfrontBonus: "0.00",
    totalCommission: "0.00",
  });
  const [selectedContract, setSelectedContract] = useState<any>(null);

  // Get list of contracts for the dropdown
  const { data: contracts = [], isLoading: isLoadingContracts } = useQuery({
    queryKey: ["/api/contracts"],
  });

  // Form setup
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      amount: 0,
      invoiceDate: new Date(),
      revenueType: "recurring",
      notes: ""
    },
  });

  // Watch form values to update commission preview
  const contractId = form.watch("contractId");
  const amount = form.watch("amount");
  const revenueType = form.watch("revenueType");

  // Update selected contract info when contractId changes
  useEffect(() => {
    if (contractId && contracts) {
      const contract = contracts.find((c: any) => c.id === contractId);
      if (contract) {
        setSelectedContract(contract);
      }
    }
  }, [contractId, contracts]);

  // Simulate commission calculation for preview
  useEffect(() => {
    if (!selectedContract || !amount || revenueType !== "recurring") {
      setCommissionPreview({
        baseCommission: "0.00",
        pilotBonus: "0.00",
        multiYearBonus: "0.00",
        upfrontBonus: "0.00",
        totalCommission: "0.00",
      });
      return;
    }

    // Basic commission calculation for preview
    const baseCommission = amount * 0.1; // 10% commission
    let pilotBonus = 0;
    let multiYearBonus = 0;
    let upfrontBonus = 0;

    // Pilot bonus
    if (selectedContract.isPilot) {
      if (amount === 0) {
        pilotBonus = 500;
      } else if (amount >= 25000 && amount < 50000) {
        pilotBonus = 2500;
      } else if (amount >= 50000) {
        pilotBonus = 5000;
      }
    }

    // Multi-year bonus
    if (selectedContract.contractLength > 1 && selectedContract.acv > 250000) {
      multiYearBonus = 10000;
    }

    // Upfront bonus
    if (selectedContract.paymentTerms === 'upfront') {
      upfrontBonus = 15000;
    }

    const totalCommission = baseCommission + pilotBonus + multiYearBonus + upfrontBonus;

    setCommissionPreview({
      baseCommission: baseCommission.toFixed(2),
      pilotBonus: pilotBonus.toFixed(2),
      multiYearBonus: multiYearBonus.toFixed(2),
      upfrontBonus: upfrontBonus.toFixed(2),
      totalCommission: totalCommission.toFixed(2),
    });
  }, [selectedContract, amount, revenueType]);

  // Form submission
  const mutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      setIsSubmitting(true);
      const response = await apiRequest("POST", "/api/admin/invoices", {
        ...data,
        createdBy: user?.id,
        invoiceDate: format(data.invoiceDate, "yyyy-MM-dd"),
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invoice created",
        description: "The invoice has been successfully uploaded and commission calculated.",
      });
      form.reset({
        amount: 0,
        invoiceDate: new Date(),
        revenueType: "recurring",
        notes: ""
      });
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsSubmitting(false);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "There was an error creating the invoice. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  function onSubmit(data: InvoiceFormValues) {
    mutation.mutate(data);
  }

  function handleCancel() {
    form.reset();
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload New Invoice</DialogTitle>
          <DialogDescription>
            Add a new invoice to the system. This will automatically calculate commissions.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Contract Select */}
            <FormField
              control={form.control}
              name="contractId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Associated Contract</FormLabel>
                  <Select
                    disabled={isLoadingContracts}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contract" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contracts?.map((contract: any) => (
                        <SelectItem key={contract.id} value={contract.id.toString()}>
                          {contract.clientName} - ${Number(contract.contractValue).toLocaleString()} ({contract.aeName})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Invoice Amount */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Invoice Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          min="0" 
                          step="0.01" 
                          className="pl-7"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Invoice Date */}
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Invoice Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Revenue Type */}
            <FormField
              control={form.control}
              name="revenueType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Revenue Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="recurring" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Recurring Revenue
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="non-recurring" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Non-Recurring Revenue
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="service" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Services
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Include any details that may affect commission calculations."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Include any details that may affect commission calculations.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Commission Preview */}
            <div className="border-t border-gray-200 pt-5">
              <div className="p-4 bg-gray-50 rounded-md">
                <h4 className="text-base font-medium text-gray-900">Commission Preview</h4>
                <div className="mt-4 space-y-4 bg-white p-4 border border-gray-200 rounded-md">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Base Commission (10%)</span>
                    <span className="text-sm font-medium text-gray-900">${commissionPreview.baseCommission}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Pilot Bonus</span>
                    <span className="text-sm font-medium text-gray-900">${commissionPreview.pilotBonus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Multi-Year Bonus</span>
                    <span className="text-sm font-medium text-gray-900">${commissionPreview.multiYearBonus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Upfront Payment Bonus</span>
                    <span className="text-sm font-medium text-gray-900">${commissionPreview.upfrontBonus}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-4">
                    <span className="text-sm font-medium text-gray-900">Total Commission</span>
                    <span className="text-sm font-medium text-primary-700">${commissionPreview.totalCommission}</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload Invoice"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}