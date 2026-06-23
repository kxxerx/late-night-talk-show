import { supabase } from "./supabaseClient.js";
import { qs, showMessage, renderNav, authEmailFromLoginId, revealMemberLinks } from "./common.js";

await revealMemberLinks();
renderNav();

const signupForm = qs("#signupForm");
const loginForm = qs("#loginForm");

function goHomeSoon() {
  setTimeout(() => {
    location.href = "index.html";
  }, 700);
}

function normalizeLoginId(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const loginId = normalizeLoginId(qs("#signupLoginId").value);
  const password = qs("#signupPassword").value;
  const displayName = "익명";

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
        display_name: displayName
      }
    }
  });

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  if (data?.session) {
    showMessage("회원가입 완료. 자동 로그인되었습니다.", "success");
    goHomeSoon();
    return;
  }

  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (!loginError && loginData?.session) {
    showMessage("회원가입 완료. 자동 로그인되었습니다.", "success");
    goHomeSoon();
    return;
  }

  showMessage("회원가입은 완료되었습니다. 이메일 확인 설정이 켜져 있으면 로그인이 막힐 수 있습니다.", "success");
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const loginId = qs("#loginId").value.trim();
  const password = qs("#loginPassword").value;
  const email = authEmailFromLoginId(loginId);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage("로그인 실패: 아이디 또는 비밀번호를 확인하세요.", "error");
    return;
  }

  showMessage("로그인 완료.", "success");
  goHomeSoon();
});
