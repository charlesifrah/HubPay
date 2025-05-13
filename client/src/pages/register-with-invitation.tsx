import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation, useRoute, Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// Validation schema
const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  confirmPassword: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"], 
});

type FormSchema = z.infer<typeof formSchema>;

export default function RegisterWithInvitationPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [validating, setValidating] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invitationEmail, setInvitationEmail] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [, params] = useRoute("/register-with-invitation");

  // Set up form
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Extract token from URL query parameters
    const urlSearchParams = new URLSearchParams(window.location.search);
    const tokenParam = urlSearchParams.get('token');
    
    if (!tokenParam) {
      setValidationError("Missing invitation token");
      setValidating(false);
      return;
    }

    setToken(tokenParam);
    
    const validateInvitation = async () => {
      try {
        const response = await apiRequest(
          'GET', 
          `/api/auth/validate-invitation?token=${tokenParam}`
        );
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to validate invitation");
        }
        
        const data = await response.json();
        setInvitationEmail(data.email);
        setValidating(false);
      } catch (error) {
        if (error instanceof Error) {
          setValidationError(error.message);
        } else {
          setValidationError("An unknown error occurred");
        }
        setValidating(false);
      }
    };
    
    validateInvitation();
  }, []);

  const onSubmit = async (values: FormSchema) => {
    try {
      if (!token || !invitationEmail) {
        throw new Error("Invalid invitation data");
      }
      
      const response = await apiRequest('POST', '/api/auth/register-with-invitation', {
        token,
        email: invitationEmail,
        name: values.name,
        password: values.password,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }
      
      toast({
        title: "Registration successful",
        description: "Your account has been created. You can now log in.",
      });
      
      setRegistered(true);
      
      // Redirect to login page after a delay
      setTimeout(() => {
        setLocation('/auth');
      }, 3000);
      
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  if (validating) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Account Registration</CardTitle>
            <CardDescription>Validating your invitation...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Invalid Invitation</CardTitle>
            <CardDescription>There was a problem with your invitation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/auth">Go to Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (registered) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Registration Complete</CardTitle>
            <CardDescription>Your account has been successfully created.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">
                You will be redirected to the login page in a moment...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create Your Account</CardTitle>
          <CardDescription>
            Complete your account registration for {invitationEmail}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Create a secure password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters long
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Confirm your password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full mt-6" 
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Complete Registration"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}