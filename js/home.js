import { supabase } from "./supabaseClient.js";
import { qs, showMessage, getMyProfile, renderNav, profileAvatar, pollutionLabel } from "./common.js";

await renderNav();

async function renderProfileCard(profile) {
  qs("#profileCard").innerHTML = `
    <div class="profile-card">
      <div class="avatar">${profileAvatar(profile)}</div>
      <div>
        <h2>${profile.display_name || profile.site_id}</h2>
        <p class="muted">@${profile.site_id}</p>
      </div>
      <div class="profile-stats">
        <div><span>${profile.currency}</span><small>보유 재화</small></div>
        <div><span>${profile.pollution}</span><small>오염도</small></div>
        <div><span>${pollutionLabel(profile.pollution)}</span><small>상태</small></div>
      </div>
      <div class="side-actions">
        <a class="button secondary" href="inventory.html">내 가방</a>
        <a class="button secondary" href="mypage.html">내 상태</a>
        <a class="button secondary" href="codes.html">코드 제출</a>
      </div>
    </div>
  `;
}

async function loadShopHome() {
  const profile = await getMyProfile();
  if (!profile) return;

  await renderProfileCard(profile);

  const { data: items, error } = await supabase
    .from("items")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;

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
        <p class="price">${item.price} 조각</p>
        <button data-buy="${item.id}">구입하기</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-buy]").forEach(button => {
    button.addEventListener("click", async () => {
      const itemId = button.dataset.buy;
      button.disabled = true;
      button.textContent = "처리 중...";

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

loadShopHome().catch(error => {
  console.error(error);
  showMessage(error.message, "error");
});
