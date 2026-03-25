import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Lire le contenu du fichier JSON
    const content = await file.text();
    let backupData;

    try {
      backupData = JSON.parse(content);
    } catch (e) {
      return NextResponse.json(
        { error: 'Format de fichier invalide. Veuillez vérifier que c\'est un JSON valide.' },
        { status: 400 }
      );
    }

    // Vérifier la structure du backup
    if (!backupData.data || !backupData.timestamp) {
      return NextResponse.json(
        { error: 'Structure de sauvegarde invalide' },
        { status: 400 }
      );
    }

    const { data: backupContent } = backupData;
    let totalRestored = 0;

    // Restaurer chaque table
    for (const [tableName, records] of Object.entries(backupContent)) {
      if (!Array.isArray(records) || records.length === 0) {
        continue;
      }

      try {
        // Insérer les enregistrements
        const { error: insertError } = await supabase
          .from(tableName)
          .insert(records as any[]);

        if (insertError) {
          console.error(`Erreur lors de l'insertion dans ${tableName}:`, insertError);
          // Continuer avec les autres tables
        } else {
          totalRestored += (records as any[]).length;
        }
      } catch (error) {
        console.error(`Erreur pour la table ${tableName}:`, error);
        // Continuer
      }
    }

    return NextResponse.json({
      message: `Restauration réussie! ${totalRestored} articles ont été restaurés.`,
      restored: totalRestored,
      tables: Object.keys(backupContent).length,
    });
  } catch (error) {
    console.error('Erreur lors de la restauration:', error);
    return NextResponse.json(
      { error: 'Erreur lors du traitement du fichier' },
      { status: 500 }
    );
  }
}
