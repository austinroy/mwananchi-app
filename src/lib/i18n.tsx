import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type React from "react";
import i18n from "i18n";

export type Locale = "en" | "sw";

const localeStorageKey = "mwananchi_locale";

export const localeOptions: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "sw", label: "Kiswahili" },
];

const dictionaries: Record<Locale, Record<string, string>> = {
  en: {
    "app.name": "Mwananchi App",
    "nav.menu": "Menu",
    "nav.open": "Open navigation menu",
    "nav.close": "Close navigation menu",
    "nav.dashboard": "Dashboard",
    "nav.account": "Account",
    "nav.newBrief": "New brief",
    "nav.signIn": "Sign in",
    "nav.signOut": "Sign out",
    "nav.createAccount": "Create account",
    "nav.language": "Language",
    "landing.eyebrow": "Civic intelligence for citizens",
    "landing.title": "Turn public documents into public understanding.",
    "landing.copy":
      "Mwananchi App helps citizens, journalists, students, and community groups explain policies, ask sharper questions, and draft practical civic actions.",
    "landing.createBrief": "Create a civic brief",
    "landing.viewDashboard": "View dashboard",
    "landing.exampleLabel": "Example brief",
    "landing.exampleTitle": "County Budget Public Notice",
    "landing.exampleCopy":
      "This is a sample brief showing how Mwananchi App explains a real civic document. It is an example only, so you can explore the workflow before creating your own.",
    "landing.openExample": "Open the example",
    "landing.createOwn": "Create your own brief",
    "landing.workflowExplain": "Explain",
    "landing.workflowQuestion": "Question",
    "landing.workflowAct": "Act",
    "landing.workflowCaption": "Plain language workflow",
    "brief.loading": "Loading brief...",
    "brief.unavailable": "Brief unavailable",
    "brief.private": "This brief is private",
    "brief.signInTitle": "Sign in to view this brief",
    "brief.loadErrorTitle": "We could not load this brief",
    "brief.privateCopy":
      "This brief belongs to another account and is only available after signing in with access.",
    "brief.createBrief": "Create a brief",
    "brief.linkCopied": "Link copied!",
    "brief.privateToast": "Brief is now private.",
    "brief.updateVisibilityError": "Could not update visibility.",
    "brief.deleted": "Brief deleted successfully.",
    "brief.deleteError": "Could not delete this brief.",
    "brief.deleteConfirm":
      "Delete this brief and its chat/action history? This cannot be undone.",
    "brief.summary": "Plain-language summary",
    "brief.keyPoints": "Key points",
    "brief.affected": "Who is affected",
    "brief.concerns": "Concerns and risks",
    "brief.questions": "Questions citizens should ask",
    "brief.nextSteps": "Suggested next steps",
    "brief.sharedLoading": "Loading shared brief...",
    "brief.sharedNotFound": "Shared brief not found.",
    "brief.sharedLabel": "Shared brief",
    "brief.aiError": "AI provider error detected",
    "brief.aiNotice": "AI provider notice",
    "briefActions.menu": "Share & Actions",
    "briefActions.copyLink": "Copy link",
    "briefActions.makePublic": "Make Public",
    "briefActions.makePrivate": "Make Private",
    "briefActions.generate": "Generate actions",
    "briefActions.deleting": "Deleting...",
    "briefActions.delete": "Delete brief",
    "action.back": "Back to brief",
    "action.title": "Generate civic action",
    "action.subtitle": "{title} · choose a format and audience.",
    "action.briefFallback": "Brief",
    "action.aiModel": "AI model",
    "action.aiNotReady":
      "Configure your preferred AI model in Account before drafting.",
    "action.type": "Action type",
    "action.tone": "Tone",
    "action.audience": "Audience",
    "action.extraContext": "Extra context",
    "action.drafting": "Drafting...",
    "action.draft": "Draft action",
    "action.preview": "Draft preview",
    "action.empty": "Your civic action draft will appear here.",
    "action.generated": "Generated drafts",
    "action.copyDraft": "Copy draft",
    "action.copied": "Draft copied.",
    "action.deleteDraft": "Delete draft",
    "action.deletingDraft": "Deleting...",
    "action.deleteConfirm": "Delete this draft action?",
    "action.deleted": "Draft deleted.",
    "action.deleteError": "Could not delete this draft.",
    "chat.open": "Open chat",
    "chat.label": "Chat",
    "chat.title": "Ask about this brief",
    "chat.expand": "Expand chat",
    "chat.collapse": "Collapse chat",
    "chat.clear": "Clear chat",
    "chat.clearing": "Clearing...",
    "chat.clearConfirm": "Clear this chat history?",
    "chat.clearError": "Could not clear chat history.",
    "chat.aiModel": "AI model",
    "chat.aiNotReady":
      "Configure your preferred AI model in Account before chatting.",
    "chat.processing": "Assistant is processing",
    "chat.placeholder":
      "Ask who is affected, what changed, or what action to take...",
    "chat.configureAi":
      "Configure your AI model in Account before sending a question.",
    "chat.send": "Send question",
    "dashboard.workspace": "Workspace",
    "dashboard.testing": "Testing mode",
    "dashboard.title": "Civic briefs",
    "dashboard.testingCopy":
      "Dashboard access is temporarily open for testing. Sign in later to save generated briefs to your workspace.",
    "dashboard.start": "Start new brief",
    "dashboard.recent": "Recent briefs",
    "dashboard.search": "Search briefs...",
    "dashboard.loading": "Loading briefs...",
    "dashboard.empty": "No briefs found.",
    "dashboard.titleColumn": "Title",
    "dashboard.categoryColumn": "Category",
    "dashboard.jurisdictionColumn": "Jurisdiction",
    "dashboard.visibilityColumn": "Visibility",
    "dashboard.createdColumn": "Created Date",
    "dashboard.linkCopied": "Link copied to clipboard!",
    "dashboard.visibilityError": "Failed to update visibility",
    "newBrief.title": "Create a civic brief",
    "newBrief.copy": "Paste a policy, bill, public notice, or civic document.",
    "newBrief.documentTitle": "Document title",
    "newBrief.jurisdiction": "Jurisdiction",
    "newBrief.category": "Category",
    "newBrief.uploadPdf": "Upload PDF",
    "newBrief.documentText": "Document text",
    "newBrief.extracting": "Extracting text from PDF...",
    "newBrief.ocrDone":
      "OCR extracted text from {fileName}. Review it before generating the brief.",
    "newBrief.extractDone":
      "Extracted text from {fileName}. Review it before generating the brief.",
    "newBrief.extractError": "Could not extract text from this PDF.",
    "newBrief.aiModel": "AI model",
    "newBrief.aiNotReady":
      "Set your preferred AI model in Account before generating a brief.",
    "newBrief.mvpNote":
      "MVP note: AI responses should still be checked against official sources.",
    "newBrief.configureAi":
      "Configure your AI model in Account before generating a brief.",
    "newBrief.generating": "Generating...",
    "newBrief.generate": "Generate brief",
    "account.eyebrow": "Workspace settings",
    "account.title": "Account",
    "account.copy": "Manage your Mwananchi App identity and sign-in settings.",
    "account.userFallback": "Mwananchi user",
    "account.clerkAccount": "Clerk account",
    "account.localAccount": "Local development account",
    "account.management": "Account management",
    "account.managementClerk":
      "Open Clerk account management to update profile details, password, security settings, connected sign-in methods, and account deletion.",
    "account.managementLocal":
      "Local fallback accounts are stored in this browser for development. Configure Clerk to enable production profile and security management.",
    "account.manageClerk": "Manage with Clerk",
    "account.defaultAi": "Default AI model",
    "account.defaultAiCopy":
      "Choose the provider and model Mwananchi App should use by default. Chat and action drafts can override this per request.",
    "account.saveDefaults": "Save AI defaults",
    "account.saving": "Saving...",
    "account.defaultsSaved": "Default AI model saved.",
    "account.defaultsError": "Could not save AI defaults.",
    "account.providerUnavailable":
      "Configure this provider before saving it as your default.",
    "account.apiKeys": "User API keys",
    "account.apiKeysCopy":
      "Store your own provider keys for logged-in AI requests. Keys are encrypted by the API server and are never shown again after saving.",
    "account.provider": "Provider",
    "account.apiKey": "API key",
    "account.replaceKeyPlaceholder":
      "Enter a new key to replace the stored key",
    "account.keyPlaceholder": "Paste provider API key",
    "account.hideKey": "Hide API key",
    "account.showKey": "Show API key",
    "account.keySaved": "API key saved.",
    "account.keySaveError": "Could not save API key.",
    "account.keyRemoved": "API key removed.",
    "account.keyRemoveError": "Could not remove API key.",
    "account.replaceKey": "Replace key",
    "account.saveKey": "Save encrypted key",
    "account.removeKey": "Remove stored key",
    "account.checkingKeys": "Checking stored keys...",
    "account.configuredOn": "Configured {date}",
    "account.noKey": "No key stored for this provider.",
    "account.configured": "Configured",
    "account.notConfigured": "Not configured",
    "account.localModels": "Local models",
    "account.localModelsCopy":
      "Connect LM Studio when you want Mwananchi App to use an open-source model running on this machine.",
    "account.modelsLoaded": "{count} models loaded from LM Studio",
    "account.noModelsLoaded": "No LM Studio models loaded yet",
    "account.setupLmStudio": "Set up LM Studio",
    "account.localSetup": "Local model setup",
    "account.connectLmStudio": "Connect LM Studio",
    "account.closeLmStudio": "Close LM Studio setup",
    "account.lmStudioHelp":
      "Start the LM Studio local server, load a model, then use the OpenAI-compatible server URL and model name here.",
    "account.baseUrl": "Base URL",
    "account.loadModels": "Load models from LM Studio",
    "account.loadingModels": "Loading models...",
    "account.model": "Model",
    "account.loadModelsFirst": "Load models first",
    "account.modelsLoadedStatus": "Loaded {count} model(s) from LM Studio.",
    "account.noModelsReturned":
      "LM Studio responded, but no models were returned.",
    "account.modelsLoadError": "Could not load LM Studio models.",
    "account.cancel": "Cancel",
    "account.saveLmStudio": "Save LM Studio setup",
  },
  sw: {
    "app.name": "Mwananchi App",
    "nav.menu": "Menyu",
    "nav.open": "Fungua menyu ya urambazaji",
    "nav.close": "Funga menyu ya urambazaji",
    "nav.dashboard": "Dashibodi",
    "nav.account": "Akaunti",
    "nav.newBrief": "Muhtasari mpya",
    "nav.signIn": "Ingia",
    "nav.signOut": "Toka",
    "nav.createAccount": "Fungua akaunti",
    "nav.language": "Lugha",
    "landing.eyebrow": "Maarifa ya kiraia kwa wananchi",
    "landing.title": "Geuza nyaraka za umma kuwa uelewa wa umma.",
    "landing.copy":
      "Mwananchi App huwasaidia wananchi, wanahabari, wanafunzi, na vikundi vya jamii kueleza sera, kuuliza maswali bora, na kuandaa hatua za kiraia.",
    "landing.createBrief": "Unda muhtasari wa kiraia",
    "landing.viewDashboard": "Tazama dashibodi",
    "landing.exampleLabel": "Mfano wa muhtasari",
    "landing.exampleTitle": "Tangazo la Umma la Bajeti ya Kaunti",
    "landing.exampleCopy":
      "Huu ni mfano unaoonyesha jinsi Mwananchi App hueleza waraka wa kiraia. Ni mfano tu ili ujaribu mtiririko kabla ya kuunda wako.",
    "landing.openExample": "Fungua mfano",
    "landing.createOwn": "Unda muhtasari wako",
    "landing.workflowExplain": "Eleza",
    "landing.workflowQuestion": "Uliza",
    "landing.workflowAct": "Chukua hatua",
    "landing.workflowCaption": "Mtiririko wa lugha rahisi",
    "brief.loading": "Inapakia muhtasari...",
    "brief.unavailable": "Muhtasari haupatikani",
    "brief.private": "Muhtasari huu ni binafsi",
    "brief.signInTitle": "Ingia ili kuona muhtasari huu",
    "brief.loadErrorTitle": "Hatukuweza kupakia muhtasari huu",
    "brief.privateCopy":
      "Muhtasari huu ni wa akaunti nyingine na unapatikana tu baada ya kuingia kwa ruhusa.",
    "brief.createBrief": "Unda muhtasari",
    "brief.linkCopied": "Kiungo kimenakiliwa!",
    "brief.privateToast": "Muhtasari sasa ni binafsi.",
    "brief.updateVisibilityError": "Haikuwezekana kubadilisha mwonekano.",
    "brief.deleted": "Muhtasari umefutwa.",
    "brief.deleteError": "Haikuwezekana kufuta muhtasari huu.",
    "brief.deleteConfirm":
      "Futa muhtasari huu pamoja na historia ya gumzo/hatua? Huwezi kurejesha.",
    "brief.summary": "Muhtasari kwa lugha rahisi",
    "brief.keyPoints": "Hoja muhimu",
    "brief.affected": "Wanaoathirika",
    "brief.concerns": "Wasiwasi na hatari",
    "brief.questions": "Maswali ambayo wananchi waulize",
    "brief.nextSteps": "Hatua zinazopendekezwa",
    "brief.sharedLoading": "Inapakia muhtasari ulioshirikiwa...",
    "brief.sharedNotFound": "Muhtasari ulioshirikiwa haukupatikana.",
    "brief.sharedLabel": "Muhtasari ulioshirikiwa",
    "brief.aiError": "Hitilafu ya mtoa huduma wa AI imepatikana",
    "brief.aiNotice": "Taarifa ya mtoa huduma wa AI",
    "briefActions.menu": "Shiriki na Hatua",
    "briefActions.copyLink": "Nakili kiungo",
    "briefActions.makePublic": "Fanya iwe ya Umma",
    "briefActions.makePrivate": "Fanya iwe Binafsi",
    "briefActions.generate": "Tengeneza hatua",
    "briefActions.deleting": "Inafuta...",
    "briefActions.delete": "Futa muhtasari",
    "action.back": "Rudi kwa muhtasari",
    "action.title": "Tengeneza hatua ya kiraia",
    "action.subtitle": "{title} · chagua muundo na hadhira.",
    "action.briefFallback": "Muhtasari",
    "action.aiModel": "Muundo wa AI",
    "action.aiNotReady":
      "Sanidi muundo wako wa AI kwenye Akaunti kabla ya kuandika.",
    "action.type": "Aina ya hatua",
    "action.tone": "Toni",
    "action.audience": "Hadhira",
    "action.extraContext": "Muktadha wa ziada",
    "action.drafting": "Inaandika...",
    "action.draft": "Andika hatua",
    "action.preview": "Mwonekano wa rasimu",
    "action.empty": "Rasimu ya hatua yako itaonekana hapa.",
    "action.generated": "Rasimu zilizotengenezwa",
    "action.copyDraft": "Nakili rasimu",
    "action.copied": "Rasimu imenakiliwa.",
    "action.deleteDraft": "Futa rasimu",
    "action.deletingDraft": "Inafuta...",
    "action.deleteConfirm": "Futa rasimu hii ya hatua?",
    "action.deleted": "Rasimu imefutwa.",
    "action.deleteError": "Haikuwezekana kufuta rasimu hii.",
    "chat.open": "Fungua gumzo",
    "chat.label": "Gumzo",
    "chat.title": "Uliza kuhusu muhtasari huu",
    "chat.expand": "Panua gumzo",
    "chat.collapse": "Kunja gumzo",
    "chat.clear": "Futa gumzo",
    "chat.clearing": "Inafuta...",
    "chat.clearConfirm": "Futa historia ya gumzo hili?",
    "chat.clearError": "Haikuwezekana kufuta historia ya gumzo.",
    "chat.aiModel": "Muundo wa AI",
    "chat.aiNotReady":
      "Sanidi muundo wako wa AI kwenye Akaunti kabla ya kuanza gumzo.",
    "chat.processing": "Msaidizi anachakata",
    "chat.placeholder":
      "Uliza nani anaathirika, nini kimebadilika, au hatua gani ichukuliwe...",
    "chat.configureAi":
      "Sanidi muundo wako wa AI kwenye Akaunti kabla ya kutuma swali.",
    "chat.send": "Tuma swali",
    "dashboard.workspace": "Nafasi ya kazi",
    "dashboard.testing": "Hali ya majaribio",
    "dashboard.title": "Mihtasari ya kiraia",
    "dashboard.testingCopy":
      "Dashibodi imefunguliwa kwa majaribio. Ingia baadaye ili kuhifadhi mihtasari kwenye nafasi yako.",
    "dashboard.start": "Anza muhtasari mpya",
    "dashboard.recent": "Mihtasari ya hivi karibuni",
    "dashboard.search": "Tafuta mihtasari...",
    "dashboard.loading": "Inapakia mihtasari...",
    "dashboard.empty": "Hakuna mihtasari iliyopatikana.",
    "dashboard.titleColumn": "Kichwa",
    "dashboard.categoryColumn": "Kategoria",
    "dashboard.jurisdictionColumn": "Eneo",
    "dashboard.visibilityColumn": "Mwonekano",
    "dashboard.createdColumn": "Tarehe ya kuundwa",
    "dashboard.linkCopied": "Kiungo kimenakiliwa!",
    "dashboard.visibilityError": "Imeshindikana kubadilisha mwonekano",
    "newBrief.title": "Unda muhtasari wa kiraia",
    "newBrief.copy": "Bandika sera, mswada, tangazo la umma, au waraka wa kiraia.",
    "newBrief.documentTitle": "Kichwa cha waraka",
    "newBrief.jurisdiction": "Eneo",
    "newBrief.category": "Kategoria",
    "newBrief.uploadPdf": "Pakia PDF",
    "newBrief.documentText": "Maandishi ya waraka",
    "newBrief.extracting": "Inatoa maandishi kutoka PDF...",
    "newBrief.ocrDone":
      "OCR imetoa maandishi kutoka {fileName}. Yakague kabla ya kutengeneza muhtasari.",
    "newBrief.extractDone":
      "Maandishi yametolewa kutoka {fileName}. Yakague kabla ya kutengeneza muhtasari.",
    "newBrief.extractError": "Haikuwezekana kutoa maandishi kutoka PDF hii.",
    "newBrief.aiModel": "Muundo wa AI",
    "newBrief.aiNotReady":
      "Weka muundo wako wa AI kwenye Akaunti kabla ya kutengeneza muhtasari.",
    "newBrief.mvpNote":
      "Kumbuka: majibu ya AI yanapaswa kukaguliwa dhidi ya vyanzo rasmi.",
    "newBrief.configureAi":
      "Sanidi muundo wako wa AI kwenye Akaunti kabla ya kutengeneza muhtasari.",
    "newBrief.generating": "Inatengeneza...",
    "newBrief.generate": "Tengeneza muhtasari",
    "account.eyebrow": "Mipangilio ya nafasi ya kazi",
    "account.title": "Akaunti",
    "account.copy": "Dhibiti utambulisho wako na mipangilio ya kuingia.",
    "account.userFallback": "Mtumiaji wa Mwananchi",
    "account.clerkAccount": "Akaunti ya Clerk",
    "account.localAccount": "Akaunti ya maendeleo ya ndani",
    "account.management": "Usimamizi wa akaunti",
    "account.managementClerk":
      "Fungua usimamizi wa Clerk kubadilisha wasifu, nenosiri, usalama, mbinu za kuingia, na kufuta akaunti.",
    "account.managementLocal":
      "Akaunti za majaribio huhifadhiwa kwenye kivinjari hiki. Sanidi Clerk kwa usimamizi wa uzalishaji.",
    "account.manageClerk": "Dhibiti kwa Clerk",
    "account.defaultAi": "Muundo chaguomsingi wa AI",
    "account.defaultAiCopy":
      "Chagua mtoa huduma na muundo ambao Mwananchi App itatumia kwa kawaida. Gumzo na rasimu zinaweza kubadilisha kwa ombi moja.",
    "account.saveDefaults": "Hifadhi chaguo za AI",
    "account.saving": "Inahifadhi...",
    "account.defaultsSaved": "Muundo chaguomsingi wa AI umehifadhiwa.",
    "account.defaultsError": "Haikuwezekana kuhifadhi chaguo za AI.",
    "account.providerUnavailable":
      "Sanidi mtoa huduma huyu kabla ya kumhifadhi kama chaguomsingi.",
    "account.apiKeys": "Funguo za API za mtumiaji",
    "account.apiKeysCopy":
      "Hifadhi funguo zako za watoa huduma kwa maombi ya AI ukiwa umeingia. Funguo husimbwa na seva ya API na hazionyeshwi tena baada ya kuhifadhi.",
    "account.provider": "Mtoa huduma",
    "account.apiKey": "Ufunguo wa API",
    "account.replaceKeyPlaceholder": "Weka ufunguo mpya kuchukua nafasi ya uliopo",
    "account.keyPlaceholder": "Bandika ufunguo wa API",
    "account.hideKey": "Ficha ufunguo wa API",
    "account.showKey": "Onyesha ufunguo wa API",
    "account.keySaved": "Ufunguo wa API umehifadhiwa.",
    "account.keySaveError": "Haikuwezekana kuhifadhi ufunguo wa API.",
    "account.keyRemoved": "Ufunguo wa API umeondolewa.",
    "account.keyRemoveError": "Haikuwezekana kuondoa ufunguo wa API.",
    "account.replaceKey": "Badilisha ufunguo",
    "account.saveKey": "Hifadhi ufunguo uliosimbwa",
    "account.removeKey": "Ondoa ufunguo uliohifadhiwa",
    "account.checkingKeys": "Inakagua funguo zilizohifadhiwa...",
    "account.configuredOn": "Ilisanidiwa {date}",
    "account.noKey": "Hakuna ufunguo uliohifadhiwa kwa mtoa huduma huyu.",
    "account.configured": "Imesanidiwa",
    "account.notConfigured": "Haijasanidiwa",
    "account.localModels": "Miundo ya ndani",
    "account.localModelsCopy":
      "Unganisha LM Studio ukitaka Mwananchi App itumie muundo huria unaoendeshwa kwenye mashine hii.",
    "account.modelsLoaded": "Miundo {count} imepakiwa kutoka LM Studio",
    "account.noModelsLoaded": "Hakuna miundo ya LM Studio iliyopakiwa bado",
    "account.setupLmStudio": "Sanidi LM Studio",
    "account.localSetup": "Usanidi wa muundo wa ndani",
    "account.connectLmStudio": "Unganisha LM Studio",
    "account.closeLmStudio": "Funga usanidi wa LM Studio",
    "account.lmStudioHelp":
      "Anzisha seva ya ndani ya LM Studio, pakia muundo, kisha tumia URL na jina la muundo hapa.",
    "account.baseUrl": "URL ya msingi",
    "account.loadModels": "Pakia miundo kutoka LM Studio",
    "account.loadingModels": "Inapakia miundo...",
    "account.model": "Muundo",
    "account.loadModelsFirst": "Pakia miundo kwanza",
    "account.modelsLoadedStatus": "Miundo {count} imepakiwa kutoka LM Studio.",
    "account.noModelsReturned": "LM Studio imejibu, lakini hakuna miundo iliyorejeshwa.",
    "account.modelsLoadError": "Haikuwezekana kupakia miundo ya LM Studio.",
    "account.cancel": "Ghairi",
    "account.saveLmStudio": "Hifadhi usanidi wa LM Studio",
  },
};

i18n.configure({
  defaultLocale: "en",
  directory: "/",
  fallbacks: { sw: "en" },
  locales: ["en", "sw"],
  staticCatalog: dictionaries,
  updateFiles: false,
});

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "en";
    const stored = window.localStorage.getItem(localeStorageKey);
    return isLocale(stored) ? stored : "en";
  });

  useEffect(() => {
    window.localStorage.setItem(localeStorageKey, locale);
    window.document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  const t = useCallback(
    (key: string, values: Record<string, string | number> = {}) => {
      const template = i18n.__({ phrase: key, locale });
      return Object.entries(values).reduce(
        (text, [name, value]) =>
          text.split(`{${name}}`).join(String(value)),
        template,
      );
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "sw";
}
