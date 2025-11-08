import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { authApi } from '../../../api/endpoints/auth';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await authApi.forgotPassword(data.email);
      setSuccess(true);
      reset();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-md w-full space-y-8 bg-gray-800 rounded-lg p-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white">Reset Password</h2>
          <p className="mt-2 text-gray-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {success && (
          <Alert variant="success">
            Password reset email sent! Check your inbox for further instructions.
          </Alert>
        )}

        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            {...register('email')}
            type="email"
            label="Email Address"
            placeholder="Enter your email"
            error={errors.email?.message}
            autoComplete="email"
            disabled={loading}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
