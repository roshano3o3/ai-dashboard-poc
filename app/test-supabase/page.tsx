"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function TestSupabasePage() {
  const [status, setStatus] = useState("Checking...");

  useEffect(() => {
    async function run() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setStatus(`Error: ${error.message}`);
        return;
      }

      const email = data.session?.user?.email ?? "No session";
      setStatus(`OK. Session user: ${email}`);
    }

    run();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Supabase Test</h1>
      <p>{status}</p>
    </main>
  );
}