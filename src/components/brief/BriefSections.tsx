import { useI18n } from "../../lib/i18n";

export function BriefSections({
  sections,
}: {
  sections: { title: string; items: string[] }[];
}) {
  return (
    <section className="space-y-4">
      {sections.map((section) => (
        <article key={section.title} className="surface rounded-lg p-4 sm:p-5">
          <h2 className="font-bold text-civic-900">{section.title}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}

export function BriefErrorNotice({
  message,
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  const { t } = useI18n();

  if (!message) return null;
  const isConfiguredFailure = message.startsWith("Configured ");

  return (
    <div
      className={`rounded-md border ${isConfiguredFailure ? "border-red-200 bg-red-50" : "border-signal/30 bg-white"} p-3 text-sm leading-6 text-slate-700 ${className}`}
    >
      <p className="font-semibold text-civic-900">
        {isConfiguredFailure ? t("brief.aiError") : t("brief.aiNotice")}
      </p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
