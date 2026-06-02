<!--
Sync Impact Report
Version change: (template placeholders) → 1.0.0
Modified principles: N/A — initial adoption; all principles are new
  - [TEMPLATE] PRINCIPLE_1_NAME → I. Engineering Principles
  - [TEMPLATE] PRINCIPLE_2_NAME → II. AI Usage Rules
  - [TEMPLATE] PRINCIPLE_3_NAME → III. Review Discipline
  - [TEMPLATE] PRINCIPLE_4_NAME → IV. Testing Principles
  - [TEMPLATE] PRINCIPLE_5_NAME → V. Out of Scope Enforcement
  - [TEMPLATE] SECTION_2_NAME → VI. Definition of Done
  - [TEMPLATE] SECTION_3_NAME → VII. Development Workflow & Quality Gates
Added sections: All 7 sections (initial constitution derived from template)
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md → ✅ updated (Constitution Check references new gates)
  - .specify/templates/spec-template.md → ✓ no updates needed
  - .specify/templates/tasks-template.md → ✓ no updates needed
  - .specify/templates/checklist-template.md → ✓ no updates needed
  - .specify/templates/commands/*.md → N/A (directory does not exist)
Follow-up TODOs: None
-->

# Scribble Constitution

## Core Principles

### I. Engineering Principles

Extend the starter application; do not rewrite it.
Prefer minimal changes over broad refactors.
Maintain feature-to-spec traceability.
Keep implementation aligned with approved artifacts.
Every implemented behavior MUST trace to a requirement.

### II. AI Usage Rules

AI MAY assist with discovery, specification, planning, implementation, and review.
AI-generated output MUST remain traceable to requirements.
AI MUST NOT introduce features not present in approved specs.
Assumptions MUST be documented.
Deviations from specifications MUST be documented and approved.

### III. Review Discipline

Spec before plan.
Plan before tasks.
Tasks before implementation.
Quality gates MUST pass before downstream phases.
Contradictions MUST be resolved at the source artifact.

### IV. Testing Principles

Acceptance criteria MUST be observable.
Multi-room isolation MUST be tested.
Validation behavior MUST be tested.
Restart behavior MUST be tested.
Scoring behavior MUST be tested.

### V. Out of Scope Enforcement

The following MUST NOT appear in any spec, plan, task, or implementation:

- **Technical**: WebSockets, real-time sync, databases, persistent storage,
  authentication, user accounts, sessions, deployment, hosting, CI/CD, Docker,
  containerization, additional state management libraries, additional routing
  libraries.
- **Game Features**: Multiple rounds, drawer rotation, round timers, countdown
  timers, speed bonuses, drawer bonuses, custom word packs, random word packs,
  spectator mode, room moderation, kick player, mute player, room passwords,
  invite links.
- **Process**: Rewriting the starter, unjustified top-level dependencies,
  unrelated refactors.

## Definition of Done

A feature is complete only when:
- Acceptance criteria pass
- Quality gates pass
- Traceability exists
- Edge cases are covered
- Behavior matches the specification
- Validation evidence is documented

## Development Workflow & Quality Gates

Follow the prescribed phase order:
1. Discovery — read relevant starter files, document gaps and assumptions.
2. Specify — write or update spec with acceptance criteria.
3. Clarify — resolve ambiguity before planning.
4. Plan — update state model, file-level changes, data flow.
5. Tasks — decompose the plan into ordered, testable work.
6. Implement — complete one meaningful slice at a time.
7. Validate — verify acceptance criteria with two browser tabs.

Each phase MUST complete (quality gates pass) before the next phase begins.
Never skip phases or reorder them.

## Governance

The constitution supersedes all other practices for development rules.
Amendments MUST be documented with the change description, approval, and a
migration plan if applicable.
All reviews MUST verify compliance with this constitution.
Complexity MUST be justified in the Complexity Tracking section of the
implementation plan.
Use AGENTS.md for runtime development guidance.

**Version**: 1.0.0 | **Ratified**: 2026-06-02 | **Last Amended**: 2026-06-02
