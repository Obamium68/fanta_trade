"use client";
import { useState } from "react";

export default function UploadPlayers() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [fileContent, setFileContent] = useState<string>("");

  // Funzione per leggere e mostrare il contenuto del file
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    
    if (selectedFile) {
      try {
        const text = await selectedFile.text();
        setFileContent(text);
        console.log("Contenuto del file:", text);
      } catch (error) {
        console.error("Errore nella lettura del file:", error);
        setFileContent("Errore nella lettura del file");
      }
    } else {
      setFileContent("");
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    console.log("Uploading file:", formData);

    const res = await fetch("/api/players/import", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setMessage(data.message || data.error);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <form onSubmit={handleUpload} className="mb-6">
        <div className="mb-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="mb-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button 
            type="submit" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            disabled={!file}
          >
            Importa Giocatori
          </button>
        </div>
        {message && (
          <p className={`mt-2 ${message.includes('error') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </form>

      {/* Anteprima del contenuto del file */}
      {fileContent && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Anteprima del file:</h3>
          <div className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {fileContent}
            </pre>
          </div>
          
          {/* Tabella formattata per CSV */}
          {fileContent.includes(',') && (
            <div className="mt-4">
              <h4 className="text-md font-semibold mb-2">Vista tabella:</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                  <tbody>
                    {fileContent.split('\n').filter(line => line.trim()).map((line, index) => (
                      <tr key={index} className={index === 0 ? 'bg-gray-50 font-semibold' : ''}>
                        {line.split(',').map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2 border border-gray-200 text-sm">
                            {cell.trim()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}