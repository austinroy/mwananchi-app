import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AiModelSelector, isProviderConfigured, resolveConfiguredAiSelection, useConfiguredAiProviders } from "../../components/ai/AiModelSelector";
import { useAuth } from "../../lib/auth";
import { extractPdfText } from "../../lib/pdf";
import { createBrief } from "../../lib/mockApi";
import { readAiDefaults } from "../../lib/aiSettings";
import { categories } from "../../lib/civicOptions";
import type { BriefCategory, NewBriefInput, AiModelSelection } from "../../lib/types";
import { validateBriefCategory, validateBriefTitle, validateDocumentText, validateJurisdiction } from "../../lib/validation";

export function NewBriefPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);
  const [aiSelection, setAiSelection] = useState<AiModelSelection>(() =>
    readAiDefaults(),
  );
  const configured = useConfiguredAiProviders();
  const isAiReady =
    isProviderConfigured(aiSelection.provider, configured) &&
    Boolean(aiSelection.model);
  const mutation = useMutation({
    mutationFn: (input: NewBriefInput) =>
      createBrief(
        input,
        auth.user?.id,
        resolveConfiguredAiSelection(aiSelection, configured),
      ),
    onSuccess: async (brief) => {
      await queryClient.invalidateQueries({
        queryKey: ["briefs", auth.user?.id],
      });
      await navigate({ to: "/briefs/$briefId", params: { briefId: brief.id } });
    },
  });

  const form = useForm({
    defaultValues: {
      title: "",
      category: "Budget" as BriefCategory,
      jurisdiction: "Kenya",
      documentText: "",
    },
    onSubmit: ({ value }) => mutation.mutate(value as NewBriefInput),
  });

  return (
    <main className="page-shell max-w-4xl">
      <h1 className="text-3xl font-bold sm:text-4xl">Create a civic brief</h1>
      <p className="mt-2 text-slate-600">
        Paste a policy, bill, public notice, or civic document.
      </p>
      <form
        className="mt-6 surface rounded-lg p-4 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <form.Field
            name="title"
            validators={{ onChange: ({ value }) => validateBriefTitle(value) }}
          >
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Document title</span>
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {field.state.meta.errors?.[0] ? (
                  <p className="mt-1 text-xs text-red-700">
                    {field.state.meta.errors[0]}
                  </p>
                ) : null}
              </label>
            )}
          </form.Field>
          <form.Field
            name="jurisdiction"
            validators={{ onChange: ({ value }) => validateJurisdiction(value) }}
          >
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Jurisdiction</span>
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {field.state.meta.errors?.[0] ? (
                  <p className="mt-1 text-xs text-red-700">
                    {field.state.meta.errors[0]}
                  </p>
                ) : null}
              </label>
            )}
          </form.Field>
          <form.Field
            name="category"
            validators={{ onChange: ({ value }) => validateBriefCategory(value) }}
          >
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Category</span>
                <select
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) =>
                    field.handleChange(event.target.value as BriefCategory)
                  }
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
                {field.state.meta.errors?.[0] ? (
                  <p className="mt-1 text-xs text-red-700">
                    {field.state.meta.errors[0]}
                  </p>
                ) : null}
              </label>
            )}
          </form.Field>
        </div>
        <form.Field
          name="documentText"
          validators={{ onChange: ({ value }) => validateDocumentText(value) }}
        >
          {(field) => (
            <div className="mt-5">
              <label className="block">
                <span className="text-sm font-semibold">Upload PDF</span>
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 bg-white px-3 py-2 text-sm"
                  type="file"
                  accept="application/pdf"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setPdfStatus("Extracting text from PDF...");
                    try {
                      const result = await extractPdfText(file, (progress) =>
                        setPdfStatus(progress.message),
                      );
                      field.handleChange(result.text);
                      setPdfStatus(
                        result.method === "ocr"
                          ? `OCR extracted text from ${file.name}. Review it before generating the brief.`
                          : `Extracted text from ${file.name}. Review it before generating the brief.`,
                      );
                    } catch (error) {
                      setPdfStatus(
                        error instanceof Error
                          ? error.message
                          : "Could not extract text from this PDF.",
                      );
                    }
                  }}
                />
              </label>
              {pdfStatus ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {pdfStatus}
                </p>
              ) : null}
              <label className="mt-5 block">
                <span className="text-sm font-semibold">Document text</span>
                <textarea
                  className="mt-2 min-h-56 w-full rounded-md border border-civic-100 px-3 py-2 leading-7 sm:min-h-64"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
                {field.state.meta.errors?.[0] ? (
                  <p className="mt-1 text-xs text-red-700">
                    {field.state.meta.errors[0]}
                  </p>
                ) : null}
              </label>
            </div>
          )}
        </form.Field>
        <div className="mt-5 rounded-md border border-civic-100 bg-civic-50/50 p-4">
          <p className="mb-3 text-sm font-semibold text-ink">AI provider</p>
          <AiModelSelector selection={aiSelection} onChange={setAiSelection} />
        </div>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {isAiReady
              ? "MVP note: AI responses should still be checked against official sources."
              : "Configure the selected AI provider before generating a brief."}
          </p>
          <button
            className="btn-primary w-full sm:w-auto"
            disabled={mutation.isPending || !isAiReady}
            type="submit"
          >
            <Sparkles size={16} />
            {mutation.isPending ? "Generating..." : "Generate brief"}
          </button>
        </div>
      </form>
    </main>
  );
}
