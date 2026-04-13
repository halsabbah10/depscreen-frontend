/**
 * i18n configuration for DepScreen.
 *
 * Currently ships English only. Arabic stub exists for future localization.
 * Infrastructure is ready — adding Arabic is a translation task, not a refactor.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import ar from './locales/ar.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  })

export default i18n
