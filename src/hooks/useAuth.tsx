import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  student_id: string | null;
  staff_id: string | null;
};

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, student_id, staff_id")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    staleTime: 30_000,
  });
}

export function homePathForRole(role: AppRole | undefined) {
  switch (role) {
    case "student":
      return "/" as const;
    case "staff":
      return "/staff" as const;
    case "management":
      return "/management" as const;
    case "admin":
      return "/management" as const;
    default:
      return "/dashboard" as const;
  }
}

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}
