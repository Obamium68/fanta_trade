"use client"
import { useState } from 'react';
import { ChangePasswordInput } from '@/app/lib/validators/password';

export function useChangePassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const changePassword = async (data: ChangePasswordInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/teams/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante il cambio password');
      }

      setSuccess(result.message);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Errore durante il cambio password';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setError(null);
    setSuccess(null);
  };

  return {
    changePassword,
    isLoading,
    error,
    success,
    resetState
  };
}