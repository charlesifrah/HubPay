import React, { useState, useEffect } from 'react';
import { useLocation, useRoute, Redirect } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';

const registerSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string().min(6),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function RegisterWithInvitation() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/register?token=:token');
  const token = params?.token || '';
  
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);

  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Validate the invitation token
  useEffect(() => {
    if (!token) {
      setValidatingToken(false);
      return;
    }

    const validateToken = async () => {
      try {
        const res = await apiRequest('GET', `/api/auth/validate-invitation?token=${token}`);
        const data = await res.json();
        
        if (data.valid) {
          setTokenValid(true);
          setInvitationEmail(data.email);
        } else {
          setTokenValid(false);
          toast({
            title: 'Invalid invitation',
            description: data.message || 'This invitation is invalid or has expired.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        setTokenValid(false);
        toast({
          title: 'Error validating invitation',
          description: error instanceof Error ? error.message : 'Failed to validate invitation.',
          variant: 'destructive',
        });
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token, toast]);

  // Mutation for register with invitation
  const registerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registerSchema>) => {
      const res = await apiRequest('POST', '/api/auth/register-with-invitation', {
        token,
        name: data.name,
        password: data.password,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Registration successful',
        description: 'Your account has been created. You can now log in.',
      });
      setRegistrationComplete(true);
      setTimeout(() => {
        setLocation('/auth');
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: 'Registration failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(data);
  };

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  // Show loading while validating token
  if (validatingToken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Validating Invitation</CardTitle>
            <CardDescription>Please wait while we validate your invitation</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error if token is invalid
  if (!tokenValid) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>This invitation link is invalid or has expired</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Invalid Invitation</AlertTitle>
              <AlertDescription>
                The invitation link you're trying to use is invalid or has expired. Please contact your administrator for a new invitation.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => setLocation('/auth')}>Go to Login</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show success if registration is complete
  if (registrationComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Registration Complete</CardTitle>
            <CardDescription>Your account has been created successfully</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Your account has been created successfully. You will be redirected to the login page in a moment.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Registration</CardTitle>
          <CardDescription>
            Set up your account to start using the Commission Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Alert>
              <AlertTitle>Email Confirmation</AlertTitle>
              <AlertDescription>
                You are registering with the email: <strong>{invitationEmail}</strong>
              </AlertDescription>
            </Alert>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormDescription>
                      This will be displayed in the application.
                    </FormDescription>
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormDescription>
                      Must be at least 6 characters.
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Complete Registration
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}