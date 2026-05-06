import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { FormattedAiText } from "../FormattedAiText";
import { generateAction, getBrief } from "../../lib/mockApi";
import { readAiDefaults } from "../../lib/aiSettings";
import type { CivicActionInput } from "../../lib/types";

const actionTypes: CivicActionInput["actionType"][] = [
  "email",
  "petition",
  "public_comment",
  "whatsapp_summary",
  "talking_points",
];

const actionTones: CivicActionInput["tone"][] = [
  "Respectful",
  "Firm",
  "Youth-friendly",
  "Professional",
];

export function BriefActionPage({ briefId }: { briefId: string }) {
  const { data: brief } = useQuery({
    queryKey: ["brief", briefId],
    queryFn: () => getBrief(briefId),
  });
  const mutation = useMutation({
    mutationFn: (input: CivicActionInput) => generateAction(briefId, input),
  });
  const aiDefaults = readAiDefaults();
  const isAiReady = Boolean(aiDefaults.provider && aiDefaults.model);
  const form = useForm({
    defaultValues: {
      actionType: "email" as CivicActionInput["actionType"],
      tone: "Respectful" as CivicActionInput["tone"],
      audience: "County official",
      extraContext: "",
    },
    onSubmit: ({ value }) =>
      mutation.mutate({
        ...value,
        ai: aiDefaults,
      }),
  });

  return (
    <main className="page-shell max-w-5xl">
      <Link
        to="/briefs/$briefId"
        params={{ briefId }}
        className="text-sm font-semibold text-civic-700"
      >
        Back to brief
      </Link>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
        Generate civic action
      </h1>
      <p className="mt-2 text-slate-600">
        {brief?.title ?? "Brief"} · choose a format and audience.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form
          className="surface rounded-lg p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="rounded-md border border-civic-100 bg-civic-50/70 p-4 text-sm leading-6 text-slate-700">
            <p className="font-semibold text-ink">AI model</p>
            <p className="mt-1">
              {aiDefaults.provider && aiDefaults.model
                ? `${aiDefaults.provider} · ${aiDefaults.model}`
                : "Configure your preferred AI model in Account before drafting."}
            </p>
          </div>
          <form.Field name="actionType">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Action type</span>
                <select
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) =>
                    field.handleChange(event.target.value as CivicActionInput["actionType"])
                  }
                >
                  {actionTypes.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </form.Field>
          <form.Field name="tone">
            {(field) => (
              <label className="mt-4 block">
                <span className="text-sm font-semibold">Tone</span>
                <select
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) =>
                    field.handleChange(event.target.value as CivicActionInput["tone"])
                  }
                >
                  {actionTones.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </form.Field>
          <form.Field name="audience">
            {(field) => (
              <label className="mt-4 block">
                <span className="text-sm font-semibold">Audience</span>
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="extraContext">
            {(field) => (
              <label className="mt-4 block">
                <span className="text-sm font-semibold">Extra context</span>
                <textarea
                  className="mt-2 min-h-28 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </label>
            )}
          </form.Field>
          <button
            className="btn-primary mt-5 w-full"
            disabled={mutation.isPending || !isAiReady}
            type="submit"
          >
            <Sparkles size={16} />
            {mutation.isPending ? "Drafting..." : "Draft action"}
          </button>
        </form>
        <section className="surface rounded-lg p-4 sm:p-5">
          <h2 className="text-xl font-bold text-ink">Draft preview</h2>
          {mutation.data ? (
            <div className="mt-3 text-sm leading-6 text-slate-700">
              <FormattedAiText content={mutation.data.content} />
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your civic action draft will appear here.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
