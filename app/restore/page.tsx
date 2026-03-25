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
      setProgress(0);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/restore', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la restauration');
      }

      const data = await response.json();
      
      setProgress(100);
      toast.success(`✅ ${data.message || 'Restauration réussie!'}`);
      setFile(null);
      
      // Actualiser la page après 2 secondes
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la restauration du fichier');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDragDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      toast.success(`Fichier déposé: ${droppedFile.name}`);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Restaurer vos données</CardTitle>
          <CardDescription>
            Importez votre fichier de sauvegarde (backup JSON) pour restaurer tous vos 709 articles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Zone de glisser-déposer */}
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
                  {file ? '📁 ' + file.name : '📤 Déposez votre fichier ici'}
                </div>
                <p className="text-sm text-muted-foreground">
                  ou cliquez pour sélectionner un fichier JSON
                </p>
              </label>
            </div>

            {/* Barre de progression */}
            {isRestoring && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  Restauration en cours... {progress}%
                </p>
              </div>
            )}

            {/* Boutons */}
            <div className="flex gap-4">
              <Button
                onClick={handleRestore}
                disabled={!file || isRestoring}
                size="lg"
                className="flex-1"
              >
                {isRestoring ? 'Restauration...' : '✅ Restaurer'}
              </Button>
              <Button
                onClick={() => setFile(null)}
                variant="outline"
                disabled={isRestoring}
                size="lg"
              >
                Annuler
              </Button>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 p-4 rounded-lg text-sm space-y-2">
              <p className="font-semibold">Instructions :</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Sélectionnez votre fichier de sauvegarde (backup_*.json)</li>
                <li>Cliquez sur "Restaurer"</li>
                <li>Attendez 2-5 minutes (ne fermez pas la page)</li>
                <li>✅ Vos 709 articles seront restaurés!</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
