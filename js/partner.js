import * as config from "./config.js";
import { qs, showMessage, getMyProfile, revealMemberLinks, applyVisitorModeClass } from "./common.js";

await revealMemberLinks();

const profile = await getMyProfile();
applyVisitorModeClass(profile);

const REDACTED_TEXT = "■, 이 ■■■ ■■■■■ ■■■■ ■■, ■■, ■■, ■■■■ ■■ ■■■ ■■■ ■■ 리■■■ ■■■ ■■■■와 ■■■■.";
const COME_HERE_TEXT = "이리와".repeat(90);

function showNotFoundOverlay() {
  let modal = document.createElement("div");
  modal.className = "not-found-overlay open";
  modal.innerHTML = `
    <div class="not-found-box">
      <h2>404 NOT FOUND</h2>
      <p>■■■■■■■■■■■■■■■■■■■■■■</p>
    </div>
  `;
  document.body.appendChild(modal);

  setTimeout(() => {
    modal.classList.remove("open");
    setTimeout(() => modal.remove(), 350);
  }, 1050);
}

function typeText(node, text, interval = 18) {
  return new Promise(resolve => {
    node.textContent = "";
    let i = 0;
    const timer = setInterval(() => {
      node.textContent += text[i] || "";
      i += 1;
      if (i >= text.length) {
        clearInterval(timer);
        resolve();
      }
    }, interval);
  });
}

async function renderHumanInvite() {
  const content = qs("#inviteDynamicContent");
  qs("#inviteLead").textContent = "수신 중입니다.";

  content.innerHTML = `
    <p id="redactedLine" class="invite-corrupt-copy"></p>
    <p id="comeHereLine" class="invite-corrupt-copy come-here-wall" hidden></p>
    <p id="audienceInvite" class="audience-invite" hidden>심야토크쇼의 방청객으로 초대되셨습니다.</p>
    <button id="openInviteBtn" type="button" hidden>방청하기</button>
  `;

  const redacted = qs("#redactedLine");
  const comeHere = qs("#comeHereLine");
  const audience = qs("#audienceInvite");
  const button = qs("#openInviteBtn");

  await typeText(redacted, REDACTED_TEXT, 24);
  await new Promise(r => setTimeout(r, 420));
  redacted.hidden = true;

  comeHere.hidden = false;
  await typeText(comeHere, COME_HERE_TEXT, 5);
  await new Promise(r => setTimeout(r, 350));

  audience.hidden = false;
  await new Promise(r => setTimeout(r, 260));
  button.hidden = false;
}

function renderEntityInvite() {
  const content = qs("#inviteDynamicContent");
  qs("#inviteLead").textContent = "게스트 확인이 완료되었습니다.";
  content.innerHTML = `
    <p class="entity-welcome">어서 오세요, 게스트님.</p>
    <p class="entity-copy">당신은 심야 토크쇼의 게스트로 초대되었습니다.<br>오늘도 멋진 경험담 들려주세요.</p>
    <p class="entity-smile">😊</p>
    <button id="openInviteBtn" type="button">참여하기</button>
  `;
}

function renderInvite() {
  if (profile?.visitor_type === "entity") {
    document.body.classList.add("entity-invite-page");
    renderEntityInvite();
  } else {
    renderHumanInvite();
  }
}

function wireInviteButton() {
  document.addEventListener("click", (event) => {
    if (event.target?.id !== "openInviteBtn") return;

    const url = config.BAND_INVITE_URL || "https://band.us/";

    if (!url || url === "#" || url === "https://band.us/") {
      showMessage("아직 특별관 연결 주소가 설정되지 않았습니다. js/config.js에 BAND_INVITE_URL을 추가하세요.", "error");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  });
}

showNotFoundOverlay();
setTimeout(renderInvite, 1120);
wireInviteButton();
