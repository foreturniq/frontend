import { Suspense } from "react";
import CheckoutSuccessContent from "./CheckoutSuccessContent";

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div>Loading checkout...</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
