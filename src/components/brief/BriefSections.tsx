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
  message?: unknown;
  className?: string;
}) {
  const { t } = useI18n();

  if (!message) return null;
  const messageText = formatNoticeMessage(message);
  const isConfiguredFailure = messageText.startsWith("Configured ");

  return (
    <div
      className={`rounded-md border ${isConfiguredFailure ? "border-red-200 bg-red-50" : "border-signal/30 bg-white/55 backdrop-blur-xl"} p-3 text-sm leading-6 text-slate-700 ${className}`}
    >
      <p className="font-semibold text-civic-900">
        {isConfiguredFailure ? t("brief.aiError") : t("brief.aiNotice")}
      </p>
      <p className="mt-1">{messageText}</p>
    </div>
  );
}

function formatNoticeMessage(message: unknown) {
  if (typeof message === "string") {
    return message === "[object Object]"
      ? "The AI provider returned a notice that could not be displayed."
      : message;
  }

  if (message instanceof Error) return message.message;

  if (message && typeof message === "object") {
    const payload = message as Record<string, unknown>;
    const text = extractNoticeText(
      payload.message ?? payload.error ?? payload.detail ?? payload.description,
    );
    if (text) return text;

    try {
      return JSON.stringify(payload);
    } catch {
      return "The AI provider returned a notice that could not be displayed.";
    }
  }

  return String(message);
}

function extractNoticeText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (value && typeof value === "object") {
    const payload = value as Record<string, unknown>;
    return extractNoticeText(
      payload.message ?? payload.error ?? payload.detail ?? payload.description,
    );
  }
  return "";
}
