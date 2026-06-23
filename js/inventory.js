import { supabase } from "./supabaseClient.js";
import { qs, showMessage, getMyProfile, renderNav } from "./common.js";

await renderNav();

async function loadInventory() {
  const profile = await getMyProfile();
  if (!profile) return;

  qs("#myPollution").textContent = profile.pollution;

  const { data, error } = await supabase
    .from("inventories")
    .select("quantity, item:items(id, name, description, image_url, effect_type, effect_value)")
    .gt("quantity", 0)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  qs("#inventoryList").innerHTML = (data || []).map(row => {
    const item = row.item;
    return `
      <article class="item-card">
        <div class="item-image-wrap">
          ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" onerror="this.style.display='none'">` : `<div class="no-image">NO IMAGE</div>`}
        </div>
        <h2>${item.name}</h2>
        <p>${item.description}</p>
        <p>보유 수량: <strong>${row.quantity}</strong></p>
        <p>효과: ${item.effect_type} ${item.effect_value}</p>
        <button data-use="${item.id}">사용하기</button>
      </article>
    `;
  }).join("") || `<p>보유 아이템이 없습니다. 상점에 가서 문명의 소비 구조에 참여하세요.</p>`;

  document.querySelectorAll("[data-use]").forEach(button => {
    button.addEventListener("click", async () => {
      const itemId = button.dataset.use;
      button.disabled = true;
      button.textContent = "사용 중...";

      const { data, error } = await supabase.rpc("use_item", {
        p_item_id: itemId
      });

      if (error) {
        showMessage(error.message, "error");
      } else {
        showMessage(`${data.message}: ${data.before} → ${data.after}`, "success");
      }

      await loadInventory();
    });
  });
}

loadInventory().catch(error => {
  console.error(error);
  showMessage(error.message, "error");
});
