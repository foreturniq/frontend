// Clerk role keys. Managers (org:admin) run menu, settings and refunds;
// staff (org:member) work the order queue.
export const ROLE_MANAGER = "org:admin";

// Admins of this org are Foreturn IQ staff: /admin and support for any course.
export const INTERNAL_ORG_ID = process.env.NEXT_PUBLIC_INTERNAL_ORG_ID ?? "";

export function isInternal(orgId?: string | null, orgRole?: string | null) {
  return !!INTERNAL_ORG_ID && orgId === INTERNAL_ORG_ID && orgRole === ROLE_MANAGER;
}
