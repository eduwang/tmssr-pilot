import { auth } from "./firebaseConfig";
import { signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { observeAuthState } from "./authHelpers";
import Swal from "sweetalert2";

const db = getFirestore();
let currentUser = null;
let conversation = [];

document.addEventListener("DOMContentLoaded", () => {
  const speakerInput = document.getElementById("speaker-input");
  const messageInput = document.getElementById("message-input");
  const addMessageBtn = document.getElementById("add-message-btn");
  const undoBtn = document.getElementById("undo-btn");

  // 로그인 상태 확인
  observeAuthState(
    (user) => {
      currentUser = user;
      document.getElementById("user-name").textContent = `${user.displayName}님`;
    },
    () => {
      Swal.fire({
        icon: "warning",
        title: "로그인이 필요합니다",
        text: "메인 페이지로 이동합니다.",
        confirmButtonText: "확인",
      }).then(() => {
        window.location.href = "/index.html";
      });
    }
  );

  // 로그아웃
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await signOut(auth);
  });

  // Enter 키 입력 시 입력 버튼과 동일하게 처리
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addMessageBtn.click();
    }
  });

  // 입력 버튼 클릭 시 대화 추가 + speaker 입력창 초기화 및 포커스
  addMessageBtn.addEventListener("click", () => {
    const speaker = speakerInput.value.trim();
    const message = messageInput.value.trim();

    if (!speaker || !message) return;

    const chatEntry = { speaker, message };
    conversation.push(chatEntry);
    appendToConversationLog(chatEntry);

    messageInput.value = "";
    speakerInput.value = "";
    speakerInput.focus();
  });

  // 되돌리기 버튼 클릭 시 마지막 대화 삭제
  undoBtn.addEventListener("click", () => {
    if (conversation.length > 0) {
      conversation.pop();
      renderConversationLog();
    }
  });

  // 활동 완료하기 버튼 클릭 시 Firestore에 저장 (setDoc으로 덮어쓰기)
  document.getElementById("submit-btn").addEventListener("click", async () => {
    if (!currentUser) return;

    try {
      console.log("현재 UID:", currentUser.uid);
      console.log("저장하려는 문서 ID:", `${currentUser.uid}_page1`);

      // 저장 중 알림
      Swal.fire({
        title: "저장 중...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const docId = `${currentUser.uid}_page3`;
      await setDoc(doc(db, "lessonPlayResponses", docId), {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        email: currentUser.email,
        updatedAt: serverTimestamp(),
        conversation: conversation,
      });

      Swal.fire({
        icon: "success",
        title: "저장 완료!",
        text: "활동이 성공적으로 저장되었습니다.",
        confirmButtonText: "확인",
      });

      conversation = [];
      renderConversationLog();
    } catch (error) {
      console.error("저장 실패:", error);
      Swal.fire({
        icon: "error",
        title: "저장 실패",
        text: "다시 시도해주세요.",
        confirmButtonText: "닫기",
      });
    }
  });
});

// 화면에 대화 한 줄 추가
function appendToConversationLog({ speaker, message }) {
  const log = document.getElementById("conversation-log");
  const entry = document.createElement("p");
  entry.innerHTML = `<strong>${speaker}:</strong> ${message}`;
  log.appendChild(entry);
}

// 전체 대화 다시 렌더링 (되돌리기 등)
function renderConversationLog() {
  const log = document.getElementById("conversation-log");
  log.innerHTML = "";
  conversation.forEach((entry) => appendToConversationLog(entry));
}
