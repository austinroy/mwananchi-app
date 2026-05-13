import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../lib/auth";
import {
  deleteBrief,
  getBrief,
  getSharedBrief,
  updateBriefVisibility,
} from "../../lib/mockApi";
import { BriefChatPanel } from "./BriefChatPanel";
import { BriefErrorNotice, BriefSections } from "./BriefSections";
import { BriefHeaderActions } from "./BriefHeaderActions";
import { BriefTabs } from "./BriefTabs";
import { FileText } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import type { CivicBrief } from "../../lib/types";

export function BriefPage({ briefId }: { briefId: string }) {
  const { locale, t } = useI18n();
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

  const {
    data: brief,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["brief", briefId],
    queryFn: () => getBrief(briefId),
  });
  const visibilityMutation = useMutation({
    mutationFn: (nextVisibility: "private" | "unlisted" | "public") =>
      updateBriefVisibility(briefId, nextVisibility),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["brief", briefId] });
      await queryClient.invalidateQueries({
        queryKey: ["briefs", auth.user?.id],
      });
      if (result.visibility === "unlisted" || result.visibility === "public") {
        const absoluteUrl = new URL(
          `/share/${briefId}`,
          window.location.origin,
        ).toString();
        await navigator.clipboard?.writeText(absoluteUrl);
        toast.success(`Link copied! Brief is now ${result.visibility}`);
      } else {
        toast.success(t("brief.privateToast"));
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("brief.updateVisibilityError"),
      );
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteBrief(briefId, auth.user?.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["briefs", auth.user?.id],
      });
      await queryClient.removeQueries({ queryKey: ["brief", briefId] });
      await navigate({ to: "/dashboard" });
      toast.success(t("brief.deleted"));
    },
    onError: (error) =>
      setDeleteStatus(
        error instanceof Error ? error.message : t("brief.deleteError"),
      ),
  });

  if (isLoading) {
    return <main className="page-shell">{t("brief.loading")}</main>;
  }

  if (error instanceof Error) {
    return (
      <main className="page-shell">
        <div className="surface rounded-lg p-6">
          <p className="text-sm font-semibold text-civic-700">
            {error.message.includes("Authentication required")
              ? t("brief.private")
              : t("brief.unavailable")}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-ink">
            {error.message.includes("Authentication required")
              ? t("brief.signInTitle")
              : t("brief.loadErrorTitle")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
            {error.message.includes("Authentication required")
              ? t("brief.privateCopy")
              : error.message}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/login" className="btn-primary">
              {t("nav.signIn")}
            </Link>
            <Link to="/briefs/new" className="btn-secondary">
              {t("brief.createBrief")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!brief) {
    return <main className="page-shell">{t("brief.loading")}</main>;
  }
  const displayBrief = getLocalizedSampleBrief(brief, locale);
  const isSampleBrief = brief.id === "brief-sample-budget";

  return (
    <main className="page-shell pb-6 lg:pb-[32rem]">
      <div className="mb-6 min-w-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-civic-700">
            {displayBrief.category} · {displayBrief.jurisdiction}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {displayBrief.title}
          </h1>
        </div>
      </div>
      {deleteStatus ? (
        <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {deleteStatus}
        </p>
      ) : null}
      <BriefTabs briefId={briefId} activeTab="brief" />
      <div className="mb-5">
        <BriefHeaderActions
          briefId={briefId}
          visibility={brief.visibility}
          isVisibilityPending={visibilityMutation.isPending}
          isDeletePending={deleteMutation.isPending}
          isSampleBrief={isSampleBrief}
          onToggleVisibility={(nextVisibility) =>
            visibilityMutation.mutate(nextVisibility)
          }
          onCopyShareLink={async () => {
            const absoluteUrl = new URL(
              `/share/${brief.id}`,
              window.location.origin,
            ).toString();
            await navigator.clipboard?.writeText(absoluteUrl);
            toast.success(t("brief.linkCopied"));
          }}
          onDelete={() => {
            setDeleteStatus(null);
            if (window.confirm(t("brief.deleteConfirm"))) {
              deleteMutation.mutate();
            }
          }}
        />
      </div>
      <BriefErrorNotice message={brief.aiError} className="mb-5" />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <BriefSections
          sections={[
            { title: t("brief.summary"), items: [displayBrief.summary] },
            { title: t("brief.keyPoints"), items: displayBrief.keyPoints },
            { title: t("brief.affected"), items: displayBrief.affectedGroups },
            { title: t("brief.concerns"), items: displayBrief.concerns },
            {
              title: t("brief.questions"),
              items: displayBrief.citizenQuestions,
            },
            { title: t("brief.nextSteps"), items: displayBrief.nextSteps },
          ]}
        />
        <BriefChatPanel briefId={briefId} />
      </div>
    </main>
  );
}

export function SharedBriefPage({ briefId }: { briefId: string }) {
  const { locale, t } = useI18n();
  const { data: brief, isLoading } = useQuery({
    queryKey: ["shared-brief", briefId],
    queryFn: () => getSharedBrief(briefId),
  });

  if (isLoading)
    return <main className="page-shell">{t("brief.sharedLoading")}</main>;
  if (!brief)
    return <main className="page-shell">{t("brief.sharedNotFound")}</main>;
  const displayBrief = getLocalizedSampleBrief(brief, locale);

  return (
    <main className="page-shell pb-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-civic-700">
            {t("brief.sharedLabel")} · {displayBrief.category} ·{" "}
            {displayBrief.jurisdiction}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {displayBrief.title}
          </h1>
        </div>
        <Link to="/briefs/new" className="btn-primary w-full sm:w-auto">
          <FileText size={16} />
          {t("landing.createOwn")}
        </Link>
      </div>
      <BriefSections
        sections={[
          { title: t("brief.summary"), items: [displayBrief.summary] },
          { title: t("brief.keyPoints"), items: displayBrief.keyPoints },
          { title: t("brief.affected"), items: displayBrief.affectedGroups },
          { title: t("brief.concerns"), items: displayBrief.concerns },
          {
            title: t("brief.questions"),
            items: displayBrief.citizenQuestions,
          },
          { title: t("brief.nextSteps"), items: displayBrief.nextSteps },
        ]}
      />
    </main>
  );
}

function getLocalizedSampleBrief(
  brief: CivicBrief,
  locale: string,
): CivicBrief {
  if (brief.id !== "brief-sample-budget") return brief;

  const samples: Record<string, Partial<CivicBrief>> = {
    ar: {
      title: "إشعار عام بميزانية المقاطعة",
      jurisdiction: "مقاطعة نيروبي",
      summary:
        "يدعو الإشعار السكان إلى التعليق على أولويات الميزانية المقترحة. أهم القضايا العامة هي تقديم الخدمات، وتوزيع الموارد على مستوى الأحياء، ومدى سهولة تتبع خطط الإنفاق من قبل المواطنين.",
      keyPoints: [
        "لدى السكان فترة محددة للمشاركة العامة.",
        "تؤثر المقترحات في خدمات المقاطعة مثل الطرق والعيادات والمدارس والنظافة.",
        "ينبغي مقارنة تفاصيل الميزانية بالمخصصات السابقة والإنفاق الفعلي.",
      ],
      affectedGroups: [
        "السكان",
        "ممثلو الأحياء",
        "الشركات الصغيرة",
        "منظمات المجتمع",
      ],
      concerns: [
        "قد لا يشرح الإشعار المفاضلات بلغة واضحة.",
        "قد لا يملك بعض السكان وقتًا أو وصولًا كافيًا للمشاركة.",
      ],
      citizenQuestions: [
        "أي أحياء تحصل على أكبر زيادات أو تخفيضات؟",
        "كيف سيرى السكان ما إذا صُرفت الأموال كما وُعد؟",
        "ما الخدمات التي ستتأخر إذا أُقرت هذه الميزانية؟",
      ],
      nextSteps: [
        "حضّر تعليقًا عامًا قصيرًا قبل الموعد النهائي.",
        "اطلب من ممثل الحي أو مكتب المقاطعة تفاصيل المخصصات حسب الحي.",
        "شارك ملخصًا بلغة واضحة مع مجموعتك المجتمعية.",
      ],
    },
    fr: {
      title: "Avis public sur le budget du comté",
      jurisdiction: "Comté de Nairobi",
      summary:
        "L’avis invite les résidents à commenter les priorités budgétaires proposées. Les principaux enjeux publics concernent la prestation des services, la répartition par quartier et la facilité de suivi des dépenses.",
      keyPoints: [
        "Les résidents disposent d’une période définie de participation publique.",
        "La proposition touche les routes, les cliniques, les écoles et l’assainissement.",
        "Les détails budgétaires devraient être comparés aux allocations précédentes et aux dépenses réelles.",
      ],
      affectedGroups: [
        "Résidents",
        "Représentants de quartier",
        "Petites entreprises",
        "Organisations communautaires",
      ],
      concerns: [
        "L’avis peut ne pas expliquer les arbitrages en langage clair.",
        "Certains résidents peuvent manquer de temps ou d’accès pour participer.",
      ],
      citizenQuestions: [
        "Quels quartiers reçoivent les plus fortes hausses ou baisses ?",
        "Comment les résidents verront-ils si l’argent a été dépensé comme promis ?",
        "Quels services seront retardés si ce budget est approuvé ?",
      ],
      nextSteps: [
        "Préparez un court commentaire public avant la date limite.",
        "Demandez à votre représentant ou au bureau du comté les allocations par quartier.",
        "Partagez un résumé en langage clair avec votre groupe communautaire.",
      ],
    },
    pt: {
      title: "Aviso Público do Orçamento do Condado",
      jurisdiction: "Condado de Nairobi",
      summary:
        "O aviso convida moradores a comentar as prioridades orçamentárias propostas. As principais questões públicas são a prestação de serviços, a alocação por bairro e se os planos de gastos são fáceis de acompanhar.",
      keyPoints: [
        "Os moradores têm uma janela definida de participação pública.",
        "A proposta afeta serviços como estradas, clínicas, escolas e saneamento.",
        "Os detalhes do orçamento devem ser comparados com alocações anteriores e gastos reais.",
      ],
      affectedGroups: [
        "Moradores",
        "Representantes locais",
        "Pequenas empresas",
        "Organizações comunitárias",
      ],
      concerns: [
        "O aviso pode não explicar as escolhas difíceis em linguagem clara.",
        "Alguns moradores podem não ter tempo ou acesso suficiente para participar.",
      ],
      citizenQuestions: [
        "Quais bairros recebem os maiores aumentos ou cortes?",
        "Como os moradores verão se o dinheiro foi gasto como prometido?",
        "Quais serviços serão atrasados se este orçamento for aprovado?",
      ],
      nextSteps: [
        "Prepare um comentário público curto antes do prazo.",
        "Peça ao representante local ou ao escritório do condado detalhes por bairro.",
        "Compartilhe um resumo em linguagem clara com seu grupo comunitário.",
      ],
    },
    sw: {
      title: "Tangazo la Umma la Bajeti ya Kaunti",
      jurisdiction: "Kaunti ya Nairobi",
      summary:
        "Tangazo linawaalika wakazi kutoa maoni kuhusu vipaumbele vya bajeti vilivyopendekezwa. Masuala muhimu kwa umma ni utoaji wa huduma, mgawanyo katika ngazi ya wadi, na kama mipango ya matumizi ni rahisi kwa wananchi kufuatilia.",
      keyPoints: [
        "Wakazi wana kipindi maalum cha kushiriki kutoa maoni.",
        "Pendekezo linaathiri huduma za kaunti kama barabara, kliniki, shule, na usafi.",
        "Maelezo ya bajeti yanapaswa kulinganishwa na mgao wa awali na matumizi halisi.",
      ],
      affectedGroups: [
        "Wakazi",
        "Wawakilishi wa wadi",
        "Biashara ndogo",
        "Mashirika ya jamii",
      ],
      concerns: [
        "Tangazo huenda halielezi maamuzi magumu kwa lugha rahisi.",
        "Baadhi ya wakazi huenda hawana muda au njia ya kushiriki kikamilifu.",
      ],
      citizenQuestions: [
        "Ni wadi zipi zinapata ongezeko au upungufu mkubwa zaidi?",
        "Wakazi wataonaje kama fedha zimetumika kama ilivyoahidiwa?",
        "Ni huduma zipi zitacheleweshwa kama bajeti hii itaidhinishwa?",
      ],
      nextSteps: [
        "Andaa maoni mafupi ya umma kabla ya tarehe ya mwisho.",
        "Muulize MCA au ofisi ya kaunti maelezo ya mgao kwa kila wadi.",
        "Shiriki muhtasari wa lugha rahisi na kikundi chako cha jamii.",
      ],
    },
  };

  return { ...brief, ...(samples[locale] ?? {}) };
}
