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

  if (error) throw error;

  if (data?.status === "withdrawn") {
    await supabase.auth.signOut();
    cachedSession = null;
    return null;
  }

  return data;
}

function renderLoggedInSide(profile) {
  qs("#sidePanel").innerHTML = `
    <div class="profile-card">
      <div class="avatar">${profileAvatar(profile)}</div>
      <div>
        <h2>${profile.display_name || "방문객 정보"}</h2>
        <p class="muted">${pollutionLabel(profile.pollution)}</p>
      </div>
      <div class="profile-stats">
        <div><span>${profile.currency}</span><small>재화</small></div>
        <div><span>${profile.pollution}</span><small>방문객 상태</small></div>
      </div>
      <div class="side-actions">
        <a class="button secondary" href="inventory.html">쇼핑백</a>
        <a class="button secondary" href="mypage.html">방문객 정보</a>
        <a class="button secondary" href="codes.html">초대권 등록</a>
        <a class="button secondary" href="partner.html">특별관</a>
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
      <h2>손님 입장</h2>
      <p class="muted">구매와 쇼핑백 확인은 손님 등록 후 가능합니다.</p>

      <form id="sideLoginForm">
        <label>아이디
          <input id="sideLoginId" type="text" required autocomplete="username" placeholder="아이디">
        </label>
        <label>비밀번호
          <input id="sideLoginPassword" type="password" required autocomplete="current-password" placeholder="비밀번호">
        </label>
        <button type="submit">입장하기</button>
      </form>

      <hr>

      <details class="signup-details">
        <summary>처음 온 손님 등록</summary>
        <form id="sideSignupForm">
          <label>아이디
            <input id="sideSignupLoginId" type="text" required minlength="3" maxlength="20" placeholder="영문/숫자/_/- 3~20자">
          </label>
          <label>비밀번호
            <input id="sideSignupPassword" type="password" minlength="6" required autocomplete="new-password">
          </label>
          <label>표시 닉네임
            <input id="sideSignupDisplayName" type="text" placeholder="사이트에서 보일 이름">
          </label>
          <button type="submit">손님 등록</button>
        </form>
      </details>
    </div>
  `;

  qs("#sideLoginForm")?.addEventListener("submit", handleSideLogin);
  qs("#sideSignupForm")?.addEventListener("submit", handleSideSignup);
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

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage("로그인 실패: 아이디 또는 비밀번호를 확인하세요.", "error");
    return;
  }

  showMessage("로그인 완료.", "success");
  await loadShopHome();
}

async function handleSideSignup(event) {
  event.preventDefault();

  const loginId = normalizeLoginId(qs("#sideSignupLoginId").value);
  const password = qs("#sideSignupPassword").value;
  const displayName = qs("#sideSignupDisplayName").value.trim();

  if (loginId.length < 3 || loginId.length > 20) {
    showMessage("아이디는 영문/숫자/_/- 조합으로 3~20자여야 합니다.", "error");
    return;
  }

  const { data: available, error: checkError } = await supabase.rpc("is_site_id_available", {
    p_site_id: loginId
  });

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
    options: {
      data: {
        site_id: loginId,
        display_name: displayName || loginId
      }
    }
  });

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  if (data?.session) {
    showMessage("회원가입 완료. 자동 로그인되었습니다.", "success");
    await loadShopHome();
    return;
  }

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (!loginError && loginData?.session) {
    showMessage("회원가입 완료. 자동 로그인되었습니다.", "success");
    await loadShopHome();
    return;
  }

  showMessage("회원가입은 완료되었습니다. 이메일 확인 설정이 켜져 있으면 로그인이 막힐 수 있습니다.", "success");
}

function filteredItems() {
  if (currentCategory === "all") return cachedItems;
  return cachedItems.filter(item => (item.category || "main") === currentCategory);
}

function renderItems() {
  const items = filteredItems();

  if (!items.length) {
    qs("#shopList").innerHTML = `
      <article class="panel empty-panel">
        <h2>등록된 아이템 없음</h2>
        <p class="muted">이 카테고리에 아직 아이템이 없습니다.</p>
      </article>
    `;
    return;
  }

  qs("#shopList").innerHTML = items.map(item => `
    <article class="item-card">
      <div class="item-image-wrap">
        ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" onerror="this.style.display='none'">` : `<div class="no-image">NO IMAGE</div>`}
      </div>
      <div class="item-body">
        <p class="item-category">${categoryLabels[item.category || "main"] || "아이템"}</p>
        <h2>${item.name}</h2>
        <p>${item.description}</p>
      </div>
      <div class="item-footer">
        <p class="price">${item.price} 조각</p>
        <button data-buy="${item.id}">구입</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-buy]").forEach(button => {
    button.addEventListener("click", async () => {
      if (!cachedSession || !cachedProfile) {
        showMessage("구매하려면 먼저 손님 등록을 해주세요.", "error");
        qs("#sidePanel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const itemId = button.dataset.buy;
      button.disabled = true;
      button.textContent = "처리 중";

      const { data, error } = await supabase.rpc("purchase_item", {
        p_item_id: itemId
      });

      if (error) {
        showMessage(error.message, "error");
      } else {
        showMessage(data.message, "success");
      }

      await loadShopHome();
    });
  });
}

async function loadShopHome() {
  cachedProfile = await getOptionalProfile();

  if (cachedProfile) {
    renderLoggedInSide(cachedProfile);
  } else {
    renderGuestSide();
  }

  wireCategoryButtons();

  const { data: items, error } = await supabase
    .from("items")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  cachedItems = items || [];
  renderItems();
}

loadShopHome().catch(error => {
  console.error(error);
  showMessage(error.message, "error");
});
