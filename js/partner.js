import * as config from "./config.js";
import { qs, showMessage, getMyProfile, revealMemberLinks } from "./common.js";

await revealMemberLinks();
const profile = await getMyProfile();

const normalText = {
  warning: "단, 이 버튼을 누름으로써 발생하는 공포, 환청, ■■, ■■■■ 등의 문제에 대하여 골든 리조트는 일체의 배상책임이 없습니다.",
  play: "우 리 같 이 놀 자",
  whisper: "안녕하십니까. 이 밤의 즐거움, 매일 만나는 새로운 얼굴. 그리고 친근한 당신의 사회자! 안녕하십니까. 여긴 심야 토크쇼입니다! 오늘의 게스트로 초대된 당신을 환영합니다."
};

function showNotFoundOverlay() {
  const modal = document.createElement("div");
  modal.className = "not-found-overlay open";
  modal.innerHTML = `<div class="not-found-box"><h2>404 NOT FOUND</h2><p>■■■■■■■■■■■■■■■■■■■■■■</p></div>`;
  document.body.appendChild(modal);
  setTimeout(() => {
    modal.classList.remove("open");
    setTimeout(() => modal.remove(), 350);
  }, 1150);
}

function blockify(text, count) {
  let chars = Array.from(text);
  return chars.map((ch, i) => {
    if (ch === " " || ch === "\n") return ch;
    return i < count ? "■" : ch;
  }).join("");
}

function fillComeHere(target, length) {
  const base = "이리와";
  let out = "";
  while (out.length < length) out += base;
  return out.slice(0, Math.max(length, 18));
}

function renderNormalInvite() {
  const content = qs("#inviteDynamicContent");
  qs("#inviteLead").textContent = "수신 상태가 불안정합니다.";
  content.innerHTML = `
    <p id="inviteWarning" class="glitch-source">${normalText.warning}</p>
    <p id="invitePlay" class="play-with-us">${normalText.play}</p>
    <p id="inviteWhisper" class="midnight-whisper">${normalText.whisper}</p>
    <p id="inviteFinal" class="audience-invite" hidden>심야토크쇼의 방청객으로 초대되셨습니다.</p>
    <button id="openInviteBtn" type="button" hidden>방청하기</button>
  `;

  const warning = qs("#inviteWarning");
  const play = qs("#invitePlay");
  const whisper = qs("#inviteWhisper");
  const final = qs("#inviteFinal");
  const button = qs("#openInviteBtn");
  const maxLen = Math.max(normalText.warning.length, normalText.play.length, normalText.whisper.length);
  let step = 0;
  const timer = setInterval(() => {
    step += 3;
    warning.textContent = blockify(normalText.warning, step);
    play.textContent = step > maxLen * 0.35 ? fillComeHere(normalText.play, normalText.play.length + 8) : blockify(normalText.play, step);
    whisper.textContent = step > maxLen * 0.55 ? fillComeHere(normalText.whisper, normalText.whisper.length) : blockify(normalText.whisper, step);

    if (step >= maxLen + 18) {
      clearInterval(timer);
      warning.textContent = "";
      play.textContent = fillComeHere(normalText.play, normalText.play.length + 8);
      whisper.textContent = fillComeHere(normalText.whisper, normalText.whisper.length);
      final.hidden = false;
      button.hidden = false;
      qs("#inviteLead").textContent = "심야토크쇼의 방청객으로 초대되셨습니다.";
    }
  }, 80);
}

function renderEntityInvite() {
  document.body.classList.add("entity-mode", "entity-invite-page");
  qs("#inviteLead").textContent = "게스트 확인이 완료되었습니다.";
  qs("#inviteDynamicContent").innerHTML = `
    <p class="entity-welcome">어서 오세요, 게스트님.</p>
    <p class="entity-copy">당신은 심야 토크쇼의 게스트로 초대되었습니다.<br>오늘도 멋진 경험담 들려주세요.</p>
    <p class="entity-smile">😊</p>
    <button id="openInviteBtn" type="button">참여하기</button>
  `;
}

async function claimInvitationIfPossible() {
  try {
    const { error } = await supabase.rpc("claim_partner_invitation");
    if (error && !String(error.message).includes("이미")) console.warn(error.message);
  } catch (error) {
    console.warn(error.message);
  }
}

document.addEventListener("click", async (event) => {
  if (event.target?.id !== "openInviteBtn") return;
  await claimInvitationIfPossible();
  const url = config.BAND_INVITE_URL || "https://band.us/";
  if (!url || url === "#" || url === "https://band.us/") {
    showMessage("아직 특별관 연결 주소가 설정되지 않았습니다. js/config.js에 BAND_INVITE_URL을 추가하세요.", "error");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
});

showNotFoundOverlay();
setTimeout(() => {
  if (profile?.visitor_type === "entity") renderEntityInvite();
  else renderNormalInvite();
}, 900);
