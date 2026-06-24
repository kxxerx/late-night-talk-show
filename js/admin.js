import { supabase } from "./supabaseClient.js";
import { qs, qsa, showMessage, requireAdmin, formatDate } from "./common.js";

const adminProfile = await requireAdmin();

let users = [];
let items = [];
let submissions = [];
let codes = [];

function safeFileName(name) {
  return String(name || "item.png").toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 80);
}

async function uploadItemImageFile(file) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 업로드할 수 있습니다.");
  if (file.size > 3 * 1024 * 1024) throw new Error("이미지는 3MB 이하로 올려주세요.");
  const path = `${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from("item-images").upload(path, file, { cacheControl: "3600", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("item-images").getPublicUrl(path);
  return data.publicUrl;
}

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
        <select data-visitor-type="${user.id}">
          <option value="human" ${user.visitor_type === "human" || !user.visitor_type ? "selected" : ""}>일반</option>
          <option value="infected" ${user.visitor_type === "infected" ? "selected" : ""}>오염자</option>
          <option value="entity" ${user.visitor_type === "entity" ? "selected" : ""}>괴이</option>
        </select>
      </td>
      <td>
        <select data-role="${user.id}">
          <option value="user" ${user.role === "user" ? "selected" : ""}>user</option>
          <option value="admin" ${user.role === "admin" ? "selected" : ""}>admin</option>
        </select>
      </td>
      <td class="action-cell">
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
      const visitorType = document.querySelector(`[data-visitor-type="${id}"]`)?.value || "human";

      const { error } = await supabase.rpc("admin_update_member", {
        p_target_user_id: id,
        p_display_name: displayName,
        p_band_nickname: bandNickname,
        p_role: role,
        p_visitor_type: visitorType
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
      <td><input class="table-input short" data-item-name="${item.id}" value="${item.name || ""}"></td>
      <td><input class="table-input tiny" type="number" data-item-price="${item.id}" value="${item.price || 0}"></td>
      <td>
        <select data-item-category="${item.id}">
          <option value="main" ${item.category === "main" ? "selected" : ""}>기념품</option>
          <option value="cleanse" ${item.category === "cleanse" ? "selected" : ""}>분실물</option>
          <option value="special" ${item.category === "special" ? "selected" : ""}>특별 상품</option>
          <option value="event" ${item.category === "event" ? "selected" : ""}>초대권</option>
        </select>
      </td>
      <td>
        <select data-item-audience="${item.id}">
          <option value="human" ${item.audience === "human" || !item.audience ? "selected" : ""}>일반</option>
          <option value="infected" ${item.audience === "infected" ? "selected" : ""}>오염자</option>
          <option value="entity" ${item.audience === "entity" ? "selected" : ""}>괴이</option>
          <option value="all" ${item.audience === "all" ? "selected" : ""}>공통</option>
        </select>
      </td>
      <td>
        <select data-item-kind="${item.id}">
          <option value="regular" ${item.item_kind === "regular" || !item.item_kind ? "selected" : ""}>일반</option>
          <option value="life" ${item.item_kind === "life" ? "selected" : ""}>인생</option>
          <option value="mask_care" ${item.item_kind === "mask_care" ? "selected" : ""}>가면관리</option>
        </select>
      </td>
      <td><input class="table-input tiny" data-item-effect-type="${item.id}" value="${item.effect_type || "pollution_delta"}"></td>
      <td><input class="table-input tiny" type="number" data-item-effect-value="${item.id}" value="${item.effect_value || 0}"></td>
      <td class="image-manage-cell">
        <div class="current-image-name">${item.image_url ? "이미지 등록됨" : "이미지 없음"}</div>
        <label class="file-inline">파일 선택<input type="file" accept="image/*" data-item-file="${item.id}"></label>
      </td>
      <td><input class="table-input tiny" type="number" data-item-sort="${item.id}" value="${item.sort_order || 100}"></td>
      <td><input type="checkbox" data-item-active="${item.id}" ${item.is_active ? "checked" : ""}></td>
      <td class="action-cell">
        <button data-save-item="${item.id}">저장</button>
        <button data-delete-item="${item.id}" class="danger">삭제</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll("[data-save-item]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.saveItem;
      try {
        const file = document.querySelector(`[data-item-file="${id}"]`)?.files?.[0];
        const uploadedUrl = file ? await uploadItemImageFile(file) : "";
        const payload = {
          name: document.querySelector(`[data-item-name="${id}"]`).value.trim(),
          price: Number(document.querySelector(`[data-item-price="${id}"]`).value || 0),
          category: document.querySelector(`[data-item-category="${id}"]`).value,
          audience: document.querySelector(`[data-item-audience="${id}"]`)?.value || "human",
          item_kind: document.querySelector(`[data-item-kind="${id}"]`)?.value || "regular",
          effect_type: document.querySelector(`[data-item-effect-type="${id}"]`).value.trim() || "pollution_delta",
          effect_value: Number(document.querySelector(`[data-item-effect-value="${id}"]`).value || 0),
          image_url: uploadedUrl || document.querySelector(`[data-item-image="${id}"]`).value.trim() || null,
          sort_order: Number(document.querySelector(`[data-item-sort="${id}"]`).value || 100),
          is_active: document.querySelector(`[data-item-active="${id}"]`).checked
        };
        const file = document.querySelector(`[data-item-file="${id}"]`)?.files?.[0];
        if (file) {
          payload.image_url = await uploadItemImage(file, id);
        }

        const { error } = await supabase.from("items").update(payload).eq("id", id);
        if (error) throw error;
        showMessage("아이템 저장 완료", "success");
        await loadItems();
      } catch (error) {
        showMessage(error.message, "error");
      }
    });
  });

  document.querySelectorAll("[data-delete-item]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.deleteItem;
      const ok = confirm("이 아이템을 삭제할까요? 이미 지급/구매 기록이 있으면 삭제가 막힐 수 있습니다. 그 경우 판매중을 해제하세요.");
      if (!ok) return;
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) showMessage(error.message, "error");
      else showMessage("아이템 삭제 완료", "success");
      await loadItems();
    });
  });
}


async function loadCodes() {
  const { data, error } = await supabase
    .from("event_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  codes = data || [];

  qs("#codeList").innerHTML = codes.map(code => `
    <tr>
      <td><input class="table-input short" data-code-code="${code.id}" value="${code.code || ""}"></td>
      <td><input class="table-input short" data-code-title="${code.id}" value="${code.title || ""}"></td>
      <td><input class="table-input tiny" type="number" data-code-currency="${code.id}" value="${code.reward_currency || 0}"></td>
      <td><input class="table-input tiny" type="number" data-code-pollution="${code.id}" value="${code.pollution_delta || 0}"></td>
      <td><input type="checkbox" data-code-active="${code.id}" ${code.is_active ? "checked" : ""}></td>
      <td class="action-cell">
        <button data-save-code="${code.id}">저장</button>
        <button data-delete-code="${code.id}" class="danger">삭제</button>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6">생성된 코드 없음</td></tr>`;

  document.querySelectorAll("[data-save-code]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.saveCode;
      const payload = {
        code: document.querySelector(`[data-code-code="${id}"]`).value.trim().toUpperCase(),
        title: document.querySelector(`[data-code-title="${id}"]`).value.trim(),
        reward_currency: Number(document.querySelector(`[data-code-currency="${id}"]`).value || 0),
        pollution_delta: Number(document.querySelector(`[data-code-pollution="${id}"]`).value || 0),
        is_active: document.querySelector(`[data-code-active="${id}"]`).checked
      };
      const { error } = await supabase.from("event_codes").update(payload).eq("id", id);
      if (error) showMessage(error.message, "error");
      else showMessage("초대권 코드 저장 완료", "success");
      await loadCodes();
    });
  });

  document.querySelectorAll("[data-delete-code]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.deleteCode;
      const ok = confirm("이 초대권 코드를 삭제할까요? 제출 기록이 있으면 삭제가 막힐 수 있습니다. 그 경우 활성만 해제하세요.");
      if (!ok) return;
      const { error } = await supabase.from("event_codes").delete().eq("id", id);
      if (error) showMessage(error.message, "error");
      else showMessage("초대권 코드 삭제 완료", "success");
      await loadCodes();
    });
  });
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
    image_url: (await uploadItemImageFile(qs("#itemImageFile")?.files?.[0])) || qs("#itemImage").value.trim() || null,
    price: Number(qs("#itemPrice").value || 0),
    effect_type: qs("#itemEffectType").value.trim() || "pollution_delta",
    effect_value: Number(qs("#itemEffectValue").value || 0),
    audience: qs("#itemAudience")?.value || "human",
    item_kind: qs("#itemKind")?.value || "regular",
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
  await loadCodes();
});


async function loadPasswordRequests() {
  const { data, error } = await supabase
    .from("password_reset_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  qs("#passwordRequestList").innerHTML = (data || []).map(row => `
    <tr>
      <td>${row.login_id}</td>
      <td>${row.note || ""}</td>
      <td><span class="status ${row.status}">${row.status}</span></td>
      <td>${formatDate(row.created_at)}</td>
      <td>
        ${row.status === "pending" ? `<button data-resolve-password="${row.id}">처리 완료</button>` : "완료"}
      </td>
    </tr>
  `).join("") || `<tr><td colspan="5">요청 없음</td></tr>`;

  document.querySelectorAll("[data-resolve-password]").forEach(button => {
    button.addEventListener("click", async () => {
      const { data, error } = await supabase.rpc("admin_resolve_password_request", {
        p_request_id: button.dataset.resolvePassword
      });
      if (error) showMessage(error.message, "error");
      else showMessage(data.message || "처리 완료", "success");
      await loadPasswordRequests();
    });
  });
}

if (adminProfile) {
  Promise.all([loadUsers(), loadItems(), loadCodes(), loadSubmissions(), loadPasswordRequests()]).catch(error => {
    console.error(error);
    showMessage(error.message, "error");
  });
}
