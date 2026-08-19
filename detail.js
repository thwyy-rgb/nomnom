import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDQCed1Led55t9s8deU1BZSpkVe1oSt-oU",
  authDomain: "nomnom-42f0b.firebaseapp.com",
  projectId: "nomnom-42f0b",
  storageBucket: "nomnom-42f0b.firebasestorage.app",
  messagingSenderId: "1011885827413",
  appId: "1:1011885827413:web:56a91e6298d8f219dc7bdc",
  measurementId: "G-75C54T7XFC",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let activePostId = null;

const urlParams = new URLSearchParams(window.location.search);
activePostId = urlParams.get("id");

onAuthStateChanged(auth, (user) => {
  const commentForm = document.getElementById("commentForm");
  const commentAuthWarning = document.getElementById("commentAuthWarning");
  const currentUserAvatar = document.getElementById("currentUserAvatar");

  if (user) {
    currentUser = user;
    if (commentForm) commentForm.style.display = "flex";
    if (commentAuthWarning) commentAuthWarning.style.display = "none";
    if (currentUserAvatar) {
      currentUserAvatar.src =
        user.photoURL || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";
    }
  } else {
    currentUser = null;
    if (commentForm) commentForm.style.display = "none";
    if (commentAuthWarning) commentAuthWarning.style.display = "block";
  }

  if (activePostId) {
    loadPostDetail(activePostId);
    listenToComments(activePostId);
  } else {
    document.getElementById("viewPostDetailArea").innerHTML = `
      <div style="text-align:center; padding: 40px 0; color:#ff4d4f;">
         <i class="fas fa-exclamation-triangle" style="font-size: 32px;"></i>
         <p style="margin-top:10px; font-weight:600;">Không tìm thấy bài viết yêu cầu!</p>
      </div>`;
  }
});

function renderVideoElement(videoUrl) {
  if (!videoUrl) return "";

  const youtubeRegExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = videoUrl.match(youtubeRegExp);

  if (match && match[2].length === 11) {
    const videoId = match[2];
    return `
      <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin-top: 10px; border-radius: 8px; border: 1px solid #e1e1e1;">
        <iframe src="https://www.youtube.com/embed/${videoId}" 
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border:0;" 
                allowfullscreen></iframe>
      </div>
    `;
  }

  return `
    <div style="margin-top: 10px;">
      <a href="${videoUrl}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; background: #3498db; color: white; text-decoration: none; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600;">
        <i class="fas fa-play-circle"></i> Xem video hướng dẫn
      </a>
    </div>
  `;
}

async function loadPostDetail(postId) {
  try {
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      document.getElementById("viewPostDetailArea").innerHTML =
        `<p style="color:red; text-align:center;">Bài viết không tồn tại!</p>`;
      return;
    }

    const post = postSnap.data();
    document.title = `${post.foodName} - NomNom`;

    const isPostOwner = post.userId === currentUser?.uid;

    const authorAvatar = isPostOwner
      ? currentUser?.photoURL ||
        "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"
      : post.userAvatar ||
        "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";

    const authorName = isPostOwner
      ? currentUser?.displayName || "Thành viên"
      : post.userName || "Thành viên";

    let detailHTML = `
      <h1 style="font-size: 24px; font-weight: 800; color: #1e272e; margin-bottom: 12px;">${post.foodName}</h1>
      <div id="postAuthorInfo" style="display:flex; align-items:center; gap:10px; margin-bottom: 16px; ${isPostOwner ? "cursor:pointer;" : ""}" title="${isPostOwner ? "Bấm để chỉnh sửa trang cá nhân" : ""}">
        <img src="${authorAvatar}" class="author-avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
        <div>
            <div style="font-weight:700; font-size:14px; color:#2f3542;">Đăng bởi: ${authorName}</div>
            <div style="font-size:12px; color:#718093;">Phân loại: ${post.postType === "recipe" ? "Công thức nấu ăn" : "Review quán ăn"}</div>
        </div>
      </div>
      ${post.foodImageUrl ? `<img src="${post.foodImageUrl}" class="detail-banner" style="width: 100%; border-radius: 12px; max-height: 400px; object-fit: cover;">` : ""}
      
      ${
        post.foodVideoUrl
          ? `
        <div style="margin-top: 20px;">
          <h4 style="font-size: 15px; font-weight: 700; color: #2d3436; margin-bottom: 8px;"><i class="fas fa-video" style="color: #be2c2c;"></i> Video thành phẩm thực tế:</h4>
          ${renderVideoElement(post.foodVideoUrl)}
        </div>
      `
          : ""
      }
    `;

    if (post.postType === "recipe") {
      detailHTML += `
        <div class="time-meta-box" style="display: flex; gap: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <div class="time-meta-item">
            <div class="meta-label" style="font-size: 12px; color: #718093;">Chuẩn bị</div>
            <div class="meta-value" style="font-weight: 700; color: #2f3542;">${post.prepTime || "0"} phút</div>
          </div>
          <div class="time-meta-item">
            <div class="meta-label" style="font-size: 12px; color: #718093;">Chế biến</div>
            <div class="meta-value" style="font-weight: 700; color: #2f3542;">${post.cookTime || "0"} phút</div>
          </div>
          <div class="time-meta-item">
            <div class="meta-label" style="font-size: 12px; color: #718093;">Dành cho</div>
            <div class="meta-value" style="font-weight: 700; color: #2f3542;">${post.servingSize || "Nhiều người"}</div>
          </div>
        </div>
      `;

      const ingredientsArray = post.dynamicInput
        ? post.dynamicInput.split(",")
        : [];
      detailHTML += `
        <div class="ingredients-card" style="margin-bottom: 20px;">
          <h4 style="font-size: 16px; font-weight: 700; color: #2f3542; margin-bottom: 10px;">Nguyên liệu cần có:</h4>
          <ul class="ingredients-list" style="padding-left: 20px; line-height: 1.6;">
            ${ingredientsArray.map((ing) => `<li>${ing.trim()}</li>`).join("")}
          </ul>
        </div>
      `;
    } else {
      detailHTML += `
        <p style="font-weight:600; color:#d35400; font-size:15px; margin: 20px 0;">
          <i class="fas fa-map-marker-alt"></i> Địa chỉ quán: ${post.dynamicInput || "Chưa cập nhật"}
        </p>
      `;
    }

    detailHTML += `
      <div style="margin: 25px 0;">
        <h4 style="font-size: 16px; font-weight:700; margin-bottom:8px; color:#2f3542;">Giới thiệu món ăn:</h4>
        <p style="font-size: 15px; line-height: 1.7; color: #57606f; white-space: pre-line; font-style: italic;">
          "${post.foodContent}"
        </p>
      </div>
    `;

    if (post.postType === "recipe" && post.steps && post.steps.length > 0) {
      detailHTML += `
        <h4 style="font-size:17px; font-weight:700; margin-bottom:15px; color:#1e272e; border-left:4px solid #2ecc71; padding-left:10px;">Các bước chế biến món ăn:</h4>
        <div class="steps-container" style="display: flex; flex-direction: column; gap: 15px;">
          ${post.steps
            .map((step, idx) => {
              const stepText = typeof step === "object" ? step.text : step;
              const stepVideo = typeof step === "object" ? step.video : "";

              return `
              <div class="step-card-detail" style="display: flex; flex-direction: column; gap: 8px; background: #fff; border: 1px solid #eee; padding: 12px; border-radius: 8px;">
                <div style="display: flex; gap: 15px; align-items: flex-start;">
                  <span class="step-badge" style="background: #2ecc71; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; flex-shrink: 0;">Bước ${idx + 1}</span>
                  <div class="step-content-detail" style="flex: 1; font-size: 14px; color: #2d3436;">${stepText}</div>
                </div>
                ${
                  stepVideo
                    ? `
                  <div style="padding-left: 70px; width: 100%;">
                    ${renderVideoElement(stepVideo)}
                  </div>
                `
                    : ""
                }
              </div>
            `;
            })
            .join("")}
        </div>
      `;
    }

    document.getElementById("viewPostDetailArea").innerHTML = detailHTML;

    const postAuthorInfo = document.getElementById("postAuthorInfo");
    if (postAuthorInfo && isPostOwner) {
      postAuthorInfo.addEventListener("click", () => {
        window.location.href = "edit-profile.html";
      });
    }
  } catch (error) {
    console.error("Lỗi lấy dữ liệu chi tiết:", error);
  }
}

function listenToComments(postId) {
  const q = query(
    collection(db, "comments"),
    where("postId", "==", postId),
    orderBy("createdAt", "asc")
  );

  onSnapshot(q, (snapshot) => {
    const commentsList = document.getElementById("commentsList");
    const commentCount = document.getElementById("commentCount");
    
    if (commentCount) commentCount.innerText = snapshot.size;
    if (!commentsList) return;
    
    commentsList.innerHTML = "";

    if (snapshot.empty) {
      commentsList.innerHTML = `<p style="text-align:center; color:#a4b0be; font-size:13.5px; padding:15px 0;">Chưa có bình luận nào cho bài đăng này.</p>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const comment = { id: docSnap.id, ...docSnap.data() };
      const isCommentOwner = comment.userId === currentUser?.uid;

      const commentAvatar = isCommentOwner
        ? currentUser?.photoURL ||
          "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"
        : comment.userAvatar ||
          "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";

      const commentName = isCommentOwner
        ? currentUser?.displayName || "Thành viên"
        : comment.userName || "Thành viên";

      const commentNode = document.createElement("div");
      commentNode.style =
        "display:flex; gap:12px; background:#f8f9fa; padding:12px 16px; border-radius:12px; align-items:flex-start;";
      commentNode.innerHTML = `
        <img src="${commentAvatar}" style="width:32px; height:32px; border-radius:50%; object-fit:cover; ${isCommentOwner ? "cursor:pointer;" : ""}" class="comment-avatar">
        <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; font-size:13px; color:#2d3436; ${isCommentOwner ? "cursor:pointer;" : ""}" class="comment-username">${commentName}</span>
                ${
                  isCommentOwner
                    ? `
                    <div style="display:flex; gap:8px; font-size:11px;">
                        <span class="edit-cmt-btn" style="color:#27ae60; cursor:pointer; font-weight:600;"><i class="fas fa-edit"></i> Sửa</span>
                        <span class="delete-cmt-btn" style="color:#be2c2c; cursor:pointer; font-weight:600;"><i class="fas fa-trash"></i> Xóa</span>
                    </div>
                `
                    : ""
                }
            </div>
            <p style="font-size:13.5px; color:#2f3542; margin-top:4px; line-height:1.4;">${comment.text}</p>
        </div>
      `;

      if (isCommentOwner) {
        const cmtAvatarEl = commentNode.querySelector(".comment-avatar");
        const cmtNameEl = commentNode.querySelector(".comment-username");

        [cmtAvatarEl, cmtNameEl].forEach((el) => {
          if (el) {
            el.addEventListener("click", () => {
              window.location.href = "edit-profile.html";
            });
          }
        });

        commentNode
          .querySelector(".edit-cmt-btn")
          .addEventListener("click", () => {
            document.getElementById("editingCommentId").value = comment.id;
            document.getElementById("commentInput").value = comment.text;
            document.getElementById("submitCommentBtn").innerText = "Cập nhật";
            document.getElementById("cancelEditCommentBtn").style.display =
              "inline-block";
            document.getElementById("commentInput").focus();
          });

        commentNode
          .querySelector(".delete-cmt-btn")
          .addEventListener("click", async () => {
            if (confirm("Bạn thực sự muốn xóa bình luận này?")) {
              await deleteDoc(doc(db, "comments", comment.id));
              showToast("Bình luận đã được xóa!");
            }
          });
      }

      commentsList.appendChild(commentNode);
    });
  });
}

const commentForm = document.getElementById("commentForm");
if (commentForm) {
  commentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const commentInput = document.getElementById("commentInput");
    const text = commentInput.value.trim();
    const cmtId = document.getElementById("editingCommentId").value;

    if (!text || !activePostId || !currentUser) return;

    try {
      if (cmtId) {
        await updateDoc(doc(db, "comments", cmtId), {
          text: text,
          updatedAt: Date.now(),
        });
        showToast("Cập nhật bình luận thành công!");
      } else {
        await addDoc(collection(db, "comments"), {
          postId: activePostId,
          userId: currentUser.uid,
          userName: currentUser.displayName || "Thành viên",
          userAvatar:
            currentUser.photoURL ||
            "https://cdn-icons-png.flaticon.com/512/3177/3177440.png",
          text: text,
          createdAt: Date.now(),
        });
        showToast("Đăng bình luận thành công!");
      }
      resetCommentForm();
    } catch (err) {
      console.error("Lỗi bình luận:", err);
      showToast("Lỗi gửi bình luận!", "danger");
    }
  });
}

const cancelEditCommentBtn = document.getElementById("cancelEditCommentBtn");
if (cancelEditCommentBtn) {
  cancelEditCommentBtn.addEventListener("click", resetCommentForm);
}

function resetCommentForm() {
  document.getElementById("editingCommentId").value = "";
  document.getElementById("commentInput").value = "";
  document.getElementById("submitCommentBtn").innerText = "Gửi";
  document.getElementById("cancelEditCommentBtn").style.display = "none";
}

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2500);
}