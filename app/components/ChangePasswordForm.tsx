'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, ChangePasswordInput } from '@/app/lib/validators/password';

export default function ChangePasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [canChangePassword, setCanChangePassword] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema)
  });

  // Check if password can be changed
  useEffect(() => {
    const checkPasswordChangeStatus = async () => {
      try {
        const response = await fetch('/api/teams/change-password/status', {
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (response.ok) {
          setCanChangePassword(result.canChange);
          if (!result.canChange) {
            setMessage({ 
              type: 'info', 
              text: 'La password è già stata cambiata una volta. Non è possibile modificarla nuovamente.' 
            });
          }
        }
      } catch (error) {
        console.error('Error checking password status:', error);
      }
    };

    checkPasswordChangeStatus();
  }, []);

  const onSubmit = async (data: ChangePasswordInput) => {
    if (!canChangePassword) return;

    setIsLoading(true);
    setMessage(null);

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

      setMessage({ type: 'success', text: result.message });
      setCanChangePassword(false);
      reset(); // Clear form
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Errore durante il cambio password' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (canChangePassword === null) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-10 bg-gray-300 rounded mb-4"></div>
          <div className="h-10 bg-gray-300 rounded mb-4"></div>
          <div className="h-10 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
        Cambia Password
      </h2>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : message.type === 'error'
            ? 'bg-red-100 border border-red-400 text-red-700'
            : 'bg-blue-100 border border-blue-400 text-blue-700'
        }`}>
          {message.text}
        </div>
      )}

      {canChangePassword ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-md">
            <p className="text-sm font-medium">⚠️ Attenzione!</p>
            <p className="text-sm">Puoi cambiare la password solo una volta. Assicurati di ricordarla!</p>
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Nuova Password
            </label>
            <input
              {...register('newPassword')}
              type="password"
              id="newPassword"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Inserisci la nuova password"
            />
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Conferma Nuova Password
            </label>
            <input
              {...register('confirmPassword')}
              type="password"
              id="confirmPassword"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Conferma la nuova password"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-md font-medium ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
            } text-white transition duration-200`}
          >
            {isLoading ? 'Cambiando password...' : 'Cambia Password (Solo una volta!)'}
          </button>
        </form>
      ) : (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-600">La password è già stata modificata e non può essere cambiata nuovamente.</p>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p>Requisiti password:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Minimo 8 caratteri</li>
          <li>Almeno una lettera minuscola</li>
          <li>Almeno una lettera maiuscola</li>
          <li>Almeno un numero</li>
        </ul>
      </div>
    </div>
  );
}
