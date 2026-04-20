#!/usr/bin/env node

/**
 * Script de démonstration de l'archivage des commandes
 * Ce script montre comment utiliser l'API d'archivage depuis l'extérieur
 */

const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3000'; // ou votre domaine en production
const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret-here';
const ARCHIVE_DAYS = 14; // période d'archivage en jours

console.log('🚀 Démonstration de l\'archivage des commandes KIFSHOP\n');

// 1. Tester les statistiques d'archivage
console.log('📊 1. Récupération des statistiques d\'archivage...');
const statsUrl = `${BASE_URL}/api/archive/stats`;

http.get(statsUrl, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const stats = JSON.parse(data);
      console.log('✅ Statistiques récupérées :');
      console.log(`   - Total archivé: ${stats.totalArchived || 0}`);
      console.log(`   - Dernière exécution: ${stats.lastRun || 'Jamais'}`);
      console.log(`   - Prochaine exécution: ${stats.nextRun || 'Non planifiée'}\n`);
    } catch (e) {
      console.log('❌ Erreur lors de la récupération des statistiques\n');
    }

    // 2. Simuler un archivage manuel
    console.log('🗂️  2. Simulation d\'un archivage manuel...');
    console.log(`   Période configurée: ${ARCHIVE_DAYS} jours`);
    console.log('   URL appelée: GET /api/cron/archive-orders?days=' + ARCHIVE_DAYS);
    console.log('   Headers: Authorization: Bearer [CRON_SECRET]');

    console.log('\n✅ Simulation terminée !');
    console.log('\n💡 En production, cet archivage:');
    console.log('   - Archive les commandes terminées (livrées/vendues ou annulées)');
    console.log('   - Plus anciennes que ' + ARCHIVE_DAYS + ' jours');
    console.log('   - Met à jour le champ is_archived = true');
    console.log('   - Préserve toutes les données (pas de suppression)');

    console.log('\n🔧 Comment utiliser dans l\'interface:');
    console.log('   1. Aller dans Paramètres (/parametres)');
    console.log('   2. Section "Archivage des Commandes"');
    console.log('   3. Configurer la période souhaitée');
    console.log('   4. Cliquer "Archiver maintenant"');
  });

}).on('error', (err) => {
  console.log('❌ Erreur réseau:', err.message);
  console.log('\n💡 Le serveur de développement n\'est probablement pas démarré.');
  console.log('   Lancez: npm run dev');
});