import React, { useState, ChangeEvent } from 'react';

// Login Form Component
export const LoginForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    password: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        // Redirect or update app state here
        console.log('Login successful:', data.team);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: 'name' | 'password') => (e: ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Login Squadra</h2>
      
      {message.text && (
        <div className={`mb-4 p-4 rounded ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Squadra
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={handleInputChange('name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={handleInputChange('password')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-3 px-4 rounded-md font-medium ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
          } text-white transition-colors`}
        >
          {loading ? 'Login in corso...' : 'Accedi'}
        </button>
      </div>
    </div>
  );
};

// TypeScript interfaces for better type safety
interface ImportResults {
  success: number;
  errors?: string[];
  message?: string;
}

// CSV Import Component
export const CSVImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [results, setResults] = useState<ImportResults | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setMessage({ type: '', text: '' });
    setResults(null);
  };

  const handleSubmit = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Seleziona un file CSV' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/teams/import-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setResults(data);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore di connessione' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Import CSV Squadre</h2>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-semibold text-blue-800 mb-2">Formato CSV Richiesto:</h3>
        <p className="text-sm text-blue-700">
          Il file deve contenere le colonne: nome, password, girone, nome_membro1, cognome_membro1, 
          email_membro1, telefono_membro1, nome_membro2, cognome_membro2, email_membro2, telefono_membro2
        </p>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File CSV
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !file}
          className={`w-full py-3 px-4 rounded-md font-medium ${
            loading || !file
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500'
          } text-white transition-colors`}
        >
          {loading ? 'Import in corso...' : 'Importa CSV'}
        </button>
      </div>

      {results && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-gray-50 rounded-md">
            <h3 className="font-semibold text-gray-700 mb-2">Risultati Import:</h3>
            <p className="text-green-600">✓ {results.success} squadre create con successo</p>
            
            {results.errors && results.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-red-600 mb-2">Errori:</h4>
                <ul className="space-y-1 text-sm text-red-600">
                  {results.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};