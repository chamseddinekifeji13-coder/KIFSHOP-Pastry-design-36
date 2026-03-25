'use client';

import { useState } from 'react';

export default function RestoreBackupPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage(`Fichier sélectionné: ${selectedFile.name}`);
      setError('');
    }
  };

  const handleRestore = async () => {
    if (!file) {
      setError('Veuillez sélectionner un fichier');
      return;
    }

    try {
      setIsLoading(true);
      setProgress(0);
      setError('');
      setMessage('Lecture du fichier...');

      // Read file
      const fileContent = await file.text();
      setProgress(20);

      // Parse JSON
      let backupData;
      try {
        backupData = JSON.parse(fileContent);
      } catch (e) {
        throw new Error('Format JSON invalide');
      }

      setProgress(40);
      setMessage('Envoi des données...');

      // Send to API
      const response = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backup: backupData,
          options: { mode: 'merge' }
        }),
      });

      setProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la restauration');
      }

      const result = await response.json();
      setProgress(100);
      setMessage(`✅ Restauration réussie! ${result.message || 'Vos 709 articles ont été restaurés'}`);
      setFile(null);
      
      // Reload page after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err) {
      setError(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      setProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', padding: '20px' }}>
      <div style={{ maxWidth: '600px', width: '100%', backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '10px', color: '#333' }}>
          Restaurer vos 709 articles
        </h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
          Importez votre fichier backup pour restaurer tous vos produits, fournisseurs et clients
        </p>

        <div
          style={{
            border: '2px dashed #ccc',
            borderRadius: '8px',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: '#fafafa',
            marginBottom: '20px',
            transition: 'all 0.3s'
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#999';
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#ccc';
            e.currentTarget.style.backgroundColor = '#fafafa';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#ccc';
            e.currentTarget.style.backgroundColor = '#fafafa';
            const droppedFile = e.dataTransfer.files?.[0];
            if (droppedFile) {
              setFile(droppedFile);
              setMessage(`Fichier déposé: ${droppedFile.name}`);
              setError('');
            }
          }}
        >
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="file-input"
            disabled={isLoading}
          />
          <label htmlFor="file-input" style={{ cursor: 'pointer', display: 'block' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
              {file ? `✓ ${file.name}` : 'Déposez votre fichier backup ici'}
            </div>
            <p style={{ fontSize: '14px', color: '#999' }}>
              ou cliquez pour sélectionner
            </p>
          </label>
        </div>

        {progress > 0 && progress < 100 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#4CAF50',
                  width: `${progress}%`,
                  transition: 'width 0.3s'
                }}
              />
            </div>
            <p style={{ textAlign: 'center', fontSize: '14px', color: '#666', marginTop: '10px' }}>
              Restauration: {progress}%
            </p>
          </div>
        )}

        {message && (
          <div style={{
            padding: '15px',
            marginBottom: '20px',
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{
            padding: '15px',
            marginBottom: '20px',
            backgroundColor: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleRestore}
            disabled={!file || isLoading}
            style={{
              flex: 1,
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: file && !isLoading ? '#4CAF50' : '#cccccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: file && !isLoading ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => {
              if (file && !isLoading) {
                e.currentTarget.style.backgroundColor = '#45a049';
              }
            }}
            onMouseLeave={(e) => {
              if (file && !isLoading) {
                e.currentTarget.style.backgroundColor = '#4CAF50';
              }
            }}
          >
            {isLoading ? 'Restauration...' : 'Restaurer'}
          </button>
          <button
            onClick={() => {
              setFile(null);
              setMessage('');
              setError('');
              setProgress(0);
            }}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#f0f0f0',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e0e0e0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
          >
            Annuler
          </button>
        </div>

        <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '14px', color: '#666' }}>
          <p><strong>Important:</strong></p>
          <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
            <li>Sélectionnez le fichier: backup-696b8fcc61b59b461ed8b90c-1768683781292.json</li>
            <li>La restauration prendra 2-5 minutes</li>
            <li>Tous vos 709 articles seront restaurés</li>
            <li>La page se rechargera automatiquement</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
