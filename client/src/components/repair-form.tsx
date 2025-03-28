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
import { insertRepairRequestSchema, type InsertRepairRequest } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { CostEstimate } from "./cost-estimate";
import { RepairGuidance } from "./repair-guidance";
import { Check, ChevronsUpDown, ImagePlus, X, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Common product types that can be repaired
const productTypes = [
  { value: "Phone", label: "Phone" },
  { value: "Laptop", label: "Laptop" },
  { value: "Car", label: "Car" },
  { value: "Chair", label: "Chair" },
  { value: "Website", label: "Website" },
  { value: "Pipe", label: "Pipe" },
];

interface RepairFormProps {
  onSubmit?: (data: any) => void;
  onResetForm?: () => void;
}

export function RepairForm({ onSubmit, onResetForm }: RepairFormProps) {
  const [step, setStep] = useState(1);
  const [estimateData, setEstimateData] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [useML, setUseML] = useState<boolean>(true);
  const [repairRequestId, setRepairRequestId] = useState<number | null>(null);
  const [openProductTypeDropdown, setOpenProductTypeDropdown] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsertRepairRequest>({
    resolver: zodResolver(insertRepairRequestSchema),
    defaultValues: {
      productType: "",
      issueDescription: "",
      imageUrl: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: InsertRepairRequest) => {
      // First, submit the repair request
      const res = await apiRequest(
        "POST", 
        "/api/repair-requests", 
        values
      );
      if (!res.ok) throw new Error('Failed to submit repair request');

      const data = await res.json();

      // Store the repair request ID
      setRepairRequestId(data.id);

      // Then, get the estimate
      const estimateUrl = `/api/repair-requests/${data.id}/estimate?productType=${encodeURIComponent(values.productType)}&useML=${useML}`;
      const estimateRes = await apiRequest(
        "GET",
        estimateUrl
      );
      if (!estimateRes.ok) throw new Error('Failed to get repair estimate');

      return await estimateRes.json();
    },
    onSuccess: (data) => {
      setEstimateData(data);
      setStep(2);
      toast({
        title: "Success!",
        description: "Your repair request has been submitted.",
      });
      // Call the onSubmit prop if provided
      if (onSubmit) {
        onSubmit(data);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit repair request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      setImagePreview(base64String);
      form.setValue('imageUrl', base64String, { shouldValidate: true });
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    form.setValue('imageUrl', '', { shouldValidate: true });
  };

  const handleSubmit = (values: InsertRepairRequest) => {
    mutation.mutate(values);
  };

  if (step === 2) {
    const productType = form.getValues('productType');
    const issueDescription = form.getValues('issueDescription');

    return (
      <div className="space-y-8">
        <CostEstimate data={estimateData} />
        <RepairGuidance data={{ 
          ...estimateData, 
          productType,
          issueDescription,
          repairRequestId: repairRequestId || undefined
        }} />
        <Button 
          onClick={() => {
            setStep(1);
            form.reset();
            setImagePreview(null);
            setRepairRequestId(null);
            // Call the onResetForm callback if it exists
            if (onResetForm) {
              onResetForm();
            }
          }}
          variant="outline"
          className="w-full"
        >
          Submit Another Request
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="productType"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Product Type</FormLabel>
              <Popover open={openProductTypeDropdown} onOpenChange={setOpenProductTypeDropdown}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openProductTypeDropdown}
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? productTypes.find(
                            (type) => type.value === field.value
                          )?.label || field.value
                        : "Select product type..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search product type..."
                      onValueChange={(value) => {
                        if (value && !productTypes.some(type => type.value.toLowerCase() === value.toLowerCase())) {
                          form.setValue("productType", value, { shouldValidate: true });
                        }
                      }}
                    />
                    <CommandEmpty>
                      <div className="py-2 px-4 text-sm">
                        <p>No match found. Press Enter to use this custom type.</p>
                        <Button 
                          variant="ghost" 
                          className="mt-2 w-full justify-start text-left" 
                          onClick={() => {
                            const inputValue = document.querySelector("[cmdk-input]") as HTMLInputElement;
                            if (inputValue?.value) {
                              form.setValue("productType", inputValue.value, { shouldValidate: true });
                              setOpenProductTypeDropdown(false);
                            }
                          }}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Use custom type
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup heading="Suggested Product Types">
                      {productTypes.map((type) => (
                        <CommandItem
                          key={type.value}
                          value={type.value}
                          onSelect={(value) => {
                            form.setValue("productType", value, { shouldValidate: true });
                            setOpenProductTypeDropdown(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value === type.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {type.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
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
                  className="min-h-[100px]"
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
              <FormLabel>Upload Image (Optional)</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="relative inline-block">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="h-[120px] rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 shadow-sm"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex items-center gap-2">
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageUpload(e.target.files[0]);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <ImagePlus className="h-4 w-4 mr-2" />
                      {imagePreview ? "Change Image" : "Upload Image"}
                    </Button>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between mb-4 p-3 border rounded-md bg-muted/30">
          <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Brain className={`h-5 w-5 ${useML ? 'text-primary' : 'text-muted-foreground'}`} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Machine learning provides more accurate estimates based on thousands of repair data points</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="text-sm font-medium">Use AI-powered cost estimates</span>
          </div>
          <Switch
            checked={useML}
            onCheckedChange={setUseML}
            aria-label="Toggle ML-based estimation"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Analyzing..." : "Get Repair Estimate"}
        </Button>
      </form>
    </Form>
  );
}