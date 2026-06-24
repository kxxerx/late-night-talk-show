import { supabase } from "./supabaseClient.js";
import { qs, showMessage, getSession, profileAvatar, visitorStatusText, visitorStatusClass, visitorMetricValue, visitorKindLabel, authEmailFromLoginId } from "./common.js";

let cachedSession = null;
let cachedProfile = null;
let cachedItems = [];
let currentCategory = new URLSearchParams(location.search).get("category") || "all";

const categoryLabels = {
  all: "전체",
  main: "기념품",
  cleanse: "분실물",
  special: "특별 상품",
  event: "초대권"
};

function friendlyError(message = "") {
  return String(message)
    .replace("재화가 부족합니다.", "유쾌주화가 부족합니다.")
    .replace("재화가 부족합니다", "유쾌주화가 부족합니다");
}

function itemVisibleForVisitor(item) {
  const audience = item.audience || "human";
  const kind = item.item_kind || "regular";
  const type = cachedProfile?.visitor_type || "human";

  if (type === "entity") {
    if (audience !== "entity") return false;
    if (kind === "mask_care" && !cachedProfile?.current_life_item_id) return false;
    return true;
  }

  if (type === "infected") {
    return audience === "infected" || audience === "all";
  }

  return audience === "human" || audience === "all";
}

function itemSoldOutForVisitor(item) {
  return cachedProfile?.visitor_type === "entity"
    && (item.item_kind || "regular") === "life"
    && cachedProfile?.current_life_item_id
    && String(cachedProfile.current_life_item_id) === String(item.id)
    && Number(cachedProfile.mask_collapse_rate || 0) < 100;
}

function filteredItems() {
  return cachedItems
    .filter(itemVisibleForVisitor)
    .filter(item => currentCategory === "all" || item.category === currentCategory);
}

function ensureItemDetailModal() {
  let modal = document.querySelector("#itemDetailModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "itemDetailModal";
  modal.className = "soft-modal item-detail-modal";
  modal.innerHTML = `
    <div class="soft-modal-box item-detail-box">
      <button id="closeItemDetailBtn" class="modal-close" type="button">×</button>
      <div id="itemDetailContent"></div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.id === "closeItemDetailBtn") {
      modal.classList.remove("open");
    }
  });

  return modal;
}

function openItemDetail(item) {
  const modal = ensureItemDetailModal();
  const content = modal.querySelector("#itemDetailContent");
  content.innerHTML = `
    <div class="detail-image-wrap">
      ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" onerror="this.style.display='none'">` : `<div class="no-image">NO IMAGE</div>`}
    </div>
    <h2>${item.name}</h2>
    <p class="detail-price">${item.price} 유쾌주화</p>
    <p class="detail-description">${item.description || "상세 설명이 등록되지 않았습니다."}</p>
  `;
  modal.classList.add("open");
}

function renderItems() {
  const list = qs("#shopList");
  if (!list) return;

  const items = filteredItems();
  if (!items.length) {
    list.innerHTML = `<article class="panel empty-panel"><h2>등록된 물품 없음</h2><p class="muted">이 선반에는 아직 아무것도 없습니다.</p></article>`;
    return;
  }

  list.innerHTML = items.map(item => `
    <article class="item-card luxury-item-card">
      <div class="item-image-wrap">
        ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" onerror="this.style.display='none'">` : `<div class="no-image">NO IMAGE</div>`}
      </div>
      <div class="item-body">
        <h2>${item.name}</h2>
      </div>
      <div class="item-footer">
        <p class="price">${item.price} 유쾌주화</p>
        <div class="item-actions">
          <button data-detail="${item.id}" class="button secondary" type="button">자세히</button>
          ${itemSoldOutForVisitor(item) ? `<button type="button" disabled>솔드아웃</button>` : `<button data-buy="${item.id}" type="button">구입</button>`}
        </div>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-detail]").forEach(button => {
    button.addEventListener("click", () => {
      const item = cachedItems.find(row => String(row.id) === String(button.dataset.detail));
      if (item) openItemDetail(item);
    });
  });

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

      if (error) showMessage(friendlyError(error.message), "error");
      else showMessage(data.message || "구매 완료", "success");

      await loadShopHome();
    });
  });
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

async function fetchProfile(session) {
  document.querySelectorAll(".requires-login").forEach((node) => { node.hidden = !session; });
  if (!session) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (error) throw error;

  document.body.classList.toggle("entity-mode", data.visitor_type === "entity");
  document.body.classList.toggle("infected-mode", data.visitor_type === "infected");
  return data;
}

function displayName(profile) {
  return profile?.band_nickname || profile?.display_name || "익명";
}

function renderSidePanel() {
  const panel = qs("#sidePanel");
  if (!panel) return;

  if (!cachedSession || !cachedProfile) {
    panel.innerHTML = `
      <section class="profile-card login-card">
        <h2>방문객 입장</h2>
        <p class="muted">구매와 쇼핑백 확인은 방문객 등록 후 가능합니다.</p>
        <form id="sideLoginForm" class="stacked-form">
          <label>아이디
            <input id="sideLoginId" type="text" autocomplete="username" required>
          </label>
          <label>비밀번호
            <input id="sideLoginPassword" type="password" autocomplete="current-password" required>
          </label>
          <button type="submit">입장하기</button>
        </form>
        <div class="side-actions">
          <button id="openSignupModalBtn" class="button secondary" type="button">방문객 등록</button>
          <button id="forgotPasswordBtn" class="button secondary" type="button">비밀번호를 잊으셨나요?</button>
        </div>
      </section>
    `;
    wireAnonymousPanel();
    return;
  }

  panel.innerHTML = `
    <section class="profile-card">
      <img class="profile-avatar" src="${profileAvatar(cachedProfile)}" alt="프로필 이미지">
      <h2>${displayName(cachedProfile)}</h2>
      <div class="profile-stats two-stats">
        <div><span>${cachedProfile.currency}</span><small>유쾌주화</small></div>
        <div class="status-only-card">
          <span>${visitorMetricValue(cachedProfile)}</span>
          <small class="profile-status-text ${visitorStatusClass(cachedProfile)}">${visitorKindLabel(cachedProfile)}</small>
        </div>
      </div>
      <div class="side-actions">
        <a class="button secondary" href="inventory.html">쇼핑백</a>
        <a class="button secondary" href="mypage.html">방문객 정보</a>
        <a class="button secondary" href="codes.html">초대권 등록</a>
        ${cachedProfile.role === "admin" ? `<a class="button secondary" href="admin.html">관리실</a>` : ""}
        <button id="sideLogoutBtn" class="button secondary" type="button">다시 방문하기</button>
      </div>
    </section>
  `;
  qs("#sideLogoutBtn")?.addEventListener("click", openGoodbyeModal);
}

function ensureSignupModal() {
  let modal = qs("#signupModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "signupModal";
  modal.className = "soft-modal";
  modal.innerHTML = `
    <div class="soft-modal-box">
      <button class="modal-close" id="closeSignupModalBtn" type="button">×</button>
      <h2>방문객 등록</h2>
      <form id="sideSignupForm" class="stacked-form">
        <label>아이디
          <input id="sideSignupId" type="text" autocomplete="username" required>
        </label>
        <label>비밀번호
          <input id="sideSignupPassword" type="password" autocomplete="new-password" required>
        </label>
        <button type="submit">등록하기</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.id === "closeSignupModalBtn") {
      modal.classList.remove("open");
    }
  });

  qs("#sideSignupForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const siteId = qs("#sideSignupId").value.trim();
    const password = qs("#sideSignupPassword").value;
    const email = authEmailFromLoginId(siteId);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { site_id: siteId, display_name: "익명" } }
    });

    if (error) {
      showMessage(error.message, "error");
      return;
    }

    if (!data.session) {
      await supabase.auth.signInWithPassword({ email, password });
    }

    showMessage("방문객 등록이 완료되었습니다.", "success");
    modal.classList.remove("open");
    await loadShopHome();
  });

  return modal;
}

function ensureForgotPasswordModal() {
  let modal = qs("#forgotPasswordModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "forgotPasswordModal";
  modal.className = "soft-modal";
  modal.innerHTML = `
    <div class="soft-modal-box">
      <button class="modal-close" id="closeForgotPasswordModalBtn" type="button">×</button>
      <h2>비밀번호 확인 요청</h2>
      <p class="muted">자동 이메일 복구는 사용할 수 없습니다. 아이디와 메모를 남기면 관리실에서 확인할 수 있습니다.</p>
      <form id="forgotPasswordForm" class="stacked-form">
        <label>아이디
          <input id="forgotLoginId" type="text" required>
        </label>
        <label>메모
          <textarea id="forgotMemo" rows="3" placeholder="예: 비밀번호를 잊었습니다."></textarea>
        </label>
        <button type="submit">확인 요청</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal || event.target.id === "closeForgotPasswordModalBtn") {
      modal.classList.remove("open");
    }
  });

  qs("#forgotPasswordForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const site_id = qs("#forgotLoginId").value.trim();
    const memo = qs("#forgotMemo").value.trim();

    const { error } = await supabase.from("password_reset_requests").insert({ site_id, memo });
    if (error) showMessage(error.message, "error");
    else {
      showMessage("확인 요청을 남겼습니다.", "success");
      modal.classList.remove("open");
    }
  });

  return modal;
}

function openGoodbyeModal() {
  let modal = qs("#goodbyeModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "goodbyeModal";
    modal.className = "soft-modal goodbye-modal";
    modal.innerHTML = `
      <div class="soft-modal-box goodbye-box">
        <h2>이용해 주셔서 감사합니다, 방문객님!</h2>
        <p>다음에 다시 방문해 주세요!</p>
        <p class="come-again">또 놀 러 와</p>
        <button id="confirmGoodbyeBtn" type="button">확인</button>
      </div>
    `;
    document.body.appendChild(modal);

    qs("#confirmGoodbyeBtn").addEventListener("click", async () => {
      await supabase.auth.signOut();
      location.href = "index.html";
    });
  }

  modal.classList.add("open");
}

function wireAnonymousPanel() {
  qs("#sideLoginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const siteId = qs("#sideLoginId").value.trim();
    const password = qs("#sideLoginPassword").value;
    const email = authEmailFromLoginId(siteId);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showMessage(error.message, "error");
    else {
      showMessage("입장했습니다.", "success");
      await loadShopHome();
    }
  });

  qs("#openSignupModalBtn")?.addEventListener("click", () => {
    ensureSignupModal().classList.add("open");
  });

  qs("#forgotPasswordBtn")?.addEventListener("click", () => {
    ensureForgotPasswordModal().classList.add("open");
  });
}

async function loadItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  cachedItems = data || [];
}

async function loadShopHome() {
  cachedSession = await getSession();
  cachedProfile = await fetchProfile(cachedSession);
  await loadItems();
  renderSidePanel();
  wireCategoryButtons();
  renderItems();

  if (cachedProfile?.pollution >= 100 && cachedProfile.visitor_type === "human") {
    setTimeout(openSecurityContractModal, 250);
  }
}

function openSecurityContractModal() {
  let modal = qs("#securityContractModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "securityContractModal";
    modal.className = "contract-modal";
    modal.innerHTML = `
      <div class="contract-box">
        <h2>표준 보안팀 근로계약서</h2>
        <p class="contract-scroll">
          갑 청 이사<br>
          을 오염자<br><br>
          을은 본 계약의 체결과 동시에 골든 마스코트 기념품샵 및 그 부속 시설에서 발생하는 모든 이상현상, 환청, 기억 오염, 신체 변형, 이름 손실, 사회적 고립, 불합리한 야근, 설명되지 않는 근무 배치에 대하여 이의를 제기하지 않는다.<br><br>
          을은 본인의 자아가 일부 또는 전부 침식되더라도 업무상 필요한 범위 내에서 이를 감수한다. 갑은 을에게 적절한 휴게시간을 제공할 수 있으나, 휴게시간의 존재 여부는 갑의 해석에 따른다.<br><br>
          을은 본 계약서가 충분히 불리하다는 사실을 인지했거나, 인지하지 못했거나, 인지할 능력을 상실했더라도 계약 체결에 동의한 것으로 본다.
        </p>
        <button id="signSecurityContractBtn" type="button">근로계약</button>
      </div>
    `;
    document.body.appendChild(modal);

    qs("#signSecurityContractBtn").addEventListener("click", async () => {
      const { error } = await supabase.rpc("accept_security_contract");
      if (error) {
        showMessage(error.message, "error");
        return;
      }
      modal.classList.remove("open");
      showMessage("보안팀 근로계약이 체결되었습니다.", "success");
      await loadShopHome();
    });
  }

  modal.classList.add("open");
}

loadShopHome().catch(error => {
  console.error(error);
  showMessage(error.message, "error");
});
