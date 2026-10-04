-- Intelligence OS data invariants. Existing authority/RLS remains unchanged.

-- Stronger numeric invariants for confidence/uncertainty and bounded ranking inputs.
alter table public.ashqe_evidence
  add constraint ashqe_evidence_confidence_range check (confidence >= 0 and confidence <= 1),
  add constraint ashqe_evidence_uncertainty_range check (uncertainty >= 0 and uncertainty <= 1),
  add constraint ashqe_evidence_provider_agreement_range check (provider_agreement >= 0 and provider_agreement <= 1);

alter table public.ashqe_opportunities
  add constraint ashqe_opportunities_confidence_range check (confidence >= 0 and confidence <= 1),
  add constraint ashqe_opportunities_freshness_range check (freshness >= 0 and freshness <= 1),
  add constraint ashqe_opportunities_urgency_range check (urgency between 0 and 10);

alter table public.ashqe_decisions
  add constraint ashqe_decisions_score_range check (score >= 0 and score <= 1),
  add constraint ashqe_decisions_inputs_range check (
    expected_value between 0 and 1 and evidence_strength between 0 and 1 and
    confidence between 0 and 1 and freshness between 0 and 1 and
    strategic_alignment between 0 and 1 and relationship_value between 0 and 1 and
    historical_success between 0 and 1 and execution_cost between 0 and 1 and
    risk between 0 and 1 and uncertainty between 0 and 1
  );

alter table public.ashqe_verifications
  add constraint ashqe_verifications_confidence_range check (confidence >= 0 and confidence <= 1);

alter table public.ashqe_outcomes
  add constraint ashqe_outcomes_confidence_range check (confidence >= 0 and confidence <= 1);

alter table public.ashqe_learning
  add constraint ashqe_learning_confidence_range check (confidence >= 0 and confidence <= 1),
  add constraint ashqe_learning_sample_size_nonnegative check (sample_size >= 0);
