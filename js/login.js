import { supabase } from "./supabaseClient.js";
import { qs, showMessage, renderNav } from "./common.js";

renderNav();

const signupForm = qs("#signupForm");
const loginForm = qs("#loginForm");

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

  showMessage("회원가입 완료. 이메일 확인 설정이 켜져 있다면 메일 확인 후 로그인하세요.", "success");
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

  location.href = "index.html";
});
