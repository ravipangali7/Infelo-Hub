import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enAuth from "@/locales/en/auth.json";
import enClient from "@/locales/en/client.json";
import enCommon from "@/locales/en/common.json";
import enPages from "@/locales/en/pages";

import neAuth from "@/locales/ne/auth.json";
import neClient from "@/locales/ne/client.json";
import neCommon from "@/locales/ne/common.json";
import nePages from "@/locales/ne/pages";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, client: enClient, pages: enPages, auth: enAuth },
      ne: { common: neCommon, client: neClient, pages: nePages, auth: neAuth },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "ne"],
    defaultNS: "common",
    ns: ["common", "client", "pages", "auth"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

export default i18n;
