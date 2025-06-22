import { auth, provider } from "./firebaseConfig";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

document.addEventListener("DOMContentLoaded", () => {
  const loginButton = document.getElementById("login-btn");
  const logoutButton = document.getElementById("logout-btn");
  const userInfo = document.getElementById("user-info");
  const userName = document.getElementById("user-name");
  const pageButtons = document.getElementById("page-buttons");
  const adminBtn = document.getElementById("admin-btn"); // ✅ 관리자 버튼
  const adminUids = ["EKNhm9JciagtD3KzW3SoHREDKV73", "f1hiQjJJh8eqW87st7fCFaEeTGk1", "NjUNvEVGRCUUarEWFTuj52RIlBy2"]; // 예: ["abc123", "xyz789", "HW_WANG_UID"]



  // 로그인
  loginButton.addEventListener("click", async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      console.log("로그인 성공:", user);
    } catch (error) {
      console.error("로그인 실패:", error);
    }
  });

  // 로그아웃
  logoutButton.addEventListener("click", async () => {
    try {
      await signOut(auth);
      console.log("로그아웃 성공");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  });

  // 로그인 상태 감지 및 UI 반영
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginButton.style.display = "none";
      pageButtons.style.display = "flex";
      userInfo.style.display = "flex";
      userName.textContent = `${user.displayName} 님`;

    // ✅ admin UID 목록에 포함된 경우에만 관리자 버튼 표시
    if (adminUids.includes(user.uid) && adminBtn) {
      adminBtn.style.display = "block";
    }

    } else {
      loginButton.style.display = "block";
      pageButtons.style.display = "none";
      userInfo.style.display = "none";
      userName.textContent = "";
    }
  });
});
