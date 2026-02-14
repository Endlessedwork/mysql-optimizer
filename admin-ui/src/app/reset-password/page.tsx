'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/auth-api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const rawToken = searchParams.get('token');
  const token = rawToken && /^[a-f0-9]{64}$/.test(rawToken) ? rawToken : null;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // No token in URL
  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Invalid Reset Link</h2>
        <p className="text-sm text-gray-600">
          This password reset link is invalid. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="inline-block text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  const validatePassword = (): string[] => {
    const errors: string[] = [];
    if (newPassword.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(newPassword)) {
      errors.push('At least one uppercase letter');
    }
    if (!/[a-z]/.test(newPassword)) {
      errors.push('At least one lowercase letter');
    }
    if (!/[0-9]/.test(newPassword)) {
      errors.push('At least one number');
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      errors.push('At least one special character');
    }
    return errors;
  };

  const passwordErrors = newPassword ? validatePassword() : [];
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const canSubmit = newPassword.length >= 8 && passwordErrors.length === 0 && passwordsMatch;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (passwordErrors.length > 0) {
      setError('Password does not meet requirements');
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.resetPassword(token, newPassword);
      setIsSuccess(true);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Invalid or expired')) {
        setError('This reset link is invalid or has expired. Please request a new one.');
      } else if (msg.includes('Password')) {
        setError(msg);
      } else {
        setError('An error occurred while resetting your password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Password Reset</h2>
        <p className="text-sm text-gray-600">
          Your password has been reset successfully. You can now sign in with your new password.
        </p>
        <Link
          href="/login?reset=success"
          className="inline-block w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 transition-colors text-center"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Create new password</h2>
      <p className="text-sm text-gray-600 mb-6">
        Enter your new password below.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
            placeholder="At least 8 characters"
            disabled={isLoading}
          />
          {/* Password requirements */}
          {newPassword && passwordErrors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {passwordErrors.map((err) => (
                <li key={err} className="text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {err}
                </li>
              ))}
            </ul>
          )}
          {newPassword && passwordErrors.length === 0 && (
            <p className="mt-2 text-xs text-teal-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Password meets all requirements
            </p>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-gray-900"
            placeholder="Re-enter your password"
            disabled={isLoading}
          />
          {confirmPassword && !passwordsMatch && (
            <p className="mt-2 text-xs text-red-600">Passwords do not match</p>
          )}
          {passwordsMatch && (
            <p className="mt-2 text-xs text-teal-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Passwords match
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !canSubmit}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Resetting...
            </>
          ) : (
            'Reset password'
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">MySQL Optimizer</h1>
          <p className="mt-2 text-sm text-gray-600">Reset your password</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <Suspense
            fallback={
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>

          {/* Back to Login */}
          <div className="mt-6 text-center text-sm">
            <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
              Back to sign in
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500">
          MySQL Production Optimizer &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
