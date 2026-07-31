"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// ✅ This page just redirects to /auth — no duplicate logic needed
export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/auth");
  }, [router]);

  return null;
}