// src/utils/workflow.js
//
// MANUAL actions (require a human decision):
//   1. Allocate  — lead assigns a task to a member
//   2. Approve   — lead/head approves submitted work
//   3. Reject    — lead/head rejects with a comment
//   4. Upload    — anyone uploads a file attachment
//
// AUTOMATIC transitions (happen instantly on submit):
//   - Member submits content  → card moves to Content Lead for review
//   - Content Lead approves   → card auto-routes to Design Lead or Video Lead (based on task type)
//   - Design/Video Lead approves → card auto-routes to Creative Head
//   - Creative Head approves  → card delivered back to creator
//   - Any rejection           → card returns to assignee's in-progress stage

import { ROLES, TASK_TYPES, ALLOCATOR_ROLES } from "./constants";

/**
 * Returns what manual actions the current user can perform on this task.
 * Everything else is automatic.
 */
export function getAvailableActions(task, currentUser) {
  if (!task || !currentUser) return {};
  const { stage, type, assignedBy } = task;
  const { id, role } = currentUser;

  const actions = {
    canAllocate:  false,   // assign task to a team member
    canApprove:   false,   // approve submitted work
    canReject:    false,   // reject with comment
    canComment:   true,    // everyone can comment
  };

  // ── EXTERNAL FLOW ────────────────────────────────────────────────
  if (type === TASK_TYPES.EXTERNAL) {
    if (stage === "ext_initiated" && ALLOCATOR_ROLES.includes(role)) {
      actions.canAllocate = true;
    }
    if (stage === "ext_review" && id === assignedBy) {
      actions.canApprove = true;
      actions.canReject  = true;
    }
    return actions;
  }

  // ── PM FLOW ───────────────────────────────────────────────────────
  // Allocation
  if (stage === "initiated" && role === ROLES.CONTENT_LEAD) {
    actions.canAllocate = true;
  }

  // Content Lead reviews submitted content
  if (stage === "content_review" && role === ROLES.CONTENT_LEAD) {
    actions.canApprove = true;
    actions.canReject  = true;
  }

  // Design Lead reviews submitted design
  if (stage === "design_review" && role === ROLES.DESIGN_LEAD) {
    actions.canApprove = true;
    actions.canReject  = true;
  }

  // Video Lead reviews submitted video
  if (stage === "video_review" && role === ROLES.VIDEO_LEAD) {
    actions.canApprove = true;
    actions.canReject  = true;
  }

  // Creative Head final review
  if (stage === "creative_review" && role === ROLES.CREATIVE_HEAD) {
    actions.canApprove = true;
    actions.canReject  = true;
  }

  return actions;
}

/**
 * AUTO: next stage when a member submits their work.
 * Called automatically — no human decision required.
 */
export function getNextStageOnSubmit(task) {
  const map = {
    content_in_progress: "content_review",
    design_in_progress:  "design_review",
    video_in_progress:   "video_review",
    ext_in_progress:     "ext_review",
  };
  return map[task.stage] || null;
}

/**
 * AUTO: next stage after an approval.
 * Content approval auto-routes to Design or Video based on task type.
 */
export function getNextStageOnApprove(task) {
  const { stage, type } = task;
  if (type === TASK_TYPES.EXTERNAL) return "ext_delivered";
  const map = {
    content_review: type === TASK_TYPES.PM_CONTENT_DESIGN ? "design_assigned" : "video_assigned",
    design_review:  "creative_review",
    video_review:   "creative_review",
    creative_review: "delivered",
  };
  return map[stage] || null;
}

/**
 * AUTO: stage to revert to on rejection (card goes back to assignee).
 */
export function getNextStageOnReject(task) {
  const { stage, type } = task;
  const map = {
    content_review:  "content_in_progress",
    design_review:   "design_in_progress",
    video_review:    "video_in_progress",
    creative_review: type === TASK_TYPES.PM_CONTENT_DESIGN ? "design_in_progress" : "video_in_progress",
    ext_review:      "ext_in_progress",
  };
  return map[stage] || null;
}

/**
 * AUTO: stage to move to when a task is assigned.
 * Goes straight to in_progress — no intermediate "assigned" limbo.
 */
export function getNextStageOnAllocate(task) {
  const map = {
    initiated:      "content_in_progress",
    ext_initiated:  "ext_in_progress",
    // After content approval, Design/Video Lead allocates to a member
    design_assigned: "design_in_progress",
    video_assigned:  "video_in_progress",
  };
  return map[task.stage] || null;
}

/**
 * Returns roles that can be assigned at the current stage.
 */
export function getAssignableRoles(task) {
  const { stage, type } = task;
  if (type === TASK_TYPES.EXTERNAL) {
    return [
      ROLES.CONTENT_MEMBER, ROLES.CONTENT_LEAD,
      ROLES.DESIGN_MEMBER,  ROLES.DESIGN_LEAD,
      ROLES.VIDEO_MEMBER,   ROLES.VIDEO_LEAD,
      ROLES.SEO_MEMBER,     ROLES.SEO_LEAD,
      ROLES.SOCIAL_MEDIA_MEMBER, ROLES.SOCIAL_MEDIA_LEAD,
      ROLES.CREATIVE_HEAD,  ROLES.ASSISTANT_MANAGER, ROLES.AVP,
    ];
  }
  if (stage === "initiated")       return [ROLES.CONTENT_MEMBER, ROLES.CONTENT_LEAD];
  if (stage === "design_assigned") return [ROLES.DESIGN_MEMBER,  ROLES.DESIGN_LEAD];
  if (stage === "video_assigned")  return [ROLES.VIDEO_MEMBER,   ROLES.VIDEO_LEAD];
  return [];
}
