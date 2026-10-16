"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";

export default function OperatorBar() {
  return (
    <div className="flex items-center gap-3">
      <OrganizationSwitcher
        hidePersonal
        afterSelectOrganizationUrl="/admin"
        afterCreateOrganizationUrl="/admin"
      />
      <UserButton />
    </div>
  );
}
