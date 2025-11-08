import React from 'react';
import { LoginForm } from '../components/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-950 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-dark-900 dark:text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-dark-600 dark:text-dark-400">
            Sign in to your AsforceS Voice account
          </p>
        </div>

        <div className="bg-white dark:bg-dark-900 rounded-lg shadow-xl p-8">
          <LoginForm />
        </div>

        <p className="text-center text-sm text-dark-500 dark:text-dark-500 mt-6">
          By signing in, you agree to our{' '}
          <a
            href="/terms"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href="/privacy"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};
