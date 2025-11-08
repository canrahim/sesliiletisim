import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { authApi } from '../../../api/endpoints/auth';
import { useAuthStore } from '../../../store/auth.store';

export const EmailVerifyPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail();
    }
  }, [token]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const verifyEmail = async () => {
    if (!token) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await authApi.verifyEmail(token);
      setSuccess(true);
      
      // Update user state if logged in
      if (user) {
        setUser({ ...user, emailVerified: true });
      }
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!user?.email || resendCooldown > 0) return;

    setResendLoading(true);
    setError('');
    
    try {
      await authApi.resendVerificationEmail();
      setResendCooldown(60); // 60 seconds cooldown
      setError(''); // Clear any previous errors
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Verifying your email...</p>
        </div>
      </div>
    );
  }

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
            <h2 className="mt-6 text-3xl font-extrabold text-white">Email Verified!</h2>
            <p className="mt-2 text-gray-400">
              Your email has been successfully verified. You will be redirected to the dashboard shortly.
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
          <h2 className="text-3xl font-extrabold text-white">Verify Your Email</h2>
          <p className="mt-2 text-gray-400">
            {token 
              ? 'We\'re verifying your email address...' 
              : 'Please check your email for a verification link'}
          </p>
        </div>

        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {!token && user && !user.emailVerified && (
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                We sent a verification email to:
              </p>
              <p className="text-white font-medium">{user.email}</p>
            </div>

            <div className="text-center">
              <p className="text-gray-400 text-sm mb-4">
                Didn't receive the email? Check your spam folder or request a new one.
              </p>
              
              <Button
                onClick={handleResendEmail}
                disabled={resendLoading || resendCooldown > 0}
                variant="primary"
                className="w-full"
              >
                {resendLoading ? (
                  'Sending...'
                ) : resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  'Resend Verification Email'
                )}
              </Button>
            </div>

            <div className="text-center">
              <Button
                onClick={() => navigate('/login')}
                variant="ghost"
                className="text-blue-400 hover:text-blue-300"
              >
                Back to Login
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
