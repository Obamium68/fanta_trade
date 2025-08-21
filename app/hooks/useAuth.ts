'use client';

import { useState, useEffect } from 'react';
import { Team } from '@prisma/client';

interface UseAuthReturn {
  team: Team | null;
  loading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthReturn {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        
        if (res.ok) {
          const data = await res.json();
          setTeam(data.team);
        } else {
          setError('Non autenticato');
          // Redirect to login
          window.location.href = '/login';
        }
      } catch (err) {
        setError('Errore nella verifica autenticazione');
        console.error('Auth error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuth();
  }, []);

  return { team, loading, error };
}