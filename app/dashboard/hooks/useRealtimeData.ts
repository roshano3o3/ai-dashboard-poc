"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export function useRealtimeData(userId: string, refreshInterval: number = 30000) {
  const [data, setData] = useState<any[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!supabase || !userId) return;

    setIsRefreshing(true);
    try {
      const { data: records, error } = await supabase
        .from("universal_data")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && records) {
        setData(records);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error("Real-time fetch error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [userId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchData(); // Initial fetch

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  // Supabase Real-Time Subscription
  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = supabase
      .channel("universal_data_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "universal_data",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("🔔 Real-time change detected:", payload);
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchData]);

  return {
    data,
    lastUpdate,
    isRefreshing,
    refetch: fetchData,
  };
}