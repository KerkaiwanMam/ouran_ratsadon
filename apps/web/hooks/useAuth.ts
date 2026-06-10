"use client";

import useSWR from "swr";
import type { User, Subscription } from "@/types";

const fetcher = (url: string) =>
  fetch(url).then((r) => (r.ok ? r.json() : null));

interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPro: boolean;
  isAdmin: boolean;
  mutate: () => void;
}

export function useAuth(): AuthState {
  const { data, isLoading, mutate } = useSWR<{
    user: User;
    subscription: Subscription | null;
  } | null>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const user = data?.user ?? null;
  const subscription = data?.subscription ?? null;
  const plan = subscription?.plan ?? "FREE";

  return {
    user,
    subscription,
    isLoading,
    isAuthenticated: !!user,
    isPro: plan === "PRO" || plan === "TEAM",
    isAdmin: user?.role === "ADMIN",
    mutate,
  };
}
