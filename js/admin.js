// pollution-shop-version: v6.4-admin-password-reset
import { supabase } from "./supabaseClient.js";
import { qs, qsa, showMessage, requireAdmin, formatDate, revealMemberLinks, applyVisitorModeClass } from "./common.js";

await revealMemberLinks();
const adminProfile = await requireAdmin();
applyVisitorModeClass(adminProfile);

let users = [];
let items = [];
let codes = [];
let submissions = [];
let passwordRequests = [];
const pageSize = 10;
const pages = { users: 1, items: 1, codes: 1, submissions: 1, passwords: 1 };

const FALLBACK_CHARACTER_PRESETS = [
  {
    "character_key": "choi_agent_disaster_agency",
    "preset_label": "최 요원",
    "display_name": "최 요원",
    "organization_code": "disaster_agency",
    "department_code": "agent",
    "affiliation_label": "초자연 재난관리국 요원",
    "sort_order": 10,
    "is_active": true
  },
  {
    "character_key": "kim_soleum_baekildream_field",
    "preset_label": "김솔음",
    "display_name": "김솔음",
    "organization_code": "baekildream",
    "department_code": "field_exploration",
    "affiliation_label": "백일몽 주식회사 현장탐사팀",
    "sort_order": 20,
    "is_active": true
  },
  {
    "character_key": "kim_soleum_podo_disaster_agency",
    "preset_label": "김솔음(포도)",
    "display_name": "김솔음",
    "organization_code": "disaster_agency",
    "department_code": "agent",
    "affiliation_label": "초자연 재난관리국 요원",
    "sort_order": 30,
    "is_active": true
  },
  {
    "character_key": "kim_soleum_130666_baekildream_security",
    "preset_label": "김솔음(130666)",
    "display_name": "김솔음",
    "organization_code": "baekildream",
    "department_code": "security",
    "affiliation_label": "백일몽 주식회사 보안팀",
    "sort_order": 40,
    "is_active": true
  },
  {
    "character_key": "kim_soleum_mascot_golden_entity",
    "preset_label": "김솔음(마스코트 골든)",
    "display_name": "김솔음",
    "organization_code": "entity",
    "department_code": "entity",
    "affiliation_label": "괴이",
    "sort_order": 50,
    "is_active": true
  },
  {
    "character_key": "kim_soleum_host_friend_entity",
    "preset_label": "김솔음(사회자의 친구)",
    "display_name": "김솔음",
    "organization_code": "entity",
    "department_code": "entity",
    "affiliation_label": "괴이",
    "sort_order": 60,
    "is_active": true
  },
  {
    "character_key": "kim_soleum_segwang_student_entity",
    "preset_label": "김솔음(세광고 학생)",
    "display_name": "김솔음",
    "organization_code": "entity",
    "department_code": "entity",
    "affiliation_label": "괴이",
    "sort_order": 70,
    "is_active": true
  },
  {
    "character_key": "ryu_jaegwan_disaster_agency",
    "preset_label": "류재관",
    "display_name": "류재관",
    "organization_code": "disaster_agency",
    "department_code": "agent",
    "affiliation_label": "초자연 재난관리국 요원",
    "sort_order": 80,
    "is_active": true
  },
  {
    "character_key": "eun_haje_baekildream_field",
    "preset_label": "은하제",
    "display_name": "은하제",
    "organization_code": "baekildream",
    "department_code": "field_exploration",
    "affiliation_label": "백일몽 주식회사 현장탐사팀",
    "sort_order": 90,
    "is_active": true
  },
  {
    "character_key": "park_minseong_baekildream_field",
    "preset_label": "박민성",
    "display_name": "박민성",
    "organization_code": "baekildream",
    "department_code": "field_exploration",
    "affiliation_label": "백일몽 주식회사 현장탐사팀",
    "sort_order": 100,
    "is_active": true
  },
  {
    "character_key": "park_minseong_sprout_baekildream_security",
    "preset_label": "박민성(새싹반)",
    "display_name": "박민성",
    "organization_code": "baekildream",
    "department_code": "security",
    "affiliation_label": "백일몽 주식회사 보안팀",
    "sort_order": 110,
    "is_active": true
  },
  {
    "character_key": "lee_jahun_baekildream_field",
    "preset_label": "이자헌",
    "display_name": "이자헌",
    "organization_code": "baekildream",
    "department_code": "field_exploration",
    "affiliation_label": "백일몽 주식회사 현장탐사팀",
    "sort_order": 120,
    "is_active": true
  },
  {
    "character_key": "jang_heoun_baekildream_field",
    "preset_label": "장허운",
    "display_name": "장허운",
    "organization_code": "baekildream",
    "department_code": "field_exploration",
    "affiliation_label": "백일몽 주식회사 현장탐사팀",
    "sort_order": 130,
    "is_active": true
  },
  {
    "character_key": "jang_heoun_hwagal_disaster_agency",
    "preset_label": "장허운(화각)",
    "display_name": "장허운",
    "organization_code": "disaster_agency",
    "department_code": "agent",
    "affiliation_label": "초자연 재난관리국 요원",
    "sort_order": 140,
    "is_active": true
  },
  {
    "character_key": "jin_nasol_baekildream_field",
    "preset_label": "진나솔",
    "display_name": "진나솔",
    "organization_code": "baekildream",
    "department_code": "field_exploration",
    "affiliation_label": "백일몽 주식회사 현장탐사팀",
    "sort_order": 150,
    "is_active": true
  },
  {
    "character_key": "lee_seonghae_baekildream_field",
    "preset_label": "이성해",
    "display_name": "이성해",
    "organization_code": "baekildream",
    "department_code": "field_exploration",
    "affiliation_label": "백일몽 주식회사 현장탐사팀",
    "sort_order": 160,
    "is_active": true
  },
  {
    "character_key": "lee_gangheon_baekildream_field",
    "preset_label": "이강헌",
    "display_name": "이강헌",
    "organization_code": "baekildream",
    "department_code": "field_exploration",
    "affiliation_label": "백일몽 주식회사 현장탐사팀",
    "sort_order": 170,
    "is_active": true
  },
  {
    "character_key": "team_b_leader_baekildream_field",
    "preset_label": "B조 조장",
    "display_name": "B조 조장",
    "organization_code": "baekildream",
    "department_code": "field_exploration",
    "affiliation_label": "백일몽 주식회사 현장탐사팀",
    "sort_order": 180,
    "is_active": true
  },
  {
    "character_key": "j3_baekildream_security",
    "preset_label": "J3",
    "display_name": "J3",
    "organization_code": "baekildream",
    "department_code": "security",
    "affiliation_label": "백일몽 주식회사 보안팀",
    "sort_order": 190,
    "is_active": true
  },
  {
    "character_key": "haegeum_disaster_agency",
    "preset_label": "해금",
    "display_name": "해금",
    "organization_code": "disaster_agency",
    "department_code": "agent",
    "affiliation_label": "초자연 재난관리국 요원",
    "sort_order": 200,
    "is_active": true
  },
  {
    "character_key": "baek_sahyun_baekildream_field",
    "preset_label": "백사헌",
    "display_name": "백사헌",
    "organization_code": "baekildream",
    "department_code": "field_exploration",
    "affiliation_label": "백일몽 주식회사 현장탐사팀",
    "sort_order": 210,
    "is_active": true
  },
  {
    "character_key": "go_yeongeun_baekildream_field",
    "preset_label": "고영은",
    "display_name": "고영은",
    "organization_code": "baekildream",
    "department_code": "field_exploration",
    "affiliation_label": "백일몽 주식회사 현장탐사팀",
    "sort_order": 220,
    "is_active": true
  },
  {
    "character_key": "go_yeongeun_bakha_disaster_agency",
    "preset_label": "고영은(박하)",
    "display_name": "고영은",
    "organization_code": "disaster_agency",
    "department_code": "agent",
    "affiliation_label": "초자연 재난관리국 요원",
    "sort_order": 230,
    "is_active": true
  },
  {
    "character_key": "park_hongrim_disaster_agency",
    "preset_label": "박홍림",
    "display_name": "박홍림",
    "organization_code": "disaster_agency",
    "department_code": "agent",
    "affiliation_label": "초자연 재난관리국 요원",
    "sort_order": 240,
    "is_active": true
  },
  {
    "character_key": "chogae_disaster_agency",
    "preset_label": "초개",
    "display_name": "초개",
    "organization_code": "disaster_agency",
    "department_code": "agent",
    "affiliation_label": "초자연 재난관리국 요원",
    "sort_order": 250,
    "is_active": true
  },
  {
    "character_key": "gwak_jegang_baekildream_research",
    "preset_label": "곽제강",
    "display_name": "곽제강",
    "organization_code": "baekildream",
    "department_code": "research",
    "affiliation_label": "백일몽 주식회사 연구팀",
    "sort_order": 260,
    "is_active": true
  },
  {
    "character_key": "lee_yeonhwa_baekildream_research",
    "preset_label": "이연화",
    "display_name": "이연화",
    "organization_code": "baekildream",
    "department_code": "research",
    "affiliation_label": "백일몽 주식회사 연구팀",
    "sort_order": 270,
    "is_active": true
  },
  {
    "character_key": "baek_seokju_baekildream_field",
    "preset_label": "백석주",
    "display_name": "백석주",
    "organization_code": "baekildream",
    "department_code": "field_exploration",
    "affiliation_label": "백일몽 주식회사 현장탐사팀",
    "sort_order": 280,
    "is_active": true
  },
  {
    "character_key": "gang_ihak_baekildream_field",
    "preset_label": "강이학",
    "display_name": "강이학",
    "organization_code": "baekildream",
    "department_code": "field_exploration",
    "affiliation_label": "백일몽 주식회사 현장탐사팀",
    "sort_order": 290,
    "is_active": true
  },
  {
    "character_key": "ryu_jaegwan_lodge_keeper_entity",
    "preset_label": "류재관(산장지기)",
    "display_name": "류재관",
    "organization_code": "entity",
    "department_code": "entity",
    "affiliation_label": "괴이",
    "sort_order": 300,
    "is_active": true
  },
  {
    "character_key": "choi_agent_lucky_mart_entity",
    "preset_label": "최 요원(룩키마트)",
    "display_name": "최 요원",
    "organization_code": "entity",
    "department_code": "entity",
    "affiliation_label": "괴이",
    "sort_order": 310,
    "is_active": true
  },
  {
    "character_key": "ho_yuwon_entity",
    "preset_label": "호유원",
    "display_name": "호유원",
    "organization_code": "entity",
    "department_code": "entity",
    "affiliation_label": "괴이",
    "sort_order": 320,
    "is_active": true
  },
  {
    "character_key": "cheong_dallae_entity",
    "preset_label": "청달래",
    "display_name": "청달래",
    "organization_code": "entity",
    "department_code": "entity",
    "affiliation_label": "괴이",
    "sort_order": 330,
    "is_active": true
  },
  {
    "character_key": "brown_entity",
    "preset_label": "브라운",
    "display_name": "브라운",
    "organization_code": "entity",
    "department_code": "entity",
    "affiliation_label": "괴이",
    "sort_order": 340,
    "is_active": true
  },
  {
    "character_key": "blue_dragon_mascot_entity",
    "preset_label": "파란 용 마스코트",
    "display_name": "파란 용 마스코트",
    "organization_code": "entity",
    "department_code": "entity",
    "affiliation_label": "괴이",
    "sort_order": 350,
    "is_active": true
  }
];

function safeText(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function safeFileName(name) {
  return String(name || "item.png").toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, 80);
}

function deriveItemEffectType(itemKind) {
  if (itemKind === "contract_release") return "contract_release";
  if (itemKind === "life") return "entity_life";
  if (itemKind === "life_cancel") return "life_cancel";
  if (itemKind === "mask_care") return "mask_collapse_delta";
  return "pollution_delta";
}

function slicePage(rows, key) {
  const total = Math.max(1, Math.ceil(rows.length / pageSize));
  pages[key] = Math.min(Math.max(1, pages[key]), total);
  const start = (pages[key] - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}
function renderPager(targetId, key, totalRows, rerender) {
  let holder = qs(`#${targetId}`);
  if (!holder) {
    const tableBody = key === "users" ? qs("#userList") : key === "items" ? qs("#itemList") : key === "codes" ? qs("#codeList") : key === "submissions" ? qs("#submissionList") : qs("#passwordRequestList");
    holder = document.createElement("div");
    holder.id = targetId;
    holder.className = "pager";
    tableBody?.closest("table")?.after(holder);
  }
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  holder.innerHTML = `
    <button type="button" data-page-prev="${key}" ${pages[key] <= 1 ? "disabled" : ""}>이전</button>
    <span>${pages[key]} / ${totalPages}</span>
    <button type="button" data-page-next="${key}" ${pages[key] >= totalPages ? "disabled" : ""}>다음</button>
  `;
  holder.querySelector(`[data-page-prev="${key}"]`)?.addEventListener("click", () => { pages[key]--; rerender(); });
  holder.querySelector(`[data-page-next="${key}"]`)?.addEventListener("click", () => { pages[key]++; rerender(); });
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
function selectedUserIds() { return qsa("[data-user-check]:checked").map(input => input.value); }

function organizationOptions(selected) {
  const options = [
    ["baekildream", "백일몽 주식회사"],
    ["disaster_agency", "초자연 재난관리국"],
    ["entity", "괴이"],
    ["other", "기타"]
  ];
  const value = selected === "unaffiliated" ? "other" : (selected || "other");
  return options.map(([code, label]) => `<option value="${code}" ${code === value ? "selected" : ""}>${label}</option>`).join("");
}
function departmentOptions(selected) {
  const options = [
    ["field_exploration", "현장탐사팀"],
    ["research", "연구팀"],
    ["security", "보안팀"],
    ["agent", "요원"],
    ["entity", "괴이"],
    ["other", "기타"]
  ];
  const value = selected === "none" ? "other" : (selected || "other");
  return options.map(([code, label]) => `<option value="${code}" ${code === value ? "selected" : ""}>${label}</option>`).join("");
}

let characterPresets = [];

async function loadCharacterPresets() {
  const { data, error } = await supabase
    .from("character_presets")
    .select("character_key,preset_label,display_name,organization_code,department_code,affiliation_label,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("preset_label", { ascending: true });

  if (error) {
    console.warn("character_presets load failed, using fallback presets:", error.message);
    characterPresets = FALLBACK_CHARACTER_PRESETS;
    showMessage(`DB 캐릭터 프리셋을 불러오지 못해 내장 목록을 표시합니다. SQL 적용 상태를 확인하세요: ${error.message}`, "error");
    return;
  }

  characterPresets = (data && data.length > 0) ? data : FALLBACK_CHARACTER_PRESETS;
}

function characterPresetOptions(selectedKey) {
  const selected = selectedKey || "";
  const options = [`<option value="">캐릭터 선택</option>`];

  characterPresets.forEach(preset => {
    const nameForAdmin = preset.preset_label || preset.display_name;
    const label = `${nameForAdmin} · ${preset.affiliation_label}`;
    options.push(`<option value="${preset.character_key}" ${preset.character_key === selected ? "selected" : ""}>${safeText(label)}</option>`);
  });

  return options.join("");
}

function getCharacterPresetByKey(characterKey) {
  return characterPresets.find(preset => preset.character_key === characterKey) || null;
}

function applyCharacterPresetPreview(userId, characterKey) {
  const preset = getCharacterPresetByKey(characterKey);
  if (!preset) return;

  const displayInput = document.querySelector(`[data-display="${userId}"]`);
  const keyInput = document.querySelector(`[data-character-key="${userId}"]`);
  const orgSelect = document.querySelector(`[data-organization-code="${userId}"]`);
  const deptSelect = document.querySelector(`[data-department-code="${userId}"]`);
  const labelInput = document.querySelector(`[data-affiliation-label="${userId}"]`);

  if (displayInput) displayInput.value = preset.display_name || "";
  if (keyInput) keyInput.value = preset.character_key || "";
  if (orgSelect) orgSelect.value = preset.organization_code || "other";
  if (deptSelect) deptSelect.value = preset.department_code || "other";
  if (labelInput) labelInput.value = preset.affiliation_label || "기타";
}


async function applyCharacterPresetToUser(userId, characterKey) {
  if (!characterKey) return false;

  const { error } = await supabase.rpc("admin_apply_character_preset", {
    p_user_id: userId,
    p_character_key: characterKey
  });

  if (error) throw error;
  return true;
}



async function loadUsers() {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  users = data || [];
  pages.users = 1;
  renderUsers();
}

async function resetUserPasswordWithTemporaryPassword(userId, temporaryPassword) {
  if (!temporaryPassword || temporaryPassword.length < 8) {
    throw new Error("임시 비밀번호는 8자 이상으로 입력해 주세요.");
  }

  const { data, error } = await supabase.functions.invoke("admin-reset-password", {
    body: {
      user_id: userId,
      temporary_password: temporaryPassword
    }
  });

  if (error) {
    const message = error.message || "비밀번호 초기화 Edge Function 호출에 실패했습니다.";
    if (message.includes("not found") || message.includes("FunctionsHttpError") || message.includes("Failed to send")) {
      throw new Error(`${message} / admin-reset-password Edge Function 배포와 Secret 설정을 확인해 주세요.`);
    }
    throw new Error(message);
  }

  if (data && data.error) {
    throw new Error(data.error);
  }

  return data;
}

function renderUsers() {
  const rows = slicePage(users, "users");
  qs("#userList").innerHTML = rows.map(user => `
    <tr>
      <td><input type="checkbox" data-user-check value="${user.id}"></td>
      <td>${safeText(user.site_id)}</td>
      <td>${safeText(user.email || "")}</td>
      <td class="character-select-cell">
        <select class="table-input profile-character-select" data-character-preset="${user.id}">${characterPresetOptions(user.character_key)}</select>
        <input type="hidden" data-character-key="${user.id}" value="${safeText(user.character_key || "")}">
      </td>
      <td><input class="table-input" data-display="${user.id}" value="${safeText(user.display_name || "")}" placeholder="사용자 이름"></td>
      <td><select data-organization-code="${user.id}">${organizationOptions(user.organization_code || "other")}</select></td>
      <td><select data-department-code="${user.id}">${departmentOptions(user.department_code || "other")}</select></td>
      <td><input class="table-input" data-affiliation-label="${user.id}" value="${safeText(user.affiliation_label || "기타")}"></td>
      <td class="admin-temp-password-cell">
        <div class="admin-temp-password-wrap">
          <input class="table-input" type="password" autocomplete="new-password" data-temp-password="${user.id}" placeholder="임시 비밀번호">
          <button type="button" data-reset-password="${user.id}">초기화</button>
        </div>
      </td>
      <td><input class="table-input" data-band="${user.id}" value="${safeText(user.band_nickname || "")}"></td>
      <td>${Number(user.currency || 0)}</td>
      <td>${user.visitor_type === "entity" ? Number(user.mask_collapse_rate || 0) : Number(user.pollution || 0)}</td>
      <td>${safeText(user.status || "active")}</td>
      <td><select data-visitor-type="${user.id}"><option value="human" ${user.visitor_type === "human" || !user.visitor_type ? "selected" : ""}>일반</option><option value="infected" ${user.visitor_type === "infected" ? "selected" : ""}>오염자</option><option value="entity" ${user.visitor_type === "entity" ? "selected" : ""}>괴이</option></select></td>
      <td><select data-role="${user.id}"><option value="user" ${user.role === "user" ? "selected" : ""}>user</option><option value="admin" ${user.role === "admin" ? "selected" : ""}>admin</option></select></td>
      <td class="action-cell"><button data-save-user="${user.id}">저장</button>${user.id !== adminProfile.id ? `<button data-remove-user="${user.id}" class="danger">제거</button>` : ""}</td>
    </tr>`).join("") || `<tr><td colspan="15">회원 없음</td></tr>`;
  renderPager("userPager", "users", users.length, renderUsers);

  qsa("[data-reset-password]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = button.dataset.resetPassword;
      const input = document.querySelector(`[data-temp-password="${id}"]`);
      const temporaryPassword = input?.value || "";

      if (!confirm("이 회원의 비밀번호를 입력한 임시 비밀번호로 초기화할까요?")) return;

      button.disabled = true;
      const originalText = button.textContent;
      button.textContent = "처리 중...";

      try {
        await resetUserPasswordWithTemporaryPassword(id, temporaryPassword);
        if (input) input.value = "";
        showMessage("임시 비밀번호가 설정되었습니다.", "success");
      } catch (error) {
        showMessage(error.message || "비밀번호 초기화에 실패했습니다.", "error");
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  });

  qsa("[data-character-preset]").forEach(select => {
    select.addEventListener("change", () => {
      applyCharacterPresetPreview(select.dataset.characterPreset, select.value);
    });
  });
  qsa("[data-save-user]").forEach(button => button.addEventListener("click", async () => {
    const id = button.dataset.saveUser;
    const presetKey = document.querySelector(`[data-character-preset="${id}"]`)?.value || "";
    try {
      if (presetKey) {
        const preset = getCharacterPresetByKey(presetKey);
        if (preset) applyCharacterPresetPreview(id, presetKey);
        try {
          await applyCharacterPresetToUser(id, presetKey);
        } catch (rpcError) {
          console.warn("admin_apply_character_preset failed; falling back to admin_update_member:", rpcError.message);
          const { error: fallbackError } = await supabase.rpc("admin_update_member", {
            p_target_user_id: id,
            p_display_name: document.querySelector(`[data-display="${id}"]`).value,
            p_band_nickname: document.querySelector(`[data-band="${id}"]`).value,
            p_role: document.querySelector(`[data-role="${id}"]`).value,
            p_visitor_type: document.querySelector(`[data-visitor-type="${id}"]`).value,
            p_character_key: document.querySelector(`[data-character-key="${id}"]`).value,
            p_organization_code: document.querySelector(`[data-organization-code="${id}"]`).value,
            p_department_code: document.querySelector(`[data-department-code="${id}"]`).value,
            p_affiliation_label: document.querySelector(`[data-affiliation-label="${id}"]`).value
          });
          if (fallbackError) throw fallbackError;
        }
        showMessage("캐릭터 정보 저장 완료", "success");
        await loadUsers();
        return;
      }

      const { error } = await supabase.rpc("admin_update_member", {
        p_target_user_id: id,
        p_display_name: document.querySelector(`[data-display="${id}"]`).value,
        p_band_nickname: document.querySelector(`[data-band="${id}"]`).value,
        p_role: document.querySelector(`[data-role="${id}"]`).value,
        p_visitor_type: document.querySelector(`[data-visitor-type="${id}"]`).value,
        p_character_key: document.querySelector(`[data-character-key="${id}"]`).value,
        p_organization_code: document.querySelector(`[data-organization-code="${id}"]`).value,
        p_department_code: document.querySelector(`[data-department-code="${id}"]`).value,
        p_affiliation_label: document.querySelector(`[data-affiliation-label="${id}"]`).value
      });
      if (error) throw error;
      showMessage("방문객 정보 저장 완료", "success");
      await loadUsers();
    } catch (error) {
      showMessage(error.message, "error");
    }
  }));
  qsa("[data-remove-user]").forEach(button => button.addEventListener("click", async () => {
    if (!confirm("이 방문객 정보를 사이트 DB에서 제거할까요? Supabase Auth 실제 계정은 별도로 남을 수 있습니다.")) return;
    const { data, error } = await supabase.rpc("admin_remove_profile", { p_target_user_id: button.dataset.removeUser });
    if (error) showMessage(error.message, "error"); else showMessage(data?.message || "제거 완료", "success");
    await loadUsers();
  }));
}

async function loadItems() {
  const { data, error } = await supabase.from("items").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) throw error;
  items = data || [];
  const optionHtml = items.map(item => `<option value="${item.id}">${safeText(item.name)}</option>`).join("");
  if (qs("#adminItemSelect")) qs("#adminItemSelect").innerHTML = `<option value="">아이템 선택 안 함</option>${optionHtml}`;
  if (qs("#rewardItem")) qs("#rewardItem").innerHTML = `<option value="">아이템 없음</option>${optionHtml}`;
  pages.items = 1;
  renderItemsAdmin();
}
function renderItemsAdmin() {
  const rows = slicePage(items, "items");
  qs("#itemList").innerHTML = rows.map(item => `
    <tr>
      <td><input class="table-input short" data-item-name="${item.id}" value="${safeText(item.name || "")}"></td>
      <td><textarea class="table-textarea item-desc-edit" data-item-description="${item.id}">${safeText(item.description || "")}</textarea></td>
      <td><input class="table-input tiny" type="number" data-item-price="${item.id}" value="${Number(item.price || 0)}"></td>
      <td><select data-item-category="${item.id}"><option value="main" ${item.category === "main" ? "selected" : ""}>기념품</option><option value="cleanse" ${item.category === "cleanse" ? "selected" : ""}>스낵</option><option value="special" ${item.category === "special" ? "selected" : ""}>특별 상품</option><option value="event" ${item.category === "event" ? "selected" : ""}>초대권</option></select></td>
      <td><select data-item-audience="${item.id}"><option value="human" ${item.audience === "human" || !item.audience ? "selected" : ""}>일반</option><option value="infected" ${item.audience === "infected" ? "selected" : ""}>오염자</option><option value="entity" ${item.audience === "entity" ? "selected" : ""}>괴이</option><option value="all" ${item.audience === "all" ? "selected" : ""}>공통</option></select></td>
      <td><select data-item-kind="${item.id}"><option value="regular" ${item.item_kind === "regular" || !item.item_kind ? "selected" : ""}>일반</option><option value="life" ${item.item_kind === "life" ? "selected" : ""}>인생</option><option value="mask_care" ${item.item_kind === "mask_care" ? "selected" : ""}>가면관리</option><option value="life_cancel" ${item.item_kind === "life_cancel" ? "selected" : ""}>인생해제</option><option value="contract_release" ${item.item_kind === "contract_release" ? "selected" : ""}>계약해제</option></select></td>
      <td><input class="table-input tiny" type="number" data-item-effect-value="${item.id}" value="${Number(item.effect_value || 0)}"></td>
      <td class="image-manage-cell"><input class="file-only-input" type="file" accept="image/*" data-item-file="${item.id}"></td>
      <td><input class="table-input tiny" type="number" data-item-sort="${item.id}" value="${Number(item.sort_order || 100)}"></td>
      <td><input type="checkbox" data-item-active="${item.id}" ${item.is_active ? "checked" : ""}></td>
      <td class="action-cell"><button data-save-item="${item.id}">저장</button><button data-delete-item="${item.id}" class="danger">삭제</button></td>
    </tr>`).join("") || `<tr><td colspan="11">등록된 아이템 없음</td></tr>`;
  renderPager("itemPager", "items", items.length, renderItemsAdmin);
  qsa("[data-save-item]").forEach(button => button.addEventListener("click", async () => {
    const id = button.dataset.saveItem;
    const current = items.find(item => String(item.id) === String(id));
    try {
      const file = document.querySelector(`[data-item-file="${id}"]`)?.files?.[0];
      const uploadedUrl = file ? await uploadItemImageFile(file) : "";
      const itemKind = document.querySelector(`[data-item-kind="${id}"]`).value;
      const payload = {
        name: document.querySelector(`[data-item-name="${id}"]`).value.trim(),
        description: document.querySelector(`[data-item-description="${id}"]`).value.trim(),
        price: Number(document.querySelector(`[data-item-price="${id}"]`).value || 0),
        category: document.querySelector(`[data-item-category="${id}"]`).value,
        audience: document.querySelector(`[data-item-audience="${id}"]`).value,
        item_kind: itemKind,
        effect_type: deriveItemEffectType(itemKind),
        effect_value: Number(document.querySelector(`[data-item-effect-value="${id}"]`).value || 0),
        image_url: uploadedUrl || current?.image_url || null,
        sort_order: Number(document.querySelector(`[data-item-sort="${id}"]`).value || 100),
        is_active: document.querySelector(`[data-item-active="${id}"]`).checked
      };
      const { error } = await supabase.from("items").update(payload).eq("id", id);
      if (error) throw error;
      showMessage("아이템 저장 완료", "success");
      await loadItems();
    } catch (error) { showMessage(error.message, "error"); }
  }));
  qsa("[data-delete-item]").forEach(button => button.addEventListener("click", async () => {
    if (!confirm("이 아이템을 삭제할까요? 이미 지급/구매 기록이 있으면 삭제가 막힐 수 있습니다. 그 경우 판매중을 해제하세요.")) return;
    const { error } = await supabase.from("items").delete().eq("id", button.dataset.deleteItem);
    if (error) showMessage(error.message, "error"); else showMessage("아이템 삭제 완료", "success");
    await loadItems();
  }));
}

async function loadCodes() {
  const { data, error } = await supabase.from("event_codes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  codes = data || [];
  pages.codes = 1;
  renderCodes();
}
function renderCodes() {
  const rows = slicePage(codes, "codes");
  qs("#codeList").innerHTML = rows.map(code => `
    <tr><td><input class="table-input short" data-code-code="${code.id}" value="${safeText(code.code || "")}"></td><td><input class="table-input short" data-code-title="${code.id}" value="${safeText(code.title || "")}"></td><td><input class="table-input tiny" type="number" data-code-currency="${code.id}" value="${Number(code.reward_currency || 0)}"></td><td><input class="table-input tiny" type="number" data-code-pollution="${code.id}" value="${Number(code.pollution_delta || 0)}"></td><td><input type="checkbox" data-code-active="${code.id}" ${code.is_active ? "checked" : ""}></td><td class="action-cell"><button data-save-code="${code.id}">저장</button><button data-delete-code="${code.id}" class="danger">삭제</button></td></tr>`).join("") || `<tr><td colspan="6">생성된 코드 없음</td></tr>`;
  renderPager("codePager", "codes", codes.length, renderCodes);
  qsa("[data-save-code]").forEach(button => button.addEventListener("click", async () => {
    const id = button.dataset.saveCode;
    const payload = { code: document.querySelector(`[data-code-code="${id}"]`).value.trim().toUpperCase(), title: document.querySelector(`[data-code-title="${id}"]`).value.trim(), reward_currency: Number(document.querySelector(`[data-code-currency="${id}"]`).value || 0), pollution_delta: Number(document.querySelector(`[data-code-pollution="${id}"]`).value || 0), is_active: document.querySelector(`[data-code-active="${id}"]`).checked };
    const { error } = await supabase.from("event_codes").update(payload).eq("id", id);
    if (error) showMessage(error.message, "error"); else showMessage("초대권 코드 저장 완료", "success");
    await loadCodes();
  }));
  qsa("[data-delete-code]").forEach(button => button.addEventListener("click", async () => {
    if (!confirm("이 초대권 코드를 삭제할까요? 제출 기록이 있으면 삭제가 막힐 수 있습니다. 그 경우 활성만 해제하세요.")) return;
    const { error } = await supabase.from("event_codes").delete().eq("id", button.dataset.deleteCode);
    if (error) showMessage(error.message, "error"); else showMessage("초대권 코드 삭제 완료", "success");
    await loadCodes();
  }));
}

async function loadSubmissions() {
  const { data, error } = await supabase.from("event_submissions").select("*, profile:profiles!event_submissions_user_id_fkey(site_id, email, display_name, band_nickname), event_code:event_codes(code, title, reward_currency, pollution_delta)").order("submitted_at", { ascending: false });
  if (error) throw error;
  submissions = data || [];
  pages.submissions = 1;
  renderSubmissions();
}
function renderSubmissions() {
  const rows = slicePage(submissions, "submissions");
  qs("#submissionList").innerHTML = rows.map(row => `
    <tr><td>${safeText(row.profile?.site_id || "")}</td><td>${safeText(row.profile?.display_name || "")}</td><td>${safeText(row.profile?.band_nickname || "")}</td><td>${safeText(row.event_code?.code || "")}</td><td>${safeText(row.event_code?.title || "")}</td><td><span class="status ${row.status}">${safeText(row.status)}</span></td><td>${formatDate(row.submitted_at)}</td><td>${row.status === "pending" ? `<input class="table-input" placeholder="관리자 메모" data-note="${row.id}"><button data-approve="${row.id}">승인</button><button data-reject="${row.id}" class="danger">거절</button>` : safeText(row.admin_note || "")}<button data-delete-submission="${row.id}" class="danger">내역 삭제</button></td></tr>`).join("") || `<tr><td colspan="8">제출 없음</td></tr>`;
  renderPager("submissionPager", "submissions", submissions.length, renderSubmissions);
  qsa("[data-approve]").forEach(button => button.addEventListener("click", async () => reviewSubmission(button.dataset.approve, true)));
  qsa("[data-reject]").forEach(button => button.addEventListener("click", async () => reviewSubmission(button.dataset.reject, false)));
  qsa("[data-delete-submission]").forEach(button => button.addEventListener("click", async () => {
    if (!confirm("이 초대권 제출 내역을 삭제할까요? 테스트 재등록을 위해 삭제하는 용도입니다.")) return;
    const { data, error } = await supabase.rpc("admin_delete_submission", { p_submission_id: button.dataset.deleteSubmission });
    if (error) showMessage(error.message, "error"); else showMessage(data?.message || "내역 삭제 완료", "success");
    await loadSubmissions();
  }));
}
async function reviewSubmission(id, approve) {
  const note = document.querySelector(`[data-note="${id}"]`)?.value || "";
  const { error } = await supabase.rpc("admin_review_submission", { p_submission_id: id, p_approve: approve, p_admin_note: note });
  if (error) showMessage(error.message, "error"); else showMessage(approve ? "승인 완료" : "거절 완료", "success");
  await Promise.all([loadUsers(), loadSubmissions()]);
}

async function loadPasswordRequests() {
  const { data, error } = await supabase.from("password_reset_requests").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  passwordRequests = data || [];
  pages.passwords = 1;
  renderPasswordRequests();
}
function renderPasswordRequests() {
  const rows = slicePage(passwordRequests, "passwords");
  qs("#passwordRequestList").innerHTML = rows.map(row => `<tr><td>${safeText(row.login_id || row.site_id || "")}</td><td>${safeText(row.note || row.memo || "")}</td><td><span class="status ${row.status}">${safeText(row.status)}</span></td><td>${formatDate(row.created_at)}</td><td>${row.status === "pending" ? `<button data-resolve-password="${row.id}">처리 완료</button>` : "완료"}</td></tr>`).join("") || `<tr><td colspan="5">요청 없음</td></tr>`;
  renderPager("passwordPager", "passwords", passwordRequests.length, renderPasswordRequests);
  qsa("[data-resolve-password]").forEach(button => button.addEventListener("click", async () => {
    const { data, error } = await supabase.rpc("admin_resolve_password_request", { p_request_id: button.dataset.resolvePassword });
    if (error) showMessage(error.message, "error"); else showMessage(data?.message || "처리 완료", "success");
    await loadPasswordRequests();
  }));
}

qs("#adjustForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const ids = selectedUserIds();
  if (ids.length === 0) { showMessage("선택된 회원이 없습니다.", "error"); return; }
  const { data, error } = await supabase.rpc("admin_bulk_grant", { p_target_user_ids: ids, p_currency_delta: Number(qs("#adjustCurrency").value || 0), p_pollution_delta: Number(qs("#adjustPollution").value || 0), p_item_id: qs("#adminItemSelect").value || null, p_item_quantity: Number(qs("#adminItemQty").value || 0), p_reason: qs("#adjustReason").value || "관리자 일괄 조정" });
  if (error) { showMessage(error.message, "error"); return; }
  showMessage(`${data.count}명 처리 완료`, "success");
  await Promise.all([loadUsers(), loadItems()]);
});
qs("#itemForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const file = qs("#itemImageFile")?.files?.[0];
    const imageUrl = file ? await uploadItemImageFile(file) : null;
    const itemKind = qs("#itemKind")?.value || "regular";
    const payload = { name: qs("#itemName").value.trim(), description: qs("#itemDescription").value.trim(), image_url: imageUrl, price: Number(qs("#itemPrice").value || 0), category: qs("#itemCategory")?.value || "main", effect_type: deriveItemEffectType(itemKind), effect_value: Number(qs("#itemEffectValue").value || 0), audience: qs("#itemAudience")?.value || "human", item_kind: itemKind, is_active: qs("#itemActive").checked, sort_order: Number(qs("#itemSort").value || 100) };
    const { error } = await supabase.from("items").insert(payload);
    if (error) throw error;
    showMessage("선물 등록 완료", "success"); qs("#itemForm").reset(); qs("#itemActive").checked = true; await loadItems();
  } catch (error) { showMessage(error.message, "error"); }
});
qs("#eventCodeForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = { code: qs("#newCode").value.trim().toUpperCase(), title: qs("#codeTitle").value.trim(), description: qs("#codeDescription").value.trim(), reward_currency: Number(qs("#rewardCurrency").value || 0), pollution_delta: Number(qs("#codePollution").value || 0), reward_item_id: qs("#rewardItem").value || null, reward_item_quantity: Number(qs("#rewardItemQty").value || 0), is_active: true };
  const { error } = await supabase.from("event_codes").insert(payload);
  if (error) showMessage(error.message, "error"); else { showMessage("초대권 생성 완료", "success"); qs("#eventCodeForm").reset(); await loadCodes(); }
});

if (adminProfile) {
  (async () => {
    try {
      await loadCharacterPresets();
      await Promise.all([loadUsers(), loadItems(), loadCodes(), loadSubmissions(), loadPasswordRequests()]);
    } catch (error) {
      console.error(error);
      showMessage(error.message, "error");
    }
  })();
}
