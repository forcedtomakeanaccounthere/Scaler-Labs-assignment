/** Read a per-type policy override from a Job (Map or plain object). */
export function getPolicyAction(job, entityType) {
  const policy = job?.policy;
  if (!policy) return undefined;
  if (policy instanceof Map) return policy.get(entityType);
  if (typeof policy === "object") return policy[entityType];
  return undefined;
}

/** Resolve the redaction action for an entity using policy + defaults. */
export function resolveEntityAction(job, entity) {
  if (entity.reviewerAction === "REJECTED") return "KEEP";
  if (
    entity.action &&
    entity.action !== "PENDING_REVIEW" &&
    entity.action !== "MASK" &&
    !getPolicyAction(job, entity.type) &&
    !job?.defaultAction
  ) {
    // Preserve explicit action from a prior review pass when policy unchanged
    return entity.action;
  }
  return getPolicyAction(job, entity.type) || job?.defaultAction || "PSEUDONYMIZE";
}
