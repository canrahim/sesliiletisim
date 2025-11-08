import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { authApi } from '../../../api/endpoints/auth';
import { resetPasswordSchema, type ResetPasswordFormData } from '../schemas/password.schema';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [token]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await authApi.resetPassword(token, data.password);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="max-w-md w-full space-y-8 bg-gray-800 rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-600">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-white">Password Reset Successful!</h2>
            <p className="mt-2 text-gray-400">
              Your password has been reset. You will be redirected to the login page shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-md w-full space-y-8 bg-gray-800 rounded-lg p-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white">Set New Password</h2>
          <p className="mt-2 text-gray-400">
            Enter your new password below.
          </p>
        </div>

        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            {...register('password')}
            type="password"
            label="New Password"
            placeholder="Enter new password"
            error={errors.password?.message}
            autoComplete="new-password"
            disabled={loading || !token}
          />

          <Input
            {...register('confirmPassword')}
            type="password"
            label="Confirm New Password"
            placeholder="Confirm new password"
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
            disabled={loading || !token}
          />

          <div className="text-xs text-gray-400">
            Password must:
            <ul className="list-disc list-inside mt-1">
              <li>Be at least 8 characters long</li>
              <li>Contain at least one uppercase letter</li>
              <li>Contain at least one lowercase letter</li>
              <li>Contain at least one number</li>
              <li>Contain at least one special character</li>
            </ul>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading || !token}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      </div>
    </div>
  );
};
