import { supabase } from "./supabaseClient.js";
import { qs, showMessage, renderNav } from "./common.js";

renderNav();

const signupForm = qs("#signupForm");
const loginForm = qs("#loginForm");

function goHomeSoon() {
  setTimeout(() => {
    location.href = "index.html";
  }, 700);
}

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = qs("#signupEmail").value.trim();
  const password = qs("#signupPassword").value;
  const displayName = qs("#signupDisplayName").value.trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
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

  showMessage("회원가입은 완료되었습니다. 이메일 확인 설정이 켜져 있으면 메일 확인 후 로그인해야 합니다.", "success");
});

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = qs("#loginEmail").value.trim();
  const password = qs("#loginPassword").value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showMessage(error.message, "error");
    return;
  }

  showMessage("로그인 완료.", "success");
  goHomeSoon();
});
