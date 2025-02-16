import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertRepairRequestSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { CostEstimate } from "./cost-estimate";
import { RepairGuidance } from "./repair-guidance";
import { RepairShops } from "./repair-shops";

export function RepairForm() {
  const [step, setStep] = useState(1);
  const [estimateData, setEstimateData] = useState<any>(null);

  const form = useForm({
    resolver: zodResolver(insertRepairRequestSchema),
    defaultValues: {
      productType: "",
      issueDescription: "",
      imageUrl: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/repair-requests", values);
      const data = await res.json();
      const estimate = await apiRequest(
        "GET",
        `/api/repair-requests/${data.id}/estimate?productType=${values.productType}`
      );
      return await estimate.json();
    },
    onSuccess: (data) => {
      setEstimateData(data);
      setStep(2);
    },
  });

  function onSubmit(values: any) {
    mutation.mutate(values);
  }

  if (step === 2) {
    return (
      <div className="space-y-8">
        <CostEstimate data={estimateData} />
        <RepairGuidance data={estimateData} />
        <RepairShops />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="productType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="laptop">Laptop</SelectItem>
                  <SelectItem value="tablet">Tablet</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="issueDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Describe the Issue</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What's wrong with your device?"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="URL to image of the issue" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Analyzing..." : "Get Repair Estimate"}
        </Button>
      </form>
    </Form>
  );
}
