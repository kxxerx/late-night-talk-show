import { supabase } from "./supabaseClient.js";
import { qs, showMessage, getMyProfile, renderNav } from "./common.js";

await renderNav();

async function loadShop() {
  const profile = await getMyProfile();
  if (!profile) return;

  qs("#myCurrency").textContent = profile.currency;

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
      <h2>${item.name}</h2>
      <p>${item.description}</p>
      <p class="price">${item.price} 조각</p>
      <button data-buy="${item.id}">구입하기</button>
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

      await loadShop();
    });
  });
}

loadShop().catch(error => {
  console.error(error);
  showMessage(error.message, "error");
});
