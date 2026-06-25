// pollution-shop-version: v5.1
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

  applyVisitorModeClass(data);
  handleEntityCollapseIfNeeded(data);

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

export function clearVisitorModeClass() {
  document.documentElement.classList.remove("entity-mode", "infected-mode");
  document.body.classList.remove("entity-mode", "infected-mode");
  try { localStorage.setItem("visitor_mode", "human"); } catch (_) {}
  updateGlobalCategoryLabels("human");
}

export async function logout() {
  const ok = confirm("다시 방문하시겠습니까?");
  if (!ok) return;
  await supabase.auth.signOut();
  clearVisitorModeClass();
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
  const name = profile?.band_nickname || profile?.display_name || "?";
  return `<span>${String(name).slice(0, 2).toUpperCase()}</span>`;
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
  if (typeof profileOrValue === "object" && profileOrValue !== null) {
    if (profileOrValue.visitor_type === "entity") {
      const n = Number(profileOrValue.mask_collapse_rate || 0);
      return n >= 100 ? "status-red" : "status-yellow";
    }
    const n = Number(profileOrValue.pollution || 0);
    return n >= 100 ? "status-red" : "status-yellow";
  }
  const n = Number(profileOrValue || 0);
  if (n >= 100) return "status-red";
  return "status-yellow";
}

export function visitorStatusText(profileOrValue) {
  if (typeof profileOrValue === "object" && profileOrValue !== null) {
    if (profileOrValue.visitor_type === "entity") return profileOrValue.current_life_item_id ? maskCollapseJudgment(profileOrValue.mask_collapse_rate) : "측정 불필요";
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
  if (n >= 100) return "동기화가 해제되었습니다.";
  if (n >= 76) return "동기화 해제 위험";
  if (n >= 40) return "동기화 불안정";
  return "동기화 안정적";
}


export function applyVisitorModeClass(profile) {
  const isEntity = profile?.visitor_type === "entity";
  const isInfected = profile?.visitor_type === "infected";
  document.documentElement.classList.toggle("entity-mode", isEntity);
  document.body.classList.toggle("entity-mode", isEntity);
  document.documentElement.classList.toggle("infected-mode", isInfected);
  document.body.classList.toggle("infected-mode", isInfected);
  try {
    if (isEntity) localStorage.setItem("visitor_mode", "entity");
    else if (isInfected) localStorage.setItem("visitor_mode", "infected");
    else localStorage.setItem("visitor_mode", "human");
  } catch (_) {}
  updateGlobalCategoryLabels(profile);
}


export function updateGlobalCategoryLabels(profileOrMode = null) {
  const mode = typeof profileOrMode === "string"
    ? profileOrMode
    : profileOrMode?.visitor_type || (() => {
        try { return localStorage.getItem("visitor_mode") || "human"; } catch (_) { return "human"; }
      })();

  const entityLabels = {
    all: "전체",
    main: "인생 진열장",
    cleanse: "가면 수선소",
    special: "■■ ■■",
    event: "초대권"
  };

  const humanLabels = {
    all: "전체",
    main: "기념품",
    cleanse: "스낵",
    special: "특별 상품",
    event: "초대권"
  };

  const labels = mode === "entity" ? entityLabels : humanLabels;
  document.querySelectorAll("[data-category]").forEach((node) => {
    const key = node.dataset.category || "all";
    if (labels[key]) node.textContent = labels[key];
  });
}

updateGlobalCategoryLabels();


export async function handleEntityCollapseIfNeeded(profile) {
  if (!profile || profile.visitor_type !== "entity") return false;
  if (!profile.current_life_item_id) return false;
  if (Number(profile.mask_collapse_rate || 0) < 100) return false;
  if (window.__entityCollapseHandling) return true;

  window.__entityCollapseHandling = true;

  let modal = document.querySelector("#maskBreakModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "maskBreakModal";
    modal.className = "soft-modal mask-break-modal open";
    modal.innerHTML = `
      <div class="soft-modal-box mask-break-box">
        <div class="broken-mask" aria-hidden="true">
          <span class="mask-eye left"></span>
          <span class="mask-eye right"></span>
          <span class="mask-crack one"></span>
          <span class="mask-crack two"></span>
          <span class="mask-crack three"></span>
          <span class="mask-shard s1"></span>
          <span class="mask-shard s2"></span>
          <span class="mask-shard s3"></span>
          <span class="mask-shard s4"></span>
          <span class="mask-shard s5"></span>
          <span class="mask-shard s6"></span>
        </div>
        <h2>가면이 훼손됐습니다.</h2>
        <p>당신의 존재감이 커져 더 이상 이 가면을 사용하기 어렵습니다. 본래 당신의 모습으로 되돌아갑니다.</p>
        <button id="confirmMaskBreakBtn" type="button">확인</button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.classList.add("open");

  document.querySelector("#confirmMaskBreakBtn")?.addEventListener("click", async () => {
    const btn = document.querySelector("#confirmMaskBreakBtn");
    if (btn) btn.disabled = true;
    try {
      await supabase.rpc("release_entity_life", { p_reason: "동기화가 해제되었습니다." });
    } catch (error) {
      console.error(error);
    }
    location.reload();
  }, { once: true });

  return true;
}
