
import { supabase } from "./supabaseClient.js";
import { qs, showMessage, getSession, profileAvatar, pollutionLabel, authEmailFromLoginId } from "./common.js";

let currentCategory = new URLSearchParams(location.search).get("category") || "all";
let cachedItems = [];
let cachedProfile = null;
let cachedSession = null;

const categoryLabels = {
  all: "전체",
  main: "기념품",
  cleanse: "분실물",
  event: "초대권",
  special: "특별 상품"
};

function normalizeLoginId(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function displayVisitorName(profile) {
  return profile?.band_nickname || profile?.display_name || "익명";
}

function ensureSignupModal() {
  let modal = document.querySelector("#signupModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "signupModal";
  modal.className = "soft-modal";
  modal.innerHTML = `
    <div class="soft-modal-box">
      <button id="closeSignupModalBtn" class="modal-close" type="button">×</button>
      <h2>방문객 등록</h2>
      <p class="muted">아이디와 비밀번호만 등록하면 기념품샵에 입장할 수 있습니다. 사용자 이름은 등록 후 관리자가 정리합니다.</p>
      <form id="sideSignupForm">
        <label>아이디
          <input id="sideSignupLoginId" type="text" required minlength="3" maxlength="20" placeholder="영문/숫자/_/- 3~20자">
        </label>
        <label>비밀번호
          <input id="sideSignupPassword" type="password" minlength="6" required autocomplete="new-password">
        </label>
        <button type="submit">방문객 등록</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.id === "closeSignupModalBtn") {
      modal.classList.remove("open");
    }
  });

  modal.querySelector("#sideSignupForm")?.addEventListener("submit", handleSideSignup);
  return modal;
}

function openSignupModal() {
  ensureSignupModal().classList.add("open");
}

async function getOptionalProfile() {
  const session = await getSession();
  cachedSession = session;
  document.querySelectorAll(".requires-login").forEach((node) => { node.hidden = !session; });

  if (!session) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) {
    await supabase.auth.signOut();
    cachedSession = null;
    document.querySelectorAll(".requires-login").forEach((node) => { node.hidden = true; });
    return null;
  }

  if (data?.status === "withdrawn") {
    await supabase.auth.signOut();
    cachedSession = null;
    document.querySelectorAll(".requires-login").forEach((node) => { node.hidden = true; });
    return null;
  }

  return data;
}

function renderLoggedInSide(profile) {
  const name = displayVisitorName(profile);
  qs("#sidePanel").innerHTML = `
    <div class="profile-card">
      <div class="avatar">${profileAvatar({ ...profile, display_name: name })}</div>
      <div>
        <h2 class="visitor-name" title="${name}">${name}</h2>
      </div>
      <div class="profile-stats three-stats">
        <div><span>${profile.currency}</span><small>유쾌주화</small></div>
        <div><span>${profile.pollution}</span><small>방문객 상태</small></div>
        <div><span>${pollutionLabel(profile.pollution)}</span><small>판정</small></div>
      </div>
      <div class="side-actions unified-actions">
        <a class="button secondary" href="inventory.html">쇼핑백</a>
        <a class="button secondary" href="mypage.html">방문객 정보</a>
        <a class="button secondary" href="codes.html">초대권 등록</a>
        ${profile.role === "admin" ? `<a class="button secondary" href="admin.html">관리실</a>` : ""}
        <button id="sideLogoutBtn" class="button secondary" type="button">다시 방문하기</button>
      </div>
    </div>
  `;

  qs("#sideLogoutBtn")?.addEventListener("click", async () => {
    const ok = confirm("다시 방문하시겠습니까?");
    if (!ok) return;
    await supabase.auth.signOut();
    showMessage("다음 방문을 기다리겠습니다.", "success");
    await loadShopHome();
  });
}

function renderGuestSide() {
  qs("#sidePanel").innerHTML = `
    <div class="profile-card auth-side-card">
      <h2>방문객 입장</h2>
      <p class="muted">구매와 쇼핑백 확인은 방문객 등록 후 가능합니다.</p>

      <form id="sideLoginForm">
        <label>아이디
          <input id="sideLoginId" type="text" required autocomplete="username" placeholder="아이디">
        </label>
        <label>비밀번호
          <input id="sideLoginPassword" type="password" required autocomplete="current-password" placeholder="비밀번호">
        </label>
        <button type="submit">입장하기</button>
      </form>

      <button id="openSignupModalBtn" class="button secondary" type="button">방문객 등록</button>
    </div>
  `;

  qs("#sideLoginForm")?.addEventListener("submit", handleSideLogin);
  qs("#openSignupModalBtn")?.addEventListener("click", openSignupModal);
}

function wireCategoryButtons() {
  document.querySelectorAll("[data-category]").forEach(button => {
    const category = button.dataset.category;
    button.classList.toggle("active", category === currentCategory);

    button.addEventListener("click", (event) => {
      event.preventDefault();
      currentCategory = category || "all";
      const url = currentCategory === "all" ? "index.html" : `index.html?category=${currentCategory}`;
      history.replaceState(null, "", url);
      document.querySelectorAll("[data-category]").forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      renderItems();
    });
  });
}

async function handleSideLogin(event) {
  event.preventDefault();
  const loginId = qs("#sideLoginId").value.trim();
  const password = qs("#sideLoginPassword").value;
  const email = authEmailFromLoginId(loginId);

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showMessage("입장 실패: 아이디 또는 비밀번호를 확인하세요.", "error");
    return;
  }
  showMessage("입장 완료.", "success");
  await loadShopHome();
}

async function handleSideSignup(event) {
  event.preventDefault();
  const loginId = normalizeLoginId(qs("#sideSignupLoginId").value);
  const password = qs("#sideSignupPassword").value;

  if (loginId.length < 3 || loginId.length > 20) {
    showMessage("아이디는 영문/숫자/_/- 조합으로 3~20자여야 합니다.", "error");
    return;
  }

  const { data: available, error: checkError } = await supabase.rpc("is_site_id_available", { p_site_id: loginId });
  if (checkError) {
    showMessage(checkError.message, "error");
    return;
  }
  if (!available) {
    showMessage("이미 사용 중이거나 사용할 수 없는 아이디입니다.", "error");
    return;
  }

  const email = authEmailFromLoginId(loginId);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { site_id: loginId, display_name: "익명" } }
  });

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  if (data?.session) {
    showMessage("방문객 등록 완료. 자동 입장되었습니다.", "success");
    document.querySelector("#signupModal")?.classList.remove("open");
    await loadShopHome();
    return;
  }

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (!loginError && loginData?.session) {
    showMessage("방문객 등록 완료. 자동 입장되었습니다.", "success");
    document.querySelector("#signupModal")?.classList.remove("open");
    await loadShopHome();
    return;
  }

  showMessage("방문객 등록은 완료되었습니다. 이메일 확인 설정이 켜져 있으면 입장이 막힐 수 있습니다.", "success");
  document.querySelector("#signupModal")?.classList.remove("open");
}

function filteredItems() {
  if (currentCategory === "all") return cachedItems;
  return cachedItems.filter(item => (item.category || "main") === currentCategory);
}

function renderItems() {
  const items = filteredItems();
  if (!items.length) {
    qs("#shopList").innerHTML = `<article class="panel empty-panel"><h2>등록된 아이템 없음</h2><p class="muted">이 선반에는 아직 아무것도 없습니다.</p></article>`;
    return;
  }

  qs("#shopList").innerHTML = items.map(item => `
    <article class="item-card">
      <div class="item-image-wrap">
        ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" onerror="this.style.display='none'">` : `<div class="no-image">NO IMAGE</div>`}
      </div>
      <div class="item-body">
        <h2>${item.name}</h2>
        <p>${item.description}</p>
      </div>
      <div class="item-footer">
        <p class="price">${item.price} 유쾌주화</p>
        <button data-buy="${item.id}">구입</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-buy]").forEach(button => {
    button.addEventListener("click", async () => {
      if (!cachedSession || !cachedProfile) {
        showMessage("구매하려면 먼저 방문객 등록을 해주세요.", "error");
        qs("#sidePanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const itemId = button.dataset.buy;
      button.disabled = true;
      button.textContent = "처리 중";
      const { data, error } = await supabase.rpc("purchase_item", { p_item_id: itemId });
      if (error) showMessage(error.message, "error");
      else showMessage(data.message, "success");
      await loadShopHome();
    });
  });
}

async function loadShopHome() {
  cachedProfile = await getOptionalProfile();
  if (cachedProfile) renderLoggedInSide(cachedProfile);
  else renderGuestSide();
  wireCategoryButtons();
  const { data: items, error } = await supabase.from("items").select("*").eq("is_active", true).order("sort_order", { ascending: true });
  if (error) throw error;
  cachedItems = items || [];
  renderItems();
}

loadShopHome().catch(error => {
  console.error(error);
  showMessage(error.message, "error");
});
