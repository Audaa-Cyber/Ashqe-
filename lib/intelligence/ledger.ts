export type DecisionAction =
  | "ignore"
  | "research"
  | "reply"
  | "post"
  | "follow_up"
  | "relationship"
  | "monitor"

export type DecisionInputs = {
  expectedValue: number
  evidenceStrength: number
  confidence: number
  freshness: number
  strategicAlignment: number
  relationshipValue: number
  historicalSuccess: number
  executionCost: number
  risk: number
  uncertainty: number
  duplicatePenalty?: number
}

const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))

export function scoreDecision(input: DecisionInputs) {
  const positive =
    clamp(input.evidenceStrength) *
    0.18 +
    clamp(input.confidence) *
    0.16 +
    clamp(input.freshness) *
    0.12 +
    clamp(input.expectedValue) *
    0.18 +
    clamp(input.strategicAlignment) *
    0.12 +
    clamp(input.relationshipValue) *
    0.08 +
    clamp(input.historicalSuccess) *
    0.10

  const negative =
    clamp(input.executionCost) * 0.07 +
    clamp(input.risk) * 0.12 +
    clamp(input.uncertainty) * 0.08 +
    clamp(input.duplicatePenalty ?? 0) * 0.10

  return Math.max(0, Math.min(1, positive - negative))
}

export function buildOpportunityFingerprint(input: {
  type: string
  topic: string
  entities?: string[]
  authors?: string[]
  intent?: string
  window?: string
}) {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[^a-z0-9:@#\s_-]/g, " ")
      .replace(/\s+/g, " ")
      .trim()

  const entities = [...new Set((input.entities ?? []).map(normalize).filter(Boolean))].sort()
  const authors = [...new Set((input.authors ?? []).map(normalize).filter(Boolean))].sort()

  return [
    normalize(input.type),
    normalize(input.topic),
    normalize(input.intent ?? ""),
    entities.join(","),
    authors.join(","),
    normalize(input.window ?? ""),
  ].join("|")
}

export type EvidenceClassification = "direct" | "derived" | "inferred"
export type OutcomeState = "unknown" | "observed" | "verified" | "attributed" | "contradicted" | "expired"

export type LearningCandidate = {
  hypothesis: string
  observation: string
  evidenceIds: string[]
  outcomeIds: string[]
  confidence: number
  sampleSize: number
}

export function learningConfidence(
  observations: number,
  successes: number,
  prior = 0.5,
  priorWeight = 2,
) {
  const n = Math.max(0, Math.floor(observations))
  const s = Math.max(0, Math.min(n, Math.floor(successes)))
  return (prior * priorWeight + s) / (priorWeight + n)
}

export function classifyFailureForRecovery(reason: string): {
  type: "transient" | "rate_limit" | "authentication" | "permission" | "stale_evidence" | "external_ambiguity" | "invalid_plan" | "verification_failed" | "unsafe" | "unknown"
  retryable: boolean
} {
  const value = reason.toLowerCase()

  if (/rate|429|too many/.test(value)) return { type: "rate_limit", retryable: true }
  if (/token|auth|unauthorized|401/.test(value)) return { type: "authentication", retryable: false }
  if (/permission|forbidden|403|capability/.test(value)) return { type: "permission", retryable: false }
  if (/expired|stale|freshness/.test(value)) return { type: "stale_evidence", retryable: true }
  if (/verify|verification|read.?back/.test(value)) return { type: "verification_failed", retryable: false }
  if (/unsafe|policy|approval|risk/.test(value)) return { type: "unsafe", retryable: false }
  if (/invalid plan|invalid_plan|contract/.test(value)) return { type: "invalid_plan", retryable: false }
  if (/ambiguous|unknown state|external/.test(value)) return { type: "external_ambiguity", retryable: false }
  if (/timeout|network|temporary|fetch failed|503|502/.test(value)) return { type: "transient", retryable: true }

  return { type: "unknown", retryable: false }
}
