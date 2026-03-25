'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function RestorePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.json')) {
        toast.error('Veuillez sélectionner un fichier JSON');
        return;
      }
      setFile(selectedFile);
      toast.success(`Fichier sélectionné: ${selectedFile.name}`);
    }
  };

  const handleRestore = async () => {
    if (!file) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    try {
      setIsRestoring(true);
      setProgress(10);

      // Lire le fichier JSON
      const fileContent = await file.text();
      let backupData;

      try {
        backupData = JSON.parse(fileContent);
      } catch (e) {
        toast.error('Format JSON invalide');
        setIsRestoring(false);
        return;
      }

      setProgress(30);

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

      setProgress(70);

      if (!response.ok) {
        throw new Error('Erreur lors de la restauration');
      }

      const data = await response.json();
      setProgress(100);
      
      toast.success(`✅ ${data.message || 'Restauration réussie!'}`);
      setFile(null);
      
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la restauration');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDragDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.endsWith('.json')) {
      setFile(droppedFile);
      toast.success(`Fichier déposé: ${droppedFile.name}`);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Restaurer vos 709 articles</CardTitle>
          <CardDescription>
            Importez votre fichier backup JSON pour restaurer tous vos produits, fournisseurs et clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDragDrop}
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition cursor-pointer"
            >
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
                disabled={isRestoring}
              />
              <label htmlFor="file-input" className="cursor-pointer block">
                <div className="text-lg font-semibold mb-2">
                  {file ? '✓ ' + file.name : 'Déposez votre fichier backup ici'}
                </div>
                <p className="text-sm text-muted-foreground">
                  ou cliquez pour sélectionner
                </p>
              </label>
            </div>

            {isRestoring && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-center">Restauration: {progress}%</p>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={handleRestore}
                disabled={!file || isRestoring}
                size="lg"
                className="flex-1"
              >
                {isRestoring ? 'Restauration...' : 'Restaurer'}
              </Button>
              <Button
                onClick={() => setFile(null)}
                variant="outline"
                disabled={isRestoring}
              >
                Annuler
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
