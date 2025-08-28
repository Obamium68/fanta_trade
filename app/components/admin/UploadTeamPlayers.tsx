import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

interface ImportResult {
  message: string;
  success: number;
  totalProcessed: number;
  errors: string[];
  warnings: string[];
  summary: {
    inserted: number;
    skipped: number;
    failed: number;
    total: number;
  };
}

const TeamPlayerCSVUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('Seleziona un file CSV valido');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Seleziona prima un file CSV');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/teams/import-teamplayers', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore durante l\'upload');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Import Relazioni Team-Giocatori
        </h2>
        <p className="text-gray-600">
          Carica un file CSV per importare le relazioni tra team e giocatori.
          Il file deve contenere le colonne: <code className="bg-gray-100 px-1 rounded">idSquadra</code> e <code className="bg-gray-100 px-1 rounded">idGiocatore</code>
        </p>
      </div>

      {/* Formato CSV di esempio */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">
          📄 Formato CSV richiesto:
        </h3>
        <pre className="text-sm text-blue-700 bg-white p-2 rounded border">
{`idSquadra,idGiocatore
1,101
1,102
2,103`}
        </pre>
      </div>

      {/* Upload Section */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <label className="flex-1">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">
                {file ? `Selezionato: ${file.name}` : 'Clicca per selezionare il file CSV'}
              </p>
            </div>
          </label>
        </div>

        {file && (
          <div className="mt-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-700">{file.name}</span>
            <button
              onClick={() => setFile(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Elaborando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importa CSV
              </>
            )}
          </button>

          {(result || error) && (
            <button
              onClick={resetForm}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
            >
              Nuovo Import
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="text-red-800 font-semibold">Errore</h3>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-4">
          {/* Summary Card */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <h3 className="text-green-800 font-semibold">Import Completato</h3>
            </div>
            <p className="text-green-700 mb-3">{result.message}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-green-600">{result.summary.inserted}</div>
                <div className="text-gray-600">Inseriti</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-yellow-600">{result.summary.skipped}</div>
                <div className="text-gray-600">Saltati</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-red-600">{result.summary.failed}</div>
                <div className="text-gray-600">Falliti</div>
              </div>
              <div className="text-center p-3 bg-white rounded border">
                <div className="text-2xl font-bold text-blue-600">{result.summary.total}</div>
                <div className="text-gray-600">Totali</div>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="text-yellow-800 font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Avvisi ({result.warnings.length})
              </h4>
              <div className="max-h-40 overflow-y-auto">
                {result.warnings.map((warning, index) => (
                  <p key={index} className="text-yellow-700 text-sm py-1 border-b border-yellow-200 last:border-b-0">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {result.errors && result.errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Errori ({result.errors.length})
              </h4>
              <div className="max-h-40 overflow-y-auto">
                {result.errors.map((error, index) => (
                  <p key={index} className="text-red-700 text-sm py-1 border-b border-red-200 last:border-b-0">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamPlayerCSVUpload;