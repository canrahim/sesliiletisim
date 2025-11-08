import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { loginSchema, LoginFormData } from '../schemas/login.schema';
import { authApi } from '@/api/endpoints/auth';
import { useAuthStore } from '@/store/auth.store';
import { Button, Input, Alert } from '@/components/ui';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');

    try {
      console.log('Login attempt started...');
      const response = await authApi.login({
        identifier: data.identifier,
        password: data.password,
        ...(data.twoFactorCode && { twoFactorCode: data.twoFactorCode }),
      });

      console.log('Login response:', response);
      const { user, accessToken, refreshToken } = response.data;
      console.log('User data:', user);
      console.log('Tokens:', { accessToken: accessToken?.substring(0, 20) + '...', refreshToken: refreshToken?.substring(0, 20) + '...' });
      
      // Set all auth data at once
      setAuth(user, accessToken, refreshToken);
      console.log('Auth state updated');
      
      // Small delay to ensure state is persisted
      setTimeout(() => {
        console.log('Navigating to dashboard...');
        navigate('/dashboard');
      }, 100);
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage =
        err.response?.data?.message || 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <Alert type="error" message={error} />}

      <Input
        {...register('identifier')}
        label="Email or Username"
        type="text"
        placeholder="Enter your email or username"
        error={errors.identifier?.message}
        autoComplete="username"
      />

      <Input
        {...register('password')}
        label="Password"
        type="password"
        placeholder="Enter your password"
        error={errors.password?.message}
        autoComplete="current-password"
      />

      <Input
        {...register('twoFactorCode')}
        label="2FA Code (if enabled)"
        type="text"
        placeholder="000000"
        error={errors.twoFactorCode?.message}
        maxLength={6}
      />

      <div className="flex items-center justify-between">
        <Link
          to="/forgot-password"
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Forgot password?
        </Link>
      </div>

      <Button type="submit" fullWidth isLoading={isLoading}>
        Sign In
      </Button>

      <p className="text-center text-sm text-dark-600 dark:text-dark-400">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
};
