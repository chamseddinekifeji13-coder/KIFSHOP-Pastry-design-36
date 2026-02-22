"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

export type Locale = "fr" | "ar"

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  dir: "ltr" | "rtl"
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: "fr",
  setLocale: () => {},
  dir: "ltr",
  t: (key) => key,
})

export function useI18n() {
  return useContext(I18nContext)
}

// ─── Translations dictionary ─────────────────────────────────
const translations: Record<Locale, Record<string, string>> = {
  fr: {
    // Navigation
    "nav.dashboard": "Tableau de bord",
    "nav.stocks": "Stocks",
    "nav.inventory": "Inventaire",
    "nav.production": "Production",
    "nav.orders": "Commandes",
    "nav.prospects": "Prospects",
    "nav.supply": "Approvisionnement",
    "nav.store": "E-Boutique",
    "nav.channels": "Canaux de vente",
    "nav.treasury": "Tresorerie",
    "nav.settings": "Parametres",
    "nav.general": "General",
    "nav.operations": "Operations",
    "nav.purchases": "Achats",
    "nav.online_sales": "Ventes en ligne",
    "nav.finance": "Finance",
    "nav.administration": "Administration",
    "nav.logout": "Deconnexion",
    "nav.lock": "Verrouiller",

    // Settings
    "settings.title": "Parametres",
    "settings.subtitle": "Configurez votre boutique et votre abonnement",
    "settings.subscription": "Abonnement",
    "settings.manage_plan": "Gerez votre plan KIFSHOP",
    "settings.shop_config": "Configuration Boutique",
    "settings.shop_desc": "Informations de votre etablissement",
    "settings.categories": "Categories de produits",
    "settings.categories_desc": "Organisez vos produits finis par categorie",
    "settings.categories_count": "categories configurees",
    "settings.users": "Utilisateurs",
    "settings.users_desc": "Profils et acces des utilisateurs",
    "settings.users_total": "utilisateurs au total",
    "settings.billing": "Facturation & Documents",
    "settings.billing_desc": "Configuration des factures et bons de livraison",
    "settings.printing": "Impression",
    "settings.printing_desc": "Configuration des tickets et factures",
    "settings.notifications": "Notifications",
    "settings.notifications_desc": "Alertes et rappels",
    "settings.language": "Langue",
    "settings.language_desc": "Choisissez la langue de l'interface",
    "settings.french": "Francais",
    "settings.arabic": "Arabe",
    "settings.manage_subscription": "Gerer l'abonnement",
    "settings.current_plan": "Plan actuel",
    "settings.price": "Prix",
    "settings.next_billing": "Prochaine facturation",
    "settings.auto_print": "Impression automatique",
    "settings.auto_print_desc": "Imprimer le ticket apres chaque vente",
    "settings.include_logo": "Inclure le logo",
    "settings.include_logo_desc": "Afficher le logo sur les tickets",
    "settings.critical_stock_alert": "Alertes stock critique",
    "settings.critical_stock_desc": "Notification quand le stock est bas",
    "settings.new_orders_alert": "Nouvelles commandes",
    "settings.new_orders_desc": "Notification pour chaque commande",
    "settings.daily_report": "Rapport quotidien",
    "settings.daily_report_desc": "Resume des ventes par email",
    "settings.tax_section": "TVA / Taxe",
    "settings.enable_tax": "Activer la TVA",
    "settings.enable_tax_desc": "Afficher HT, TVA et TTC sur les factures",
    "settings.save_settings": "Enregistrer les parametres",

    // Dashboard
    "dashboard.title": "Tableau de bord",
    "dashboard.subtitle": "Vue d'ensemble de votre patisserie",
    "dashboard.revenue_today": "Chiffre du jour",
    "dashboard.orders_today": "Commandes du jour",
    "dashboard.low_stock": "Stock critique",
    "dashboard.production_today": "Production du jour",
    "dashboard.recent_orders": "Commandes recentes",
    "dashboard.no_orders": "Aucune commande",
    "dashboard.top_products": "Produits les plus vendus",
    "dashboard.view_all": "Voir tout",
    "dashboard.online_sales": "Ventes en ligne",

    // Stocks
    "stocks.title": "Gestion des stocks",
    "stocks.subtitle": "Matieres premieres et produits finis",
    "stocks.raw_materials": "Matieres premieres",
    "stocks.finished_products": "Produits finis",
    "stocks.add_raw": "Ajouter matiere premiere",
    "stocks.add_finished": "Ajouter produit fini",
    "stocks.critical": "Critique",
    "stocks.low": "Bas",
    "stocks.ok": "OK",

    // Inventory
    "inventory.title": "Inventaire",
    "inventory.subtitle": "Comptage physique et correction des stocks",
    "inventory.new": "Nouvel inventaire",
    "inventory.resume": "Reprendre",
    "inventory.history": "Historique des inventaires",
    "inventory.total_sessions": "Total sessions",
    "inventory.last_inventory": "Dernier inventaire",
    "inventory.total_discrepancies": "Ecarts detectes",
    "inventory.draft": "Brouillon",
    "inventory.in_progress": "En cours",
    "inventory.completed": "Termine",
    "inventory.validated": "Valide",
    "inventory.save_draft": "Continuer plus tard",
    "inventory.save": "Enregistrer l'inventaire",
    "inventory.draft_banner": "Inventaire en cours (brouillon)",
    "inventory.draft_banner_desc": "Vous avez un inventaire non termine.",

    // Production
    "production.title": "Production",
    "production.subtitle": "Planifiez et suivez votre production",
    "production.new_plan": "Nouveau plan",
    "production.today": "Production du jour",
    "production.planned": "Planifiee",
    "production.in_progress": "En cours",
    "production.completed": "Terminee",

    // Orders
    "orders.title": "Commandes",
    "orders.subtitle": "Gerez les commandes de vos clients",
    "orders.new": "Nouvelle commande",
    "orders.pending": "En attente",
    "orders.processing": "En preparation",
    "orders.ready": "Prete",
    "orders.delivered": "Livree",
    "orders.cancelled": "Annulee",
    "orders.customer": "Client",
    "orders.phone": "Telephone",
    "orders.total": "Total",
    "orders.source": "Source",
    "orders.invoice": "Facture",
    "orders.delivery_note": "Bon de livraison",

    // Prospects
    "prospects.title": "Prospects",
    "prospects.subtitle": "Suivez vos clients potentiels",
    "prospects.new": "Nouveau prospect",
    "prospects.total": "Total",
    "prospects.to_contact": "A contacter",
    "prospects.in_progress": "En cours",
    "prospects.converted": "Convertis",
    "prospects.conversion_rate": "Taux de conversion",
    "prospects.all": "Tous",
    "prospects.new_status": "Nouveau",
    "prospects.contacted": "Contacte",
    "prospects.discussing": "En discussion",
    "prospects.lost": "Perdu",
    "prospects.convert_to_order": "Convertir en commande",
    "prospects.reminder": "Rappel",
    "prospects.import": "Importer",

    // Supply
    "supply.title": "Approvisionnement",
    "supply.subtitle": "Gerez vos fournisseurs et commandes",
    "supply.suppliers": "Fournisseurs",
    "supply.new_order": "Nouvelle commande",
    "supply.new_supplier": "Nouveau fournisseur",
    "supply.best_prices": "Meilleurs prix",

    // Channels
    "channels.title": "Canaux de vente",
    "channels.subtitle": "Gerez vos sources de commandes",
    "channels.active": "Canaux actifs",
    "channels.online_orders": "Commandes en ligne",
    "channels.online_revenue": "Revenu en ligne",
    "channels.configure": "Configurer",
    "channels.open": "Ouvrir",

    // Treasury
    "treasury.title": "Tresorerie",
    "treasury.subtitle": "Suivi financier de votre activite",
    "treasury.balance": "Solde actuel",
    "treasury.income": "Revenus",
    "treasury.expenses": "Depenses",
    "treasury.transactions": "Transactions",
    "treasury.new_transaction": "Nouvelle transaction",

    // Boutique
    "boutique.title": "E-Boutique",
    "boutique.subtitle": "Votre vitrine en ligne",

    // Supply extra
    "supply.active_suppliers": "Fournisseurs actifs",

    // Channels extra
    "channels.active_channels": "Canaux actifs",

    // Treasury extra
    "treasury.total_inflow": "Total entrees",
    "treasury.total_outflow": "Total sorties",
    "treasury.today_margin": "Marge du jour",

    // Orders extra
    "orders.new_order": "Nouvelle commande",

    // Topbar
    "topbar.language": "Changer la langue",
    "topbar.switch_shop": "Changer de boutique",
    "topbar.switch_user": "Changer d'utilisateur",
    "topbar.my_profile": "Mon profil",
    "topbar.change_pin": "Modifier mon PIN",
    "topbar.set_pin": "Definir un PIN",
    "topbar.lock": "Verrouiller",
    "topbar.logout": "Deconnexion",
    "topbar.active": "Actif",
    "topbar.connected_as": "Connecte en tant que",

    // Common
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.edit": "Modifier",
    "common.delete": "Supprimer",
    "common.search": "Rechercher...",
    "common.loading": "Chargement...",
    "common.today": "Aujourd'hui",
    "common.yesterday": "Hier",
    "common.add": "Ajouter",
    "common.close": "Fermer",
    "common.confirm": "Confirmer",
    "common.back": "Retour",
    "common.yes": "Oui",
    "common.no": "Non",
    "common.all": "Tous",
    "common.details": "Details",
    "common.manage": "Gerer",
    "common.total": "Total",
    "common.no_data": "Aucune donnee",
    "common.tnd": "TND",
    "common.actions": "Actions",
  },
  ar: {
    // Navigation
    "nav.dashboard": "\u0644\u0648\u062d\u0629 \u0627\u0644\u0642\u064a\u0627\u062f\u0629",
    "nav.stocks": "\u0627\u0644\u0645\u062e\u0632\u0648\u0646",
    "nav.inventory": "\u0627\u0644\u062c\u0631\u062f",
    "nav.production": "\u0627\u0644\u0625\u0646\u062a\u0627\u062c",
    "nav.orders": "\u0627\u0644\u0637\u0644\u0628\u0627\u062a",
    "nav.prospects": "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u062d\u062a\u0645\u0644\u0648\u0646",
    "nav.supply": "\u0627\u0644\u062a\u0645\u0648\u064a\u0646",
    "nav.store": "\u0627\u0644\u0645\u062a\u062c\u0631",
    "nav.channels": "\u0642\u0646\u0648\u0627\u062a \u0627\u0644\u0628\u064a\u0639",
    "nav.treasury": "\u0627\u0644\u062e\u0632\u064a\u0646\u0629",
    "nav.settings": "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a",
    "nav.general": "\u0639\u0627\u0645",
    "nav.operations": "\u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a",
    "nav.purchases": "\u0627\u0644\u0645\u0634\u062a\u0631\u064a\u0627\u062a",
    "nav.online_sales": "\u0627\u0644\u0628\u064a\u0639 \u0639\u0628\u0631 \u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a",
    "nav.finance": "\u0627\u0644\u0645\u0627\u0644\u064a\u0629",
    "nav.administration": "\u0627\u0644\u0625\u062f\u0627\u0631\u0629",
    "nav.logout": "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c",
    "nav.lock": "\u0642\u0641\u0644",

    // Settings
    "settings.title": "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a",
    "settings.subtitle": "\u0642\u0645 \u0628\u062a\u0643\u0648\u064a\u0646 \u0645\u062a\u062c\u0631\u0643 \u0648\u0627\u0634\u062a\u0631\u0627\u0643\u0643",
    "settings.subscription": "\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643",
    "settings.manage_plan": "\u0625\u062f\u0627\u0631\u0629 \u062e\u0637\u0629 KIFSHOP",
    "settings.shop_config": "\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631",
    "settings.shop_desc": "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0645\u0624\u0633\u0633\u062a\u0643",
    "settings.categories": "\u0641\u0626\u0627\u062a \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",
    "settings.categories_desc": "\u0646\u0638\u0645 \u0645\u0646\u062a\u062c\u0627\u062a\u0643 \u062d\u0633\u0628 \u0627\u0644\u0641\u0626\u0629",
    "settings.categories_count": "\u0641\u0626\u0627\u062a \u0645\u0647\u064a\u0623\u0629",
    "settings.users": "\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646",
    "settings.users_desc": "\u0645\u0644\u0641\u0627\u062a \u0648\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u064a\u0646",
    "settings.users_total": "\u0645\u0633\u062a\u062e\u062f\u0645 \u0625\u062c\u0645\u0627\u0644\u0627",
    "settings.billing": "\u0627\u0644\u0641\u0648\u062a\u0631\u0629 \u0648\u0627\u0644\u0648\u062b\u0627\u0626\u0642",
    "settings.billing_desc": "\u0625\u0639\u062f\u0627\u062f \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0648\u0625\u0630\u0648\u0646\u0627\u062a \u0627\u0644\u062a\u0633\u0644\u064a\u0645",
    "settings.printing": "\u0627\u0644\u0637\u0628\u0627\u0639\u0629",
    "settings.printing_desc": "\u0625\u0639\u062f\u0627\u062f \u0627\u0644\u062a\u0630\u0627\u0643\u0631 \u0648\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631",
    "settings.notifications": "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
    "settings.notifications_desc": "\u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a \u0648\u0627\u0644\u062a\u0630\u0643\u064a\u0631\u0627\u062a",
    "settings.language": "\u0627\u0644\u0644\u063a\u0629",
    "settings.language_desc": "\u0627\u062e\u062a\u0631 \u0644\u063a\u0629 \u0627\u0644\u0648\u0627\u062c\u0647\u0629",
    "settings.french": "\u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629",
    "settings.arabic": "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
    "settings.manage_subscription": "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643",
    "settings.current_plan": "\u0627\u0644\u062e\u0637\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629",
    "settings.price": "\u0627\u0644\u0633\u0639\u0631",
    "settings.next_billing": "\u0627\u0644\u0641\u0648\u062a\u0631\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629",
    "settings.auto_print": "\u0637\u0628\u0627\u0639\u0629 \u062a\u0644\u0642\u0627\u0626\u064a\u0629",
    "settings.auto_print_desc": "\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u062a\u0630\u0643\u0631\u0629 \u0628\u0639\u062f \u0643\u0644 \u0628\u064a\u0639\u0629",
    "settings.include_logo": "\u062a\u0636\u0645\u064a\u0646 \u0627\u0644\u0634\u0639\u0627\u0631",
    "settings.include_logo_desc": "\u0639\u0631\u0636 \u0627\u0644\u0634\u0639\u0627\u0631 \u0639\u0644\u0649 \u0627\u0644\u062a\u0630\u0627\u0643\u0631",
    "settings.critical_stock_alert": "\u062a\u0646\u0628\u064a\u0647 \u0627\u0644\u0645\u062e\u0632\u0648\u0646 \u0627\u0644\u062d\u0631\u062c",
    "settings.critical_stock_desc": "\u0625\u0634\u0639\u0627\u0631 \u0639\u0646\u062f \u0627\u0646\u062e\u0641\u0627\u0636 \u0627\u0644\u0645\u062e\u0632\u0648\u0646",
    "settings.new_orders_alert": "\u0637\u0644\u0628\u0627\u062a \u062c\u062f\u064a\u062f\u0629",
    "settings.new_orders_desc": "\u0625\u0634\u0639\u0627\u0631 \u0644\u0643\u0644 \u0637\u0644\u0628",
    "settings.daily_report": "\u062a\u0642\u0631\u064a\u0631 \u064a\u0648\u0645\u064a",
    "settings.daily_report_desc": "\u0645\u0644\u062e\u0635 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0639\u0628\u0631 \u0627\u0644\u0628\u0631\u064a\u062f",
    "settings.tax_section": "\u0627\u0644\u0636\u0631\u064a\u0628\u0629 / TVA",
    "settings.enable_tax": "\u062a\u0641\u0639\u064a\u0644 \u0627\u0644\u0636\u0631\u064a\u0628\u0629",
    "settings.enable_tax_desc": "\u0639\u0631\u0636 HT \u0648TVA \u0648TTC \u0639\u0644\u0649 \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631",
    "settings.save_settings": "\u062d\u0641\u0638 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a",

    // Dashboard
    "dashboard.title": "\u0644\u0648\u062d\u0629 \u0627\u0644\u0642\u064a\u0627\u062f\u0629",
    "dashboard.subtitle": "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0645\u062d\u0644\u0643",
    "dashboard.revenue_today": "\u0631\u0642\u0645 \u0627\u0644\u064a\u0648\u0645",
    "dashboard.orders_today": "\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u064a\u0648\u0645",
    "dashboard.low_stock": "\u0645\u062e\u0632\u0648\u0646 \u062d\u0631\u062c",
    "dashboard.production_today": "\u0625\u0646\u062a\u0627\u062c \u0627\u0644\u064a\u0648\u0645",
    "dashboard.recent_orders": "\u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0623\u062e\u064a\u0631\u0629",
    "dashboard.no_orders": "\u0644\u0627 \u062a\u0648\u062c\u062f \u0637\u0644\u0628\u0627\u062a",
    "dashboard.top_products": "\u0627\u0644\u0623\u0643\u062b\u0631 \u0645\u0628\u064a\u0639\u0627",
    "dashboard.view_all": "\u0639\u0631\u0636 \u0627\u0644\u0643\u0644",
    "dashboard.online_sales": "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0639\u0628\u0631 \u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a",

    // Stocks
    "stocks.title": "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u062e\u0632\u0648\u0646",
    "stocks.subtitle": "\u0627\u0644\u0645\u0648\u0627\u062f \u0627\u0644\u0623\u0648\u0644\u064a\u0629 \u0648\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0646\u0647\u0627\u0626\u064a\u0629",
    "stocks.raw_materials": "\u0627\u0644\u0645\u0648\u0627\u062f \u0627\u0644\u0623\u0648\u0644\u064a\u0629",
    "stocks.finished_products": "\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0646\u0647\u0627\u0626\u064a\u0629",
    "stocks.add_raw": "\u0625\u0636\u0627\u0641\u0629 \u0645\u0627\u062f\u0629 \u0623\u0648\u0644\u064a\u0629",
    "stocks.add_finished": "\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062a\u062c \u0646\u0647\u0627\u0626\u064a",
    "stocks.critical": "\u062d\u0631\u062c",
    "stocks.low": "\u0645\u0646\u062e\u0641\u0636",
    "stocks.ok": "\u062c\u064a\u062f",

    // Inventory
    "inventory.title": "\u0627\u0644\u062c\u0631\u062f",
    "inventory.subtitle": "\u0627\u0644\u0639\u062f \u0627\u0644\u0641\u0639\u0644\u064a \u0648\u062a\u0635\u062d\u064a\u062d \u0627\u0644\u0645\u062e\u0632\u0648\u0646",
    "inventory.new": "\u062c\u0631\u062f \u062c\u062f\u064a\u062f",
    "inventory.resume": "\u0627\u0633\u062a\u0626\u0646\u0627\u0641",
    "inventory.history": "\u0633\u062c\u0644 \u0627\u0644\u062c\u0631\u062f",
    "inventory.total_sessions": "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062c\u0644\u0633\u0627\u062a",
    "inventory.last_inventory": "\u0622\u062e\u0631 \u062c\u0631\u062f",
    "inventory.total_discrepancies": "\u0627\u0644\u0641\u0631\u0648\u0642\u0627\u062a",
    "inventory.draft": "\u0645\u0633\u0648\u062f\u0629",
    "inventory.in_progress": "\u062c\u0627\u0631\u064a",
    "inventory.completed": "\u0645\u0643\u062a\u0645\u0644",
    "inventory.validated": "\u0645\u0639\u062a\u0645\u062f",
    "inventory.save_draft": "\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0644\u0627\u062d\u0642\u0627",
    "inventory.save": "\u062d\u0641\u0638 \u0627\u0644\u062c\u0631\u062f",
    "inventory.draft_banner": "\u062c\u0631\u062f \u062c\u0627\u0631\u064a (\u0645\u0633\u0648\u062f\u0629)",
    "inventory.draft_banner_desc": "\u0644\u062f\u064a\u0643 \u062c\u0631\u062f \u063a\u064a\u0631 \u0645\u0643\u062a\u0645\u0644.",

    // Production
    "production.title": "\u0627\u0644\u0625\u0646\u062a\u0627\u062c",
    "production.subtitle": "\u062e\u0637\u0637 \u0648\u062a\u0627\u0628\u0639 \u0625\u0646\u062a\u0627\u062c\u0643",
    "production.new_plan": "\u062e\u0637\u0629 \u062c\u062f\u064a\u062f\u0629",
    "production.today": "\u0625\u0646\u062a\u0627\u062c \u0627\u0644\u064a\u0648\u0645",
    "production.planned": "\u0645\u062e\u0637\u0637\u0629",
    "production.in_progress": "\u062c\u0627\u0631\u064a\u0629",
    "production.completed": "\u0645\u0643\u062a\u0645\u0644\u0629",

    // Orders
    "orders.title": "\u0627\u0644\u0637\u0644\u0628\u0627\u062a",
    "orders.subtitle": "\u0625\u062f\u0627\u0631\u0629 \u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0639\u0645\u0644\u0627\u0621",
    "orders.new": "\u0637\u0644\u0628 \u062c\u062f\u064a\u062f",
    "orders.pending": "\u0642\u064a\u062f \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631",
    "orders.processing": "\u0642\u064a\u062f \u0627\u0644\u062a\u062d\u0636\u064a\u0631",
    "orders.ready": "\u062c\u0627\u0647\u0632\u0629",
    "orders.delivered": "\u062a\u0645 \u0627\u0644\u062a\u0633\u0644\u064a\u0645",
    "orders.cancelled": "\u0645\u0644\u063a\u0627\u0629",
    "orders.customer": "\u0627\u0644\u0639\u0645\u064a\u0644",
    "orders.phone": "\u0627\u0644\u0647\u0627\u062a\u0641",
    "orders.total": "\u0627\u0644\u0645\u062c\u0645\u0648\u0639",
    "orders.source": "\u0627\u0644\u0645\u0635\u062f\u0631",
    "orders.invoice": "\u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629",
    "orders.delivery_note": "\u0625\u0630\u0646 \u0627\u0644\u062a\u0633\u0644\u064a\u0645",

    // Prospects
    "prospects.title": "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u062d\u062a\u0645\u0644\u0648\u0646",
    "prospects.subtitle": "\u062a\u0627\u0628\u0639 \u0639\u0645\u0644\u0627\u0621\u0643 \u0627\u0644\u0645\u062d\u062a\u0645\u0644\u064a\u0646",
    "prospects.new": "\u0639\u0645\u064a\u0644 \u0645\u062d\u062a\u0645\u0644 \u062c\u062f\u064a\u062f",
    "prospects.total": "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
    "prospects.to_contact": "\u0644\u0644\u0627\u062a\u0635\u0627\u0644",
    "prospects.in_progress": "\u062c\u0627\u0631\u064a",
    "prospects.converted": "\u0645\u062d\u0648\u0644",
    "prospects.conversion_rate": "\u0646\u0633\u0628\u0629 \u0627\u0644\u062a\u062d\u0648\u064a\u0644",
    "prospects.all": "\u0627\u0644\u0643\u0644",
    "prospects.new_status": "\u062c\u062f\u064a\u062f",
    "prospects.contacted": "\u062a\u0645 \u0627\u0644\u0627\u062a\u0635\u0627\u0644",
    "prospects.discussing": "\u0641\u064a \u0646\u0642\u0627\u0634",
    "prospects.lost": "\u0645\u0641\u0642\u0648\u062f",
    "prospects.convert_to_order": "\u062a\u062d\u0648\u064a\u0644 \u0625\u0644\u0649 \u0637\u0644\u0628",
    "prospects.reminder": "\u062a\u0630\u0643\u064a\u0631",
    "prospects.import": "\u0627\u0633\u062a\u064a\u0631\u0627\u062f",

    // Supply
    "supply.title": "\u0627\u0644\u062a\u0645\u0648\u064a\u0646",
    "supply.subtitle": "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0648\u0631\u062f\u064a\u0646 \u0648\u0627\u0644\u0637\u0644\u0628\u0627\u062a",
    "supply.suppliers": "\u0627\u0644\u0645\u0648\u0631\u062f\u0648\u0646",
    "supply.new_order": "\u0637\u0644\u0628 \u062c\u062f\u064a\u062f",
    "supply.new_supplier": "\u0645\u0648\u0631\u062f \u062c\u062f\u064a\u062f",
    "supply.best_prices": "\u0623\u0641\u0636\u0644 \u0627\u0644\u0623\u0633\u0639\u0627\u0631",

    // Channels
    "channels.title": "\u0642\u0646\u0648\u0627\u062a \u0627\u0644\u0628\u064a\u0639",
    "channels.subtitle": "\u0625\u062f\u0627\u0631\u0629 \u0645\u0635\u0627\u062f\u0631 \u0627\u0644\u0637\u0644\u0628\u0627\u062a",
    "channels.active": "\u0627\u0644\u0642\u0646\u0648\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629",
    "channels.online_orders": "\u0627\u0644\u0637\u0644\u0628\u0627\u062a \u0639\u0628\u0631 \u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a",
    "channels.online_revenue": "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a",
    "channels.configure": "\u062a\u0643\u0648\u064a\u0646",
    "channels.open": "\u0641\u062a\u062d",

    // Treasury
    "treasury.title": "\u0627\u0644\u062e\u0632\u064a\u0646\u0629",
    "treasury.subtitle": "\u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0645\u0627\u0644\u064a\u0629",
    "treasury.balance": "\u0627\u0644\u0631\u0635\u064a\u062f \u0627\u0644\u062d\u0627\u0644\u064a",
    "treasury.income": "\u0627\u0644\u0625\u064a\u0631\u0627\u062f\u0627\u062a",
    "treasury.expenses": "\u0627\u0644\u0645\u0635\u0627\u0631\u064a\u0641",
    "treasury.transactions": "\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a",
    "treasury.new_transaction": "\u0645\u0639\u0627\u0645\u0644\u0629 \u062c\u062f\u064a\u062f\u0629",

    // Boutique
    "boutique.title": "\u0627\u0644\u0645\u062a\u062c\u0631",
    "boutique.subtitle": "\u0648\u0627\u062c\u0647\u062a\u0643 \u0639\u0644\u0649 \u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a",

    // Supply extra
    "supply.active_suppliers": "\u0627\u0644\u0645\u0648\u0631\u062f\u0648\u0646 \u0627\u0644\u0646\u0634\u0637\u0648\u0646",

    // Channels extra
    "channels.active_channels": "\u0627\u0644\u0642\u0646\u0648\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629",

    // Treasury extra
    "treasury.total_inflow": "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u062f\u0627\u062e\u064a\u0644",
    "treasury.total_outflow": "\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0635\u0627\u0631\u064a\u0641",
    "treasury.today_margin": "\u0647\u0627\u0645\u0634 \u0627\u0644\u064a\u0648\u0645",

    // Orders extra
    "orders.new_order": "\u0637\u0644\u0628 \u062c\u062f\u064a\u062f",

    // Topbar
    "topbar.language": "\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0644\u063a\u0629",
    "topbar.switch_shop": "\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0645\u062a\u062c\u0631",
    "topbar.switch_user": "\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645",
    "topbar.my_profile": "\u0645\u0644\u0641\u064a \u0627\u0644\u0634\u062e\u0635\u064a",
    "topbar.change_pin": "\u062a\u063a\u064a\u064a\u0631 \u0631\u0645\u0632 PIN",
    "topbar.set_pin": "\u062a\u0639\u064a\u064a\u0646 \u0631\u0645\u0632 PIN",
    "topbar.lock": "\u0642\u0641\u0644",
    "topbar.logout": "\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062e\u0631\u0648\u062c",
    "topbar.active": "\u0646\u0634\u0637",
    "topbar.connected_as": "\u0645\u062a\u0635\u0644 \u0628\u0627\u0633\u0645",

    // Common
    "common.save": "\u062d\u0641\u0638",
    "common.cancel": "\u0625\u0644\u063a\u0627\u0621",
    "common.edit": "\u062a\u0639\u062f\u064a\u0644",
    "common.delete": "\u062d\u0630\u0641",
    "common.search": "\u0628\u062d\u062b...",
    "common.loading": "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...",
    "common.today": "\u0627\u0644\u064a\u0648\u0645",
    "common.yesterday": "\u0623\u0645\u0633",
    "common.add": "\u0625\u0636\u0627\u0641\u0629",
    "common.close": "\u0625\u063a\u0644\u0627\u0642",
    "common.confirm": "\u062a\u0623\u0643\u064a\u062f",
    "common.back": "\u0631\u062c\u0648\u0639",
    "common.yes": "\u0646\u0639\u0645",
    "common.no": "\u0644\u0627",
    "common.all": "\u0627\u0644\u0643\u0644",
    "common.details": "\u062a\u0641\u0627\u0635\u064a\u0644",
    "common.manage": "\u0625\u062f\u0627\u0631\u0629",
    "common.total": "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
    "common.no_data": "\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a",
    "common.tnd": "\u062f.\u062a",
    "common.actions": "\u0625\u062c\u0631\u0627\u0621\u0627\u062a",
  },
}

const LOCALE_KEY = "kifshop_locale"

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr")

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_KEY) as Locale | null
    if (stored && (stored === "fr" || stored === "ar")) {
      setLocaleState(stored)
    }
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(LOCALE_KEY, newLocale)
    document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr"
    document.documentElement.lang = newLocale
  }, [])

  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr"
    document.documentElement.lang = locale
  }, [locale])

  const dir = locale === "ar" ? "rtl" : "ltr"

  const t = useCallback(
    (key: string) => translations[locale]?.[key] || translations.fr[key] || key,
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, dir, t }}>
      {children}
    </I18nContext.Provider>
  )
}
