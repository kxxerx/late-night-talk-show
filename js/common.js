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
    location.href = "login.html";
    return null;
  }
  return session;
}

export async function getMyProfile() {
  const session = await requireAuth();
  if (!session) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) throw error;

  if (data?.status === "withdrawn") {
    await supabase.auth.signOut();
    location.href = "login.html";
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
        <p>관리자 권한이 필요합니다. 권한 없이 들어오려는 시도는 늘 인간답게 뻔하군요.</p>
        <p><a class="button" href="index.html">상점으로</a></p>
      </main>
    `;
    return null;
  }

  return profile;
}

export async function logout() {
  await supabase.auth.signOut();
  location.href = "login.html";
}

export async function renderNav() {
  const nav = document.querySelector("#nav");
  if (!nav) return;

  const session = await getSession();
  if (!session) {
    nav.innerHTML = `
      <a href="login.html">로그인</a>
    `;
    return;
  }

  let adminLink = "";
  try {
    const profile = await getMyProfile();
    if (profile?.role === "admin") {
      adminLink = `<a href="admin.html">관리자</a>`;
    }
  } catch (e) {
    console.error(e);
  }

  nav.innerHTML = `
    <a href="index.html">상점</a>
    <a href="mypage.html">내 상태</a>
    <a href="inventory.html">내 가방</a>
    <a href="codes.html">이벤트 코드</a>
    ${adminLink}
    <button id="logoutBtn" class="link-button">로그아웃</button>
  `;

  const logoutBtn = document.querySelector("#logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);
}

export function profileAvatar(profile) {
  if (profile?.avatar_url) {
    return `<img src="${profile.avatar_url}" alt="프로필 이미지" onerror="this.style.display='none'">`;
  }
  const name = profile?.display_name || profile?.site_id || "?";
  return `<span>${name.slice(0, 2).toUpperCase()}</span>`;
}

export function pollutionLabel(value) {
  const n = Number(value || 0);
  if (n >= 80) return "위험";
  if (n >= 50) return "불안정";
  if (n >= 20) return "경미한 오염";
  return "안정";
}
