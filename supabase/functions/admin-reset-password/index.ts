// supabase/functions/admin-reset-password/index.ts
// 관리자용 임시 비밀번호 설정 Edge Function
// 필요한 Secret:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
//
// 배포 후 프론트에서는 supabase.functions.invoke("admin-reset-password", ...)로 호출합니다.
// service_role key는 절대 GitHub, js/config.js, 브라우저 코드에 넣지 마세요.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST 요청만 허용됩니다." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKeyFromSecret = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Edge Function secret이 설정되지 않았습니다. SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인해 주세요." }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const anonKey = req.headers.get("apikey") || anonKeyFromSecret;

    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return jsonResponse({ error: "로그인 세션이 전달되지 않았습니다. 관리자로 다시 로그인한 뒤 시도해 주세요." }, 401);
    }

    if (!anonKey) {
      return jsonResponse({ error: "anon/publishable key가 전달되지 않았습니다. SUPABASE_ANON_KEY secret을 추가하거나 프론트 설정을 확인해 주세요." }, 500);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData?.user) {
      return jsonResponse({ error: "로그인이 필요합니다." }, 401);
    }

    const { data: requester, error: requesterError } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", authData.user.id)
      .single();

    if (requesterError || !requester || requester.role !== "admin") {
      return jsonResponse({ error: "관리자만 비밀번호를 초기화할 수 있습니다." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id || "").trim();
    const temporaryPassword = String(body.temporary_password || "");

    if (!userId) {
      return jsonResponse({ error: "대상 사용자 ID가 없습니다." }, 400);
    }

    if (temporaryPassword.length < 8) {
      return jsonResponse({ error: "임시 비밀번호는 8자 이상이어야 합니다." }, 400);
    }

    const { data: targetProfile, error: targetError } = await adminClient
      .from("profiles")
      .select("id, site_id, display_name")
      .eq("id", userId)
      .single();

    if (targetError || !targetProfile) {
      return jsonResponse({ error: "대상 사용자를 찾을 수 없습니다." }, 404);
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password: temporaryPassword,
    });

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 400);
    }

    // 로그 기록은 실패해도 비밀번호 초기화 성공 자체를 되돌리지 않습니다.
    // 프로젝트마다 admin_logs 테이블/권한 상태가 다를 수 있어서, 여기서 전체 기능을 죽이면 인간 세상의 유지보수 지옥이 열립니다.
    const { error: logError } = await adminClient.from("admin_logs").insert({
      admin_id: authData.user.id,
      target_user_id: userId,
      action: "reset_password",
      detail: JSON.stringify({
        site_id: targetProfile.site_id,
        display_name: targetProfile.display_name,
      }),
    });

    if (logError) {
      console.warn("admin_logs insert failed:", logError.message);
    }

    return jsonResponse({
      ok: true,
      message: "임시 비밀번호가 설정되었습니다.",
      user_id: userId,
    });
  } catch (error) {
    return jsonResponse({ error: error?.message || "알 수 없는 오류가 발생했습니다." }, 500);
  }
});

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
