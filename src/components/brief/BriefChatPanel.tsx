import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronUp, MessageSquare, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FormattedAiText } from "../FormattedAiText";
import {
  clearChatMessages,
  getChatMessages,
  sendChatMessage,
} from "../../lib/mockApi";
import { readAiDefaults } from "../../lib/aiSettings";
import { useI18n } from "../../lib/i18n";

export function BriefChatPanel({ briefId }: { briefId: string }) {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const aiDefaults = readAiDefaults();
  const isAiReady = Boolean(aiDefaults.provider && aiDefaults.model);
  const { data = [] } = useQuery({
    queryKey: ["brief-chat", briefId],
    queryFn: () => getChatMessages(briefId),
  });
  const mutation = useMutation({
    mutationFn: (content: string) =>
      sendChatMessage(briefId, content, { ...aiDefaults, language: locale }),
    onMutate: (content) => setPendingMessage(content),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["brief-chat", briefId] }),
    onSettled: () => setPendingMessage(null),
  });
  const clearMutation = useMutation({
    mutationFn: () => clearChatMessages(briefId),
    onSuccess: async () => {
      setClearError(null);
      queryClient.setQueryData(["brief-chat", briefId], []);
      await queryClient.invalidateQueries({
        queryKey: ["brief-chat", briefId],
      });
    },
    onError: (error) =>
      setClearError(
        error instanceof Error ? error.message : t("chat.clearError"),
      ),
  });
  const form = useForm({
    defaultValues: { message: "" },
    onSubmit: ({ value, formApi }) => {
      if (!value.message.trim()) return;
      mutation.mutate(value.message);
      formApi.reset();
    },
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsCollapsed(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {isCollapsed ? (
        <button
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border border-white/45 bg-white/65 px-3 py-2 text-xs font-semibold text-civic-800 shadow-lg backdrop-blur-xl"
          type="button"
          aria-label={t("chat.open")}
          onClick={() => setIsCollapsed(false)}
        >
          <MessageSquare size={14} />
          {t("chat.label")}
        </button>
      ) : null}
      <aside
        className={[
          "surface fixed right-0 top-0 z-40 flex h-[100svh] w-[min(92vw,420px)] flex-col overflow-hidden border-l border-white/45 bg-white/60 shadow-[-12px_0_32px_rgba(7,58,40,0.16)] transition-transform duration-300",
          "lg:top-auto lg:right-6 lg:bottom-6 lg:h-[min(78vh,720px)] lg:w-[460px] lg:rounded-lg lg:border lg:border-b-0 lg:shadow-[0_-12px_32px_rgba(7,58,40,0.16)]",
          isCollapsed
            ? "translate-x-full lg:translate-x-0 lg:translate-y-full lg:opacity-0 lg:pointer-events-none"
            : "translate-x-0 lg:translate-y-0",
        ].join(" ")}
      >
        <div className="border-b border-civic-100 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-bold">
              <MessageSquare size={18} />
              {t("chat.title")}
            </h2>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary min-h-9 px-3 py-1.5 text-xs"
                type="button"
                aria-label={isCollapsed ? t("chat.expand") : t("chat.collapse")}
                onClick={() => setIsCollapsed((value) => !value)}
              >
                {isCollapsed ? <ChevronUp size={16} /> : <X size={16} />}
              </button>
              <button
                className="btn-secondary min-h-9 px-3 py-1.5 text-xs"
                type="button"
                disabled={!data.length || clearMutation.isPending}
                onClick={() => {
                  setClearError(null);
                  if (window.confirm(t("chat.clearConfirm"))) {
                    clearMutation.mutate();
                  }
                }}
              >
                {clearMutation.isPending ? t("chat.clearing") : t("chat.clear")}
              </button>
            </div>
          </div>
        </div>
        {isCollapsed ? null : (
          <>
            <div className="border-b border-civic-100 px-4 pb-3 pt-4 text-sm leading-6 text-slate-700">
              <p className="font-semibold text-ink">{t("chat.aiModel")}</p>
              <p className="mt-1">
                {aiDefaults.provider && aiDefaults.model
                  ? `${aiDefaults.provider} · ${aiDefaults.model}`
                  : t("chat.aiNotReady")}
              </p>
            </div>
            {clearError ? (
              <p className="mx-4 mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-700">
                {clearError}
              </p>
            ) : null}
            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto p-3 sm:p-4">
              {data.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-4 rounded-md bg-civic-700 p-3 text-sm leading-6 text-white sm:ml-8"
                      : "mr-4 rounded-md border border-white/45 bg-white/50 p-3 text-sm leading-6 text-slate-700 backdrop-blur-xl sm:mr-8"
                  }
                >
                  {message.role === "assistant" ? (
                    <FormattedAiText content={message.content} />
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              ))}
              {pendingMessage ? (
                <>
                  <div className="ml-4 rounded-md bg-civic-700 p-3 text-sm leading-6 text-white sm:ml-8">
                    <p>{pendingMessage}</p>
                  </div>
                  <div className="mr-4 inline-flex rounded-md border border-white/45 bg-white/50 p-3 text-sm leading-6 text-slate-700 backdrop-blur-xl sm:mr-8">
                    <span
                      className="typing-dots"
                      aria-label={t("chat.processing")}
                    >
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                </>
              ) : null}
            </div>
            <form
              className="sticky bottom-0 border-t border-white/45 bg-white/45 p-4 backdrop-blur-xl"
              onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
              }}
            >
              <form.Field name="message">
                {(field) => (
                  <textarea
                    className="min-h-24 w-full rounded-md border border-white/50 bg-white/55 p-3 text-sm leading-6 outline-none backdrop-blur-xl focus:border-civic-500 focus:ring-2 focus:ring-civic-100"
                    placeholder={t("chat.placeholder")}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") {
                        return;
                      }

                      if (event.metaKey || event.ctrlKey) {
                        const textarea = event.currentTarget;
                        const start =
                          textarea.selectionStart ?? textarea.value.length;
                        const end =
                          textarea.selectionEnd ?? textarea.value.length;
                        const nextValue =
                          textarea.value.slice(0, start) +
                          "\n" +
                          textarea.value.slice(end);

                        event.preventDefault();
                        field.handleChange(nextValue);
                        window.requestAnimationFrame(() => {
                          textarea.selectionStart = start + 1;
                          textarea.selectionEnd = start + 1;
                          textarea.focus();
                        });
                        return;
                      }

                      event.preventDefault();
                      void form.handleSubmit();
                    }}
                  />
                )}
              </form.Field>
              {!isAiReady ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t("chat.configureAi")}
                </p>
              ) : null}
              <button
                className="btn-primary mt-3 w-full"
                disabled={mutation.isPending || !isAiReady}
                type="submit"
              >
                {t("chat.send")}
              </button>
            </form>
          </>
        )}
      </aside>
    </>
  );
}
