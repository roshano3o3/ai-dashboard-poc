import { redirect } from "next/navigation";

export default function HomePage() {
  // Your project already has the welcome UI at /welcome
  // This makes /home work without changing any existing design/features.
  redirect("/welcome");
}
