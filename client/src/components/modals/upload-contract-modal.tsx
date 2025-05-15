import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

const contractFormSchema = z.object({
  clientName: z.string().min(1, { message: "Client name is required" }),
  aeId: z.coerce.number().min(1, { message: "Please select an account executive" }),
  contractValue: z.coerce.number().min(1, { message: "Contract value is required" }),
  acv: z.coerce.number().min(1, { message: "Annual contract value is required" }),
  contractType: z.enum(["new", "renewal", "upsell"], { 
    message: "Please select a contract type" 
  }),
  contractLength: z.coerce.number().min(1, { message: "Contract length is required" }),
  paymentTerms: z.enum(["annual", "quarterly", "monthly", "upfront", "full-upfront"], { 
    message: "Please select payment terms" 
  }),
  isPilot: z.boolean().default(false),
  notes: z.string().optional(),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

interface UploadContractModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadContractModal({ isOpen, onClose }: UploadContractModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get a list of AEs for the dropdown
  const { data: aes = [], isLoading: isLoadingAEs } = useQuery({
    queryKey: ["/api/aes"],
  });

  // Form setup
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      contractValue: 0,
      acv: 0,
      contractLength: 1,
      isPilot: false,
      notes: "",
    },
  });

  // Auto-fill ACV based on contract value and length
  const contractValue = form.watch("contractValue");
  const contractLength = form.watch("contractLength");

  const calculateACV = () => {
    if (contractValue && contractLength) {
      form.setValue("acv", contractValue / contractLength);
    }
  };

  // Form submission
  const mutation = useMutation({
    mutationFn: async (data: ContractFormValues) => {
      setIsSubmitting(true);
      const response = await apiRequest("POST", "/api/admin/contracts", {
        ...data,
        createdBy: user?.id,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Contract created",
        description: "The contract has been successfully uploaded.",
      });
      form.reset({
        clientName: "",
        contractValue: 0,
        acv: 0,
        contractLength: 1,
        isPilot: false,
        notes: "",
      });
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      
      setIsSubmitting(false);
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "There was an error creating the contract. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  function onSubmit(data: ContractFormValues) {
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
          <DialogTitle>Upload New Contract</DialogTitle>
          <DialogDescription>
            Add a new contract to the system. Contract data is used to calculate commissions.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Client Name */}
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Client name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account Executive */}
            <FormField
              control={form.control}
              name="aeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Executive</FormLabel>
                  <Select
                    disabled={isLoadingAEs}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an account executive" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {aes?.map((ae: any) => (
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

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Contract Value */}
              <FormField
                control={form.control}
                name="contractValue"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Contract Value</FormLabel>
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
                          onChange={(e) => {
                            field.onChange(e);
                            setTimeout(calculateACV, 10);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Total value of the contract (across all years)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Annual Contract Value */}
              <FormField
                control={form.control}
                name="acv"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Annual Contract Value</FormLabel>
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
                    <FormDescription>
                      Value per year (auto-calculated)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {/* Contract Type */}
              <FormField
                control={form.control}
                name="contractType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="renewal">Renewal</SelectItem>
                        <SelectItem value="upsell">Upsell</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contract Length */}
              <FormField
                control={form.control}
                name="contractLength"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Length</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        setTimeout(calculateACV, 10);
                      }} 
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select length" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 Year</SelectItem>
                        <SelectItem value="2">2 Years</SelectItem>
                        <SelectItem value="3">3 Years</SelectItem>
                        <SelectItem value="4">4 Years</SelectItem>
                        <SelectItem value="5">5 Years</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Terms */}
              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="upfront">Upfront</SelectItem>
                        <SelectItem value="full-upfront">Full Upfront</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Is Pilot */}
            <FormField
              control={form.control}
              name="isPilot"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Pilot Contract</FormLabel>
                    <FormDescription>
                      Check if this is a pilot contract. Pilot contracts have special commission rules.
                    </FormDescription>
                  </div>
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
                      placeholder="Add any additional notes about this contract"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  "Upload Contract"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}