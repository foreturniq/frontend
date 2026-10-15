import { Suspense } from "react";
import CheckoutCancelContent from "./CheckoutCancelContent";

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutCancelContent />
    </Suspense>
  );
}
