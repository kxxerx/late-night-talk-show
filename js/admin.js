import { supabase } from "./supabaseClient.js";
import { qs, qsa, showMessage, requireAdmin, formatDate } from "./common.js";

const adminProfile = await requireAdmin();

let users = [];
let items = [];
let submissions = [];

function selectedUserIds() {
  return qsa("[data-user-check]:checked").map(input => input.value);
}

async function loadUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  users = data || [];

  qs("#userList").innerHTML = users.map(user => `
    <tr>
      <td><input type="checkbox" data-user-check value="${user.id}"></td>
      <td>${user.site_id}</td>
      <td>${user.email || ""}</td>
      <td><input class="table-input" data-display="${user.id}" value="${user.display_name || ""}"></td>
      <td><input class="table-input" data-band="${user.id}" value="${user.band_nickname || ""}"></td>
      <td>${user.currency}</td>
      <td>${user.pollution}</td>
      <td>${user.status || "active"}</td>
      <td>
        <select data-role="${user.id}">
          <option value="user" ${user.role === "user" ? "selected" : ""}>user</option>
          <option value="admin" ${user.role === "admin" ? "selected" : ""}>admin</option>
        </select>
      </td>
      <td>
        <button data-save-user="${user.id}">저장</button>
        ${user.id !== adminProfile.id ? `<button data-remove-user="${user.id}" class="danger">제거</button>` : ""}
      </td>
    </tr>
  `).join("");


  


  document.querySelectorAll("[data-remove-user]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.removeUser;
      const ok = confirm("이 방문객 정보를 사이트 DB에서 제거할까요? 비밀번호 분실자의 재등록을 도와줄 때도 사용할 수 있습니다. Supabase Auth 실제 계정은 별도로 남을 수 있습니다.");
      if (!ok) return;

      const { data, error } = await supabase.rpc("admin_remove_profile", {
        p_target_user_id: id
      });

      if (error) showMessage(error.message, "error");
      else showMessage(data.message || "제거 완료", "success");

      await loadUsers();
    });
  });

  document.querySelectorAll("[data-save-user]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.saveUser;
      const displayName = document.querySelector(`[data-display="${id}"]`).value;
      const bandNickname = document.querySelector(`[data-band="${id}"]`).value;
      const role = document.querySelector(`[data-role="${id}"]`).value;

      const { error } = await supabase.rpc("admin_update_member", {
        p_target_user_id: id,
        p_display_name: displayName,
        p_band_nickname: bandNickname,
        p_role: role
      });

      if (error) showMessage(error.message, "error");
      else showMessage("방문객 정보 저장 완료", "success");

      await loadUsers();
    });
  });
}

async function loadItems() {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  items = data || [];

  qs("#adminItemSelect").innerHTML = `<option value="">아이템 선택 안 함</option>` + items.map(item => `
    <option value="${item.id}">${item.name}</option>
  `).join("");

  qs("#rewardItem").innerHTML = `<option value="">아이템 없음</option>` + items.map(item => `
    <option value="${item.id}">${item.name}</option>
  `).join("");

  qs("#itemList").innerHTML = items.map(item => `
    <tr>
      <td>${item.name}</td>
      <td>${item.price}</td>
      <td>${item.effect_type} ${item.effect_value}</td>
      <td>${item.is_active ? "판매중" : "중지"}</td>
      <td>${item.image_url || ""}</td>
    </tr>
  `).join("");
}

async function loadSubmissions() {
  const { data, error } = await supabase
    .from("event_submissions")
    .select("*, profile:profiles!event_submissions_user_id_fkey(site_id, email, display_name, band_nickname), event_code:event_codes(code, title, reward_currency, pollution_delta)")
    .order("submitted_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  submissions = data || [];

  qs("#submissionList").innerHTML = submissions.map(row => `
    <tr>
      <td>${row.profile?.site_id || ""}</td>
      <td>${row.profile?.display_name || ""}</td>
      <td>${row.profile?.band_nickname || ""}</td>
      <td>${row.event_code?.code || ""}</td>
      <td>${row.event_code?.title || ""}</td>
      <td><span class="status ${row.status}">${row.status}</span></td>
      <td>${formatDate(row.submitted_at)}</td>
      <td>
        ${row.status === "pending" ? `
          <input class="table-input" placeholder="관리자 메모" data-note="${row.id}">
          <button data-approve="${row.id}">승인</button>
          <button data-reject="${row.id}" class="danger">거절</button>
        ` : row.admin_note || ""}
      </td>
    </tr>
  `).join("") || `<tr><td colspan="8">제출 없음</td></tr>`;

  document.querySelectorAll("[data-approve]").forEach(button => {
    button.addEventListener("click", async () => {
      await reviewSubmission(button.dataset.approve, true);
    });
  });

  document.querySelectorAll("[data-reject]").forEach(button => {
    button.addEventListener("click", async () => {
      await reviewSubmission(button.dataset.reject, false);
    });
  });
}

async function reviewSubmission(id, approve) {
  const note = document.querySelector(`[data-note="${id}"]`)?.value || "";

  const { error } = await supabase.rpc("admin_review_submission", {
    p_submission_id: id,
    p_approve: approve,
    p_admin_note: note
  });

  if (error) showMessage(error.message, "error");
  else showMessage(approve ? "승인 완료" : "거절 완료", "success");

  await Promise.all([loadUsers(), loadSubmissions()]);
}

qs("#adjustForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const ids = selectedUserIds();
  if (ids.length === 0) {
    showMessage("선택된 회원이 없습니다.", "error");
    return;
  }

  const currency = Number(qs("#adjustCurrency").value || 0);
  const pollution = Number(qs("#adjustPollution").value || 0);
  const itemId = qs("#adminItemSelect").value || null;
  const itemQty = Number(qs("#adminItemQty").value || 0);
  const reason = qs("#adjustReason").value || "관리자 일괄 조정";

  const { data, error } = await supabase.rpc("admin_bulk_grant", {
    p_target_user_ids: ids,
    p_currency_delta: currency,
    p_pollution_delta: pollution,
    p_item_id: itemId,
    p_item_quantity: itemQty,
    p_reason: reason
  });

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  showMessage(`${data.count}명 처리 완료`, "success");
  await Promise.all([loadUsers(), loadItems()]);
});

qs("#itemForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    name: qs("#itemName").value.trim(),
    description: qs("#itemDescription").value.trim(),
    image_url: qs("#itemImage").value.trim() || null,
    price: Number(qs("#itemPrice").value || 0),
    effect_type: qs("#itemEffectType").value.trim() || "pollution_delta",
    effect_value: Number(qs("#itemEffectValue").value || 0),
    is_active: qs("#itemActive").checked,
    sort_order: Number(qs("#itemSort").value || 100)
  };

  const { error } = await supabase.from("items").insert(payload);

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  showMessage("선물 등록 완료", "success");
  qs("#itemForm").reset();
  qs("#itemActive").checked = true;
  await loadItems();
});

qs("#eventCodeForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    code: qs("#newCode").value.trim().toUpperCase(),
    title: qs("#codeTitle").value.trim(),
    description: qs("#codeDescription").value.trim(),
    reward_currency: Number(qs("#rewardCurrency").value || 0),
    pollution_delta: Number(qs("#codePollution").value || 0),
    reward_item_id: qs("#rewardItem").value || null,
    reward_item_quantity: Number(qs("#rewardItemQty").value || 0),
    is_active: true
  };

  const { error } = await supabase.from("event_codes").insert(payload);

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  showMessage("초대권 생성 완료", "success");
  qs("#eventCodeForm").reset();
});

if (adminProfile) {
  Promise.all([loadUsers(), loadItems(), loadSubmissions()]).catch(error => {
    console.error(error);
    showMessage(error.message, "error");
  });
}
