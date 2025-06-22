import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { marked } from 'marked';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { firebaseConfig } from "./firebaseConfig";

// 🔧 Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🔐 관리자 UID만 접근 허용
const allowedAdmins = ["EKNhm9JciagtD3KzW3SoHREDKV73", "f1hiQjJJh8eqW87st7fCFaEeTGk1", "NjUNvEVGRCUUarEWFTuj52RIlBy2"];

const userSelect = document.getElementById("user-select");
const resultsContainer = document.getElementById("results-container");

let allUsers = [];

// ✅ 인증 후 관리자 확인 및 초기화
document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      const currentUid = user.uid;
      if (!allowedAdmins.includes(currentUid)) {
        alert("접근 권한이 없습니다.");
        window.location.href = "/";
      } else {
        console.log("✅ 관리자 확인 완료:", currentUid);
        initAdminPage();
      }
    } else {
      alert("로그인이 필요합니다.");
      window.location.href = "/";
    }
  });
});

// ✅ 관리자 페이지 초기화
async function initAdminPage() {
  await loadAllUsers();
  userSelect.addEventListener("change", handleUserSelection);
  handleUserSelection(); // 기본 전체 보기
}

// ✅ Firestore에서 사용자 목록 로드
async function loadAllUsers() {
  const snapshot = await getDocs(collection(db, "lessonPlayResponses"));
  const userMap = new Map();

  snapshot.forEach(doc => {
    const data = doc.data();
    const uid = data.uid;
    const displayName = data.displayName || uid;
    if (!userMap.has(uid)) {
      userMap.set(uid, displayName);
    }
  });

  allUsers = Array.from(userMap.entries()).map(([uid, displayName]) => ({ uid, displayName }));

  allUsers.forEach(user => {
    const option = document.createElement("option");
    option.value = user.uid;
    option.textContent = user.displayName;
    userSelect.appendChild(option);
  });
}

// ✅ 사용자 선택 핸들링 및 결과 출력
async function handleUserSelection() {
  const selectedUid = userSelect.value;
  resultsContainer.innerHTML = "";

  const usersToShow = selectedUid === "all" ? allUsers : allUsers.filter(user => user.uid === selectedUid);

  for (const user of usersToShow) {
    const userBox = document.createElement("div");
    userBox.classList.add("user-result");

    const name = document.createElement("div");
    name.classList.add("user-name");
    name.textContent = `사용자: ${user.displayName}`;
    userBox.appendChild(name);

    const pageWrapper = document.createElement("div");
    pageWrapper.classList.add("page-columns");

    const page1 = await loadPageData(user.uid, "page1");
    const page2 = await loadPageData(user.uid, "page2");
    const page3 = await loadPageData(user.uid, "page3");

    pageWrapper.appendChild(renderPageBox("Page 2", page2, "page2"));
    pageWrapper.appendChild(renderPageBox("Page 1", page1, "page1"));
    pageWrapper.appendChild(renderPageBox("Page 3", page3, "page3"));

    userBox.appendChild(pageWrapper);
    resultsContainer.appendChild(userBox);
  }

  // ❌ 자동 스크롤 제거됨
  // (문제 해결 핵심 조치)
}

// ✅ 페이지별 데이터 로드
async function loadPageData(uid, pageKey) {
  const docRef = doc(db, "lessonPlayResponses", `${uid}_${pageKey}`);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

// ✅ 페이지 박스 렌더링
function renderPageBox(title, data, pageKey) {
  const box = document.createElement("div");
  box.classList.add(pageKey, "page-box");

  const pageTitle = document.createElement("div");
  pageTitle.classList.add("page-title");

  // 시간 포맷 추가
  let formattedTime = "";
  if (data?.updatedAt?.toDate) {
    const date = data.updatedAt.toDate();
    formattedTime = ` (${date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })})`;
  }

  pageTitle.textContent = `${title}${formattedTime}`;
  box.appendChild(pageTitle);

  if (!data) {
    box.innerHTML += "<p><em>아직 결과 없음</em></p>";
    return box;
  }

  if (pageKey === "page2") {
    const conv = document.createElement("div");
    conv.style.whiteSpace = "pre-wrap";
    conv.style.backgroundColor = "#fff";
    conv.style.padding = "10px";
    conv.style.borderRadius = "8px";
    conv.style.marginBottom = "1rem";

    const lines = (data.conversation || "").split('\n').map(line =>
      line.startsWith("👩‍🏫") ? `<span class="teacher-line">${line}</span>` : line
    );
    conv.innerHTML = lines.join('<br>');
    box.appendChild(conv);

    const feedback = document.createElement("div");
    feedback.innerHTML = marked.parse(data.feedback || "(피드백 없음)");
    box.appendChild(feedback);

  } else if (Array.isArray(data.conversation)) {
    data.conversation.forEach(entry => {
      const p = document.createElement("p");
      p.innerHTML = `<strong>${entry.speaker}:</strong> ${entry.message}`;
      box.appendChild(p);
    });
  } else {
    box.innerHTML += "<p><em>대화 없음</em></p>";
  }

  return box;
}
