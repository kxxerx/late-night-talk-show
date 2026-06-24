import { supabase } from "./supabaseClient.js";

export function qs(selector) {
  return document.querySelector(selector);
}

export function qsa(selector) {
  return Array.from(document.querySelectorAll(selector));
}

export function showMessage(message, type = "info") {
  const box = qs("#message");
  if (!box) {
    alert(message);
    return;
  }
  box.textContent = message;
  box.className = `message ${type}`;
  box.style.display = "block";
}

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

export function authEmailFromLoginId(loginId) {
  const value = String(loginId || "").trim().toLowerCase();
  if (value.includes("@")) return value;
  return `${value}@pollution.invalid`;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    location.href = "index.html";
    return null;
  }
  return session;
}

export async function getMyProfile() {
  const session = await requireAuth();
  if (!session) return null;
  document.querySelectorAll(".requires-login").forEach((node) => { node.hidden = false; });

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) throw error;

  if (data?.status === "withdrawn") {
    await supabase.auth.signOut();
    location.href = "index.html";
    return null;
  }

  return data;
}

export async function requireAdmin() {
  const profile = await getMyProfile();
  if (!profile) return null;

  if (profile.role !== "admin") {
    document.body.innerHTML = `
      <main class="container">
        <h1>접근 불가</h1>
        <p>관리자 권한이 필요합니다.</p>
        <p><a class="button" href="index.html">상점으로</a></p>
      </main>
    `;
    return null;
  }

  return profile;
}

export async function logout() {
  const ok = confirm("다시 방문하시겠습니까?");
  if (!ok) return;
  await supabase.auth.signOut();
  location.href = "index.html";
}

export async function renderNav() {
  // v0.7부터 상단 메뉴는 HTML 고정 메뉴를 사용합니다.
  // 기존 JS 파일 호환용으로 빈 함수만 남겨둡니다.
  return;
}

export function profileAvatar(profile) {
  if (profile?.avatar_url) {
    return `<img src="${profile.avatar_url}" alt="프로필 이미지" onerror="this.style.display='none'">`;
  }
  const name = profile?.display_name || "?";
  return `<span>${name.slice(0, 2).toUpperCase()}</span>`;
}

export function pollutionLabel(value) {
  const n = Number(value || 0);
  if (n >= 100) return "안 돼 돌 아 가";
  if (n >= 71) return "위 험 해";
  if (n >= 41) return "조 심 해";
  if (n >= 21) return "괜 찮 아 ?";
  return "괜 찮 아";
}

export function visitorStatusClass(profileOrValue) {
  const n = typeof profileOrValue === "object" && profileOrValue !== null
    ? Number(profileOrValue.pollution || 0)
    : Number(profileOrValue || 0);
  if (n >= 100) return "status-red";
  return "status-yellow";
}

export function visitorStatusText(profileOrValue) {
  if (typeof profileOrValue === "object" && profileOrValue !== null) {
    if (profileOrValue.visitor_type === "entity") return profileOrValue.current_life_item_id ? "가면 붕괴율" : "측정 불필요";
    return pollutionLabel(Number(profileOrValue.pollution || 0));
  }
  return pollutionLabel(Number(profileOrValue || 0));
}


export async function revealMemberLinks() {
  const session = await getSession();
  document.querySelectorAll(".requires-login").forEach((node) => {
    node.hidden = !session;
  });
  return session;
}


export function visitorMetricValue(profile) {
  if (!profile) return "-";
  if (profile.visitor_type === "entity") {
    return profile.current_life_item_id ? Number(profile.mask_collapse_rate || 0) : "—";
  }
  return Number(profile.pollution || 0);
}

export function visitorKindLabel(profile) {
  if (!profile) return "";
  if (profile.visitor_type === "entity") {
    return profile.current_life_item_id ? maskCollapseJudgment(profile.mask_collapse_rate) : "측정 불필요";
  }
  return visitorStatusText(profile);
}


export function maskCollapseJudgment(value) {
  const n = Number(value || 0);
  if (n <= 20) return "가면 안정";
  if (n <= 40) return "틈새 발생";
  if (n <= 70) return "위장 불안정";
  if (n <= 99) return "식별 임박";
  return "가면 붕괴";
}
