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
import { RepairShops } from "./repair-shops";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function RepairForm() {
  const [step, setStep] = useState(1);
  const [estimateData, setEstimateData] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
      try {
        const res = await apiRequest("POST", "/api/repair-requests", values);
        if (!res.ok) {
          throw new Error('Failed to submit repair request');
        }
        const data = await res.json();

        const estimateRes = await apiRequest(
          "GET",
          `/api/repair-requests/${data.id}/estimate?productType=${values.productType}`
        );
        if (!estimateRes.ok) {
          throw new Error('Failed to get repair estimate');
        }
        return await estimateRes.json();
      } catch (error) {
        console.error('Mutation error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setEstimateData(data);
      setStep(2);
      toast({
        title: "Success!",
        description: "Your repair request has been submitted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to submit repair request. Please try again.",
        variant: "destructive",
      });
      console.error('Form submission error:', error);
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

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const base64String = e.target?.result as string;
        setImagePreview(base64String);
        form.setValue('imageUrl', base64String, { shouldValidate: true });
      } catch (error) {
        console.error('Image processing error:', error);
        toast({
          title: "Error",
          description: "Failed to process image",
          variant: "destructive",
        });
      }
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read image file",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    form.setValue('imageUrl', '', { shouldValidate: true });
  };

  const onSubmit = async (values: InsertRepairRequest) => {
    try {
      mutation.mutate(values);
    } catch (error) {
      console.error('Form submission error:', error);
      toast({
        title: "Error",
        description: "Failed to submit form. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (step === 2) {
    return (
      <div className="space-y-8">
        <CostEstimate data={estimateData} />
        <RepairGuidance data={{ ...estimateData, productType: form.getValues('productType') }} />
        <RepairShops />
        <Button 
          onClick={() => {
            setStep(1);
            form.reset();
            setImagePreview(null);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="productType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Type</FormLabel>
              <FormControl>
                <Input placeholder="Enter product type (e.g., Phone, Laptop)" {...field} />
              </FormControl>
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
              <FormLabel>Upload Image (Optional)</FormLabel>
              <FormControl>
                {imagePreview ? (
                  <div className="relative w-full rounded-lg overflow-hidden">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="max-w-full max-h-[400px] h-auto mx-auto rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                      ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
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
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop an image here, or click to select
                    </p>
                  </div>
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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