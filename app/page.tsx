import { redirect } from "next/navigation";

// Golfers arrive via course QR links, so the bare app domain is for operators.
// /dashboard sends signed-out visitors to /sign-in.
export default function Home() {
  redirect("/dashboard");
}
