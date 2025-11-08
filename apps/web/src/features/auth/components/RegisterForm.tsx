import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { registerSchema, RegisterFormData } from '../schemas/register.schema';
import { authApi } from '@/api/endpoints/auth';
import { Button, Input, Alert } from '@/components/ui';
import { Turnstile, useTurnstile } from '@/components/captcha';

export const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const captcha = useTurnstile();
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || 'disabled';

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Check CAPTCHA if enabled
    if (siteKey !== 'disabled' && !captcha.isVerified) {
      setError('Please complete the CAPTCHA verification');
      setIsLoading(false);
      return;
    }

    try {
      await authApi.register({
        email: data.email,
        username: data.username,
        password: data.password,
        displayName: data.displayName || undefined,
        captchaToken: captcha.token || undefined,
      });

      setSuccess(
        'Registration successful! Please check your email to verify your account.'
      );

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <Input
        {...register('email')}
        label="Email"
        type="email"
        placeholder="your@email.com"
        error={errors.email?.message}
        autoComplete="email"
      />

      <Input
        {...register('username')}
        label="Username"
        type="text"
        placeholder="johndoe"
        error={errors.username?.message}
        autoComplete="username"
      />

      <Input
        {...register('displayName')}
        label="Display Name (optional)"
        type="text"
        placeholder="John Doe"
        error={errors.displayName?.message}
        autoComplete="name"
      />

      <Input
        {...register('password')}
        label="Password"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        autoComplete="new-password"
        helperText="At least 8 characters with uppercase, lowercase, number, and special character"
      />

      {/* Turnstile CAPTCHA */}
      {siteKey !== 'disabled' && (
        <div className="flex justify-center">
          <Turnstile
            siteKey={siteKey}
            onVerify={captcha.handleVerify}
            onError={captcha.handleError}
            onExpire={captcha.handleExpire}
            theme="dark"
          />
        </div>
      )}

      <Button 
        type="submit" 
        fullWidth 
        isLoading={isLoading} 
        disabled={!!success || (siteKey !== 'disabled' && !captcha.isVerified)}
      >
        Create Account
      </Button>

      <p className="text-center text-sm text-dark-600 dark:text-dark-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
};
