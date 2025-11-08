import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { authApi } from '../../../api/endpoints/auth';
import { useAuthStore } from '../../../store/auth.store';

interface TwoFactorData {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export const TwoFactorSetupPage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [twoFactorData, setTwoFactorData] = useState<TwoFactorData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);

  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      const response = await authApi.get2FAStatus();
      if (response.data.enabled && user) {
        setUser({ ...user, twoFactorEnabled: true });
      }
    } catch (err) {
      console.error('Failed to check 2FA status:', err);
    }
  };

  const generateQRCode = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await authApi.generate2FA();
      setTwoFactorData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate 2FA QR code.');
    } finally {
      setLoading(false);
    }
  };

  const enableTwoFactor = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await authApi.enable2FA(verificationCode);
      setSuccess('Two-factor authentication enabled successfully!');
      setShowBackupCodes(true);
      
      if (user) {
        setUser({ ...user, twoFactorEnabled: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const disableTwoFactor = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication?')) {
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await authApi.disable2FA();
      setSuccess('Two-factor authentication disabled successfully!');
      setTwoFactorData(null);
      setShowBackupCodes(false);
      
      if (user) {
        setUser({ ...user, twoFactorEnabled: false });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const regenerateBackupCodes = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await authApi.regenerateBackupCodes();
      setTwoFactorData(prev => prev ? { ...prev, backupCodes: response.data.backupCodes } : null);
      setSuccess('Backup codes regenerated successfully!');
      setShowBackupCodes(true);
      setCopiedBackupCodes(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to regenerate backup codes.');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (twoFactorData?.backupCodes) {
      const codes = twoFactorData.backupCodes.join('\n');
      navigator.clipboard.writeText(codes);
      setCopiedBackupCodes(true);
      setTimeout(() => setCopiedBackupCodes(false), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="max-w-2xl w-full space-y-8 bg-gray-800 rounded-lg p-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-white">Two-Factor Authentication</h2>
          <p className="mt-2 text-gray-400">
            Secure your account with an additional layer of protection
          </p>
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {user?.twoFactorEnabled ? (
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-2">
                Two-Factor Authentication is Enabled
              </h3>
              <p className="text-gray-400 mb-4">
                Your account is protected with two-factor authentication.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={regenerateBackupCodes}
                  variant="secondary"
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  Regenerate Backup Codes
                </Button>
                
                <Button
                  onClick={disableTwoFactor}
                  variant="danger"
                  disabled={loading}
                  className="w-full sm:w-auto ml-0 sm:ml-3"
                >
                  Disable 2FA
                </Button>
              </div>
            </div>

            {showBackupCodes && twoFactorData?.backupCodes && (
              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-yellow-300 mb-2">
                  Backup Codes
                </h3>
                <p className="text-yellow-200 text-sm mb-4">
                  Save these codes in a secure place. Each code can only be used once.
                </p>
                
                <div className="bg-gray-900 rounded p-4 font-mono text-sm text-white">
                  {twoFactorData.backupCodes.map((code, index) => (
                    <div key={index}>{code}</div>
                  ))}
                </div>
                
                <Button
                  onClick={copyBackupCodes}
                  variant="secondary"
                  className="mt-4"
                >
                  {copiedBackupCodes ? 'Copied!' : 'Copy Codes'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {!twoFactorData ? (
              <div className="text-center">
                <p className="text-gray-400 mb-6">
                  Enable two-factor authentication to add an extra layer of security to your account.
                </p>
                <Button
                  onClick={generateQRCode}
                  variant="primary"
                  disabled={loading}
                >
                  {loading ? 'Generating...' : 'Enable 2FA'}
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">
                    Step 1: Scan QR Code
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
                  </p>
                  
                  <div className="flex justify-center mb-4">
                    <img
                      src={twoFactorData.qrCode}
                      alt="2FA QR Code"
                      className="bg-white p-4 rounded"
                    />
                  </div>
                  
                  <details className="text-sm text-gray-400">
                    <summary className="cursor-pointer hover:text-gray-300">
                      Can't scan? Enter manually
                    </summary>
                    <div className="mt-2 p-3 bg-gray-800 rounded font-mono text-xs break-all">
                      {twoFactorData.secret}
                    </div>
                  </details>
                </div>

                <div className="bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">
                    Step 2: Enter Verification Code
                  </h3>
                  <p className="text-gray-400 mb-4">
                    Enter the 6-digit code from your authenticator app:
                  </p>
                  
                  <div className="flex space-x-3">
                    <Input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-32 text-center font-mono text-lg"
                      disabled={loading}
                    />
                    
                    <Button
                      onClick={enableTwoFactor}
                      variant="primary"
                      disabled={loading || verificationCode.length !== 6}
                    >
                      {loading ? 'Verifying...' : 'Verify & Enable'}
                    </Button>
                  </div>
                </div>

                <div className="text-center">
                  <Button
                    onClick={() => setTwoFactorData(null)}
                    variant="ghost"
                    className="text-gray-400 hover:text-gray-300"
                  >
                    Cancel Setup
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="text-center">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            className="text-blue-400 hover:text-blue-300"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
