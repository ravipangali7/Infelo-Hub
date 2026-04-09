import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

/** Keeps document `<html lang>` in sync with i18next (en / ne). */
export function I18nHtmlLang() {
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith("ne") ? "ne" : "en";
  return <Helmet htmlAttributes={{ lang }} />;
}
