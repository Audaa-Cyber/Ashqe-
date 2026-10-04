import type { SupabaseClient } from "@supabase/supabase-js"
import { createHash } from "crypto"

export type ExperimentVariant = "control" | "treatment"

function hashBucket(key: string) {
  const hex = createHash("sha256").update(key).digest("hex").slice(0, 8)
  return Number.parseInt(hex, 16) / 0xffffffff
}

export async function createExperiment(
  supabase: SupabaseClient,
  input: {
    userId: string
    hypothesis: string
    variable: string
    control: string
    treatment: string
    successMetric: string
    baseline?: number
    target?: number
  },
) {
  const { data, error } = await supabase.from("ashqe_experiments").insert({
    user_id: input.userId,
    hypothesis: input.hypothesis,
    variable: input.variable,
    control: input.control,
    treatment: input.treatment,
    success_metric: input.successMetric,
    baseline: input.baseline ?? null,
    target: input.target ?? null,
    status: "draft",
  }).select("*").single()
  if (error || !data) throw new Error("experiment_create_failed")
  return data
}

export async function startExperiment(supabase: SupabaseClient, userId: string, experimentId: string) {
  const { data, error } = await supabase.from("ashqe_experiments")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", experimentId).eq("user_id", userId).in("status", ["draft","planned","paused"])
    .select("*").maybeSingle()
  if (error) throw new Error("experiment_start_failed")
  if (!data) throw new Error("experiment_start_conflict")
  return data
}

export async function assignExperimentVariant(
  supabase: SupabaseClient,
  input: { userId: string; experimentId: string; assignmentKey: string },
): Promise<ExperimentVariant> {
  const { data: experiment } = await supabase.from("ashqe_experiments")
    .select("id,status,metadata").eq("id", input.experimentId).eq("user_id", input.userId).maybeSingle()
  if (!experiment) throw new Error("experiment_not_found")
  if (experiment.status !== "running") throw new Error("experiment_not_running")

  const configuredRatio = Number((experiment.metadata as Record<string, unknown> | null)?.treatmentRatio)
  const treatmentRatio = Number.isFinite(configuredRatio) ? Math.max(.05, Math.min(.95, configuredRatio)) : .5
  return hashBucket(input.experimentId + ":" + input.assignmentKey) < treatmentRatio ? "treatment" : "control"
}

export async function recordExperimentObservation(
  supabase: SupabaseClient,
  input: {
    userId: string
    experimentId: string
    assignmentKey: string
    variant: ExperimentVariant
    metricValue: number
    outcomeId?: string
    metadata?: Record<string, unknown>
  },
) {
  const { data: experiment } = await supabase.from("ashqe_experiments")
    .select("id,status").eq("id", input.experimentId).eq("user_id", input.userId).maybeSingle()
  if (!experiment) throw new Error("experiment_not_found")
  if (experiment.status !== "running") throw new Error("experiment_not_running")

  const { data, error } = await supabase.from("ashqe_experiment_observations").upsert({
    experiment_id: input.experimentId,
    outcome_id: input.outcomeId ?? null,
    assignment_key: input.assignmentKey,
    variant: input.variant,
    metric_value: Number.isFinite(input.metricValue) ? input.metricValue : 0,
    metadata: input.metadata ?? {},
  }, { onConflict: "experiment_id,assignment_key" }).select("*").single()
  if (error || !data) throw new Error("experiment_observation_failed")
  await supabase.from("ashqe_experiments").update({
    sample_size: await countExperimentObservations(supabase, input.experimentId),
  }).eq("id", input.experimentId).eq("user_id", input.userId)
  return data
}

async function countExperimentObservations(supabase: SupabaseClient, experimentId: string) {
  const { count } = await supabase.from("ashqe_experiment_observations")
    .select("id", { count: "exact", head: true }).eq("experiment_id", experimentId)
  return count ?? 0
}

export async function evaluateExperiment(
  supabase: SupabaseClient,
  userId: string,
  experimentId: string,
) {
  const { data: experiment } = await supabase.from("ashqe_experiments")
    .select("*").eq("id", experimentId).eq("user_id", userId).maybeSingle()
  if (!experiment) throw new Error("experiment_not_found")

  const { data: observations } = await supabase.from("ashqe_experiment_observations")
    .select("variant,metric_value").eq("experiment_id", experimentId)
  const control = (observations ?? []).filter(o => o.variant === "control").map(o => Number(o.metric_value)).filter(Number.isFinite)
  const treatment = (observations ?? []).filter(o => o.variant === "treatment").map(o => Number(o.metric_value)).filter(Number.isFinite)

  const mean = (values: number[]) => values.length ? values.reduce((a,b)=>a+b,0)/values.length : null
  const controlMean = mean(control)
  const treatmentMean = mean(treatment)
  const relativeLift = controlMean && controlMean !== 0 && treatmentMean !== null
    ? (treatmentMean - controlMean) / Math.abs(controlMean)
    : null
  const minimumSamples = Math.max(10, Number((experiment.metadata as Record<string, unknown> | null)?.minimumSamples) || 20)
  const variance = (values: number[], average: number | null) => {
    if (!average || values.length < 2) return 0
    return values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1)
  }
  const controlVariance = variance(control, controlMean)
  const treatmentVariance = variance(treatment, treatmentMean)
  const standardError = control.length && treatment.length
    ? Math.sqrt((controlVariance / control.length) + (treatmentVariance / treatment.length))
    : null
  const effectSize = relativeLift !== null && standardError && standardError > 0 && controlMean !== null && treatmentMean !== null
    ? (treatmentMean - controlMean) / standardError
    : null
  const decision = control.length >= minimumSamples && treatment.length >= minimumSamples
    ? relativeLift !== null && effectSize !== null && effectSize >= 1.96
      ? "treatment_leading"
      : relativeLift !== null && effectSize !== null && effectSize <= -1.96
        ? "control_leading"
        : "inconclusive"
    : "insufficient_sample"

  return {
    experimentId, controlSamples: control.length, treatmentSamples: treatment.length,
    controlMean, treatmentMean, relativeLift, effectSize, standardError, decision,
  }
}
