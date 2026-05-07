declare module "i18n" {
  type ConfigureOptions = {
    defaultLocale?: string;
    directory?: string;
    fallbacks?: Record<string, string>;
    locales?: string[];
    staticCatalog?: Record<string, Record<string, string>>;
    updateFiles?: boolean;
  };

  type TranslateOptions = {
    phrase: string;
    locale: string;
  };

  const i18n: {
    configure(options: ConfigureOptions): void;
    __(options: TranslateOptions): string;
    setLocale(locale: string): string;
  };

  export default i18n;
}
