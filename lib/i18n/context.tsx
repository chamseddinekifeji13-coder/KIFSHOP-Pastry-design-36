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

// Common UI translations
const translations: Record<Locale, Record<string, string>> = {
  fr: {
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
    "settings.title": "Parametres",
    "settings.subtitle": "Configurez votre boutique et votre abonnement",
    "settings.subscription": "Abonnement",
    "settings.manage_plan": "Gerez votre plan KIFSHOP Pastry",
    "settings.shop_config": "Configuration Boutique",
    "settings.categories": "Categories de produits",
    "settings.users": "Utilisateurs",
    "settings.billing": "Facturation & Documents",
    "settings.printing": "Impression",
    "settings.notifications": "Notifications",
    "settings.language": "Langue",
    "settings.language_desc": "Choisissez la langue de l'interface",
    "settings.french": "Francais",
    "settings.arabic": "Arabe",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.edit": "Modifier",
    "common.delete": "Supprimer",
    "common.search": "Rechercher...",
    "common.loading": "Chargement...",
    "common.today": "Aujourd'hui",
    "common.yesterday": "Hier",
  },
  ar: {
    "nav.dashboard": "\u0644\u0648\u062d\u0629 \u0627\u0644\u0642\u064a\u0627\u062f\u0629",
    "nav.stocks": "\u0627\u0644\u0645\u062e\u0632\u0648\u0646",
    "nav.inventory": "\u0627\u0644\u062c\u0631\u062f",
    "nav.production": "\u0627\u0644\u0625\u0646\u062a\u0627\u062c",
    "nav.orders": "\u0627\u0644\u0637\u0644\u0628\u0627\u062a",
    "nav.prospects": "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u062d\u062a\u0645\u0644\u0648\u0646",
    "nav.supply": "\u0627\u0644\u062a\u0645\u0648\u064a\u0646",
    "nav.store": "\u0627\u0644\u0645\u062a\u062c\u0631 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a",
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
    "settings.title": "\u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a",
    "settings.subtitle": "\u0642\u0645 \u0628\u062a\u0643\u0648\u064a\u0646 \u0645\u062a\u062c\u0631\u0643 \u0648\u0627\u0634\u062a\u0631\u0627\u0643\u0643",
    "settings.subscription": "\u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643",
    "settings.manage_plan": "\u0625\u062f\u0627\u0631\u0629 \u062e\u0637\u0629 KIFSHOP Pastry",
    "settings.shop_config": "\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631",
    "settings.categories": "\u0641\u0626\u0627\u062a \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",
    "settings.users": "\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0648\u0646",
    "settings.billing": "\u0627\u0644\u0641\u0648\u062a\u0631\u0629 \u0648\u0627\u0644\u0648\u062b\u0627\u0626\u0642",
    "settings.printing": "\u0627\u0644\u0637\u0628\u0627\u0639\u0629",
    "settings.notifications": "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a",
    "settings.language": "\u0627\u0644\u0644\u063a\u0629",
    "settings.language_desc": "\u0627\u062e\u062a\u0631 \u0644\u063a\u0629 \u0627\u0644\u0648\u0627\u062c\u0647\u0629",
    "settings.french": "\u0627\u0644\u0641\u0631\u0646\u0633\u064a\u0629",
    "settings.arabic": "\u0627\u0644\u0639\u0631\u0628\u064a\u0629",
    "common.save": "\u062d\u0641\u0638",
    "common.cancel": "\u0625\u0644\u063a\u0627\u0621",
    "common.edit": "\u062a\u0639\u062f\u064a\u0644",
    "common.delete": "\u062d\u0630\u0641",
    "common.search": "\u0628\u062d\u062b...",
    "common.loading": "\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644...",
    "common.today": "\u0627\u0644\u064a\u0648\u0645",
    "common.yesterday": "\u0623\u0645\u0633",
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
    // Update HTML dir and lang attributes
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
