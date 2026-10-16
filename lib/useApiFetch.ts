"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import { isInternal, ROLE_MANAGER } from "@/lib/roles";

// fetch against the API with the operator's Clerk session token attached.
// getToken refreshes near-expiry tokens, so call this per request.
export function useApiFetch() {
  const { getToken } = useAuth();

  return useCallback(
    async (path: string, init: RequestInit = {}) => {
      const token = await getToken();
      const headers = new Headers(init.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
        ...init,
        headers,
      });
    },
    [getToken],
  );
}

export function useIsManager() {
  const { orgRole } = useAuth();
  return orgRole === ROLE_MANAGER;
}

export function useIsInternal() {
  const { orgId, orgRole } = useAuth();
  return isInternal(orgId, orgRole);
}
