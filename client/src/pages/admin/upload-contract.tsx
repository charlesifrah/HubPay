import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/layout/layout";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";

// Schema for contract form
const contractSchema = z.object({
  clientName: z.string().min(1, { message: "Client name is required" }),
  aeId: z.coerce.number().min(1, { message: "Please select an AE" }),
  contractValue: z.coerce.number().min(1, { message: "Contract value is required" }),
  acv: z.coerce.number().min(1, { message: "ACV is required" }),
  contractType: z.enum(["new", "renewal", "upsell"], { message: "Please select a contract type" }),
  contractLength: z.coerce.number().min(1, { message: "Please select contract length" }),
  paymentTerms: z.enum(["annual", "quarterly", "monthly", "upfront", "full-upfront"], { message: "Please select payment terms" }),
  isPilot: z.boolean().default(false),
  notes: z.string().optional(),
});

type ContractFormValues = z.infer<typeof contractSchema>;

export default function UploadContract() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get list of AEs for the dropdown
  const { data: aes, isLoading: isLoadingAEs } = useQuery({
    queryKey: ["/api/aes"],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/aes');
      return await res.json();
    }
  });

  // Form setup
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      clientName: "",
      contractValue: 0,
      acv: 0,
      contractType: "new",
      contractLength: 1,
      paymentTerms: "annual",
      isPilot: false,
      notes: ""
    },
  });

  // Form submission
  const mutation = useMutation({
    mutationFn: async (data: ContractFormValues) => {
      setIsSubmitting(true);
      console.log("Submitting contract data:", {
        ...data,
        createdBy: user?.id,
      });
      
      const response = await apiRequest("POST", "/api/admin/contracts", {
        ...data,
        createdBy: user?.id,
      });
      
      // If the response is not ok, throw an error with the response details
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create contract");
      }
      
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
        contractType: "new",
        contractLength: 1,
        paymentTerms: "annual",
        isPilot: false,
        notes: ""
      });
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      setIsSubmitting(false);
    },
    onError: (error: Error) => {
      console.error("Contract creation error:", error);
      
      toast({
        title: "Error creating contract",
        description: error.message || "There was an error creating the contract. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  // Form submission handler
  function onSubmit(data: ContractFormValues) {
    mutation.mutate(data);
  }

  return (
    <Layout title="Upload New Contract">
      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Client Name */}
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corporation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* AE Select */}
                <FormField
                  control={form.control}
                  name="aeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to AE</FormLabel>
                      <Select
                        disabled={isLoadingAEs}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an AE" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {aes?.map((ae: { id: number; name: string }) => (
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

                {/* Contract Value */}
                <FormField
                  control={form.control}
                  name="contractValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Contract Value</FormLabel>
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

                {/* Annual Contract Value */}
                <FormField
                  control={form.control}
                  name="acv"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Contract Value (ACV)</FormLabel>
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
              </div>

              {/* Contract Type */}
              <FormField
                control={form.control}
                name="contractType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Contract Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="new" />
                          </FormControl>
                          <FormLabel className="font-normal">New Business</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="renewal" />
                          </FormControl>
                          <FormLabel className="font-normal">Renewal</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="upsell" />
                          </FormControl>
                          <FormLabel className="font-normal">Upsell</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Contract Length */}
                <FormField
                  control={form.control}
                  name="contractLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Length (Years)</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
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
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="annual">Annual</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="upfront">Upfront (Year 1)</SelectItem>
                          <SelectItem value="full-upfront">Full Upfront (All Years)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Is Pilot Checkbox */}
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
                        Mark if this is a pilot contract which may qualify for special commission bonuses.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />



              <div className="flex justify-end space-x-3">
                <Button variant="outline" type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Uploading..." : "Upload Contract"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </Layout>
  );
}
