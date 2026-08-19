import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { isAdminUser } from "./adminConfig.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  getAuth,
  signOut,
  onAuthStateChanged,
  updateProfile,
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

const CLOUDINARY_CLOUD_NAME = "dnurk6t58";
const CLOUDINARY_UPLOAD_PRESET = "uniqblfi";

let currentUser = null;
let allPostsCache = [];
let savedPostIds = []; 
let currentFilterNav = "all";
let currentFilterType = "all";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    setupUIForUser();
    listenToSavedPosts();
    listenToPosts();
  }
});

function setupUIForUser() {
  const loginBtn = document.getElementById("loginBtn");
  const userInfo = document.getElementById("userInfo");
  const userAvatar = document.getElementById("userAvatar");
  const userName = document.getElementById("userName");
  const openAddModalBtn = document.getElementById("openAddModalBtn");
  const myPostsTab = document.getElementById("myPostsTab");

  if (loginBtn) loginBtn.style.display = "none";
  if (userInfo) userInfo.style.display = "flex";
  if (openAddModalBtn) openAddModalBtn.style.display = "block";
  if (myPostsTab) myPostsTab.style.display = "inline-block";

  if (userAvatar) {
    userAvatar.src = currentUser.photoURL || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";
  }
  if (userName) {
    userName.innerText = currentUser.displayName || "Thành viên";

    if (isAdminUser(currentUser) && !document.getElementById("adminBadge")) {
      const badge = document.createElement("span");
      badge.id = "adminBadge";
      badge.className = "badge-admin";
      badge.innerText = "ADMIN";
      userName.appendChild(badge);
    }
  }
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "login.html";
    });
  });
}

const foodImageFileInput = document.getElementById("foodImageFile");
const foodImageUrlInput = document.getElementById("foodImageUrl");
const uploadStatus = document.getElementById("uploadStatus");
const imagePreview = document.getElementById("imagePreview");

if (foodImageFileInput) {
  foodImageFileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    uploadStatus.innerText = "Đang xử lý và tải ảnh lên Cloudinary...";
    uploadStatus.style.color = "#27ae60";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await response.json();

      if (data.secure_url) {
        foodImageUrlInput.value = data.secure_url;
        imagePreview.src = data.secure_url;
        imagePreview.style.display = "block";
        uploadStatus.innerText = "Tải ảnh lên thành công!";
        uploadStatus.style.color = "#2ecc71";
      } else {
        uploadStatus.innerText = "Tải ảnh lên thất bại. Vui lòng thử lại!";
        uploadStatus.style.color = "#ff4d4f";
      }
    } catch (err) {
      console.error(err);
      uploadStatus.innerText = "Lỗi kết nối tới Cloudinary!";
      uploadStatus.style.color = "#ff4d4f";
    }
  });
}

const btnAddStep = document.getElementById("btnAddStep");
const stepsContainerList = document.getElementById("stepsContainerList");

if (btnAddStep) {
  btnAddStep.addEventListener("click", () => {
    addStepInputField("", "");
  });
}

function addStepInputField(value = "", videoLink = "") {
  const stepCount = stepsContainerList.children.length + 1;
  const stepDiv = document.createElement("div");
  stepDiv.className = "step-input-item";
  stepDiv.style = "display: flex; flex-direction: column; gap: 6px; background: #f8f9fa; padding: 10px; border-radius: 8px; border: 1px solid #e1e1e1;";
  stepDiv.innerHTML = `
    <div style="display: flex; gap: 8px; align-items: center; width: 100%;">
      <span style="font-weight: bold; font-size: 13px; color: #57606f; width: 60px; shrink: 0;">Bước ${stepCount}:</span>
      <input type="text" class="recipe-step-text" value="${value}" placeholder="Nhập mô tả của bước này..." style="flex: 1; padding: 8px;" required />
      <button type="button" class="btn-remove-step" title="Xóa bước này"><i class="fas fa-trash-alt"></i></button>
    </div>
    <div style="display: flex; gap: 8px; align-items: center; width: 100%; padding-left: 60px;">
      <span style="font-size: 11px; color: #718093;"><i class="fas fa-video"></i> Link Video:</span>
      <input type="url" class="recipe-step-video" value="${videoLink}" placeholder="Dán link video hướng dẫn bước này (nếu có)..." style="flex: 1; padding: 6px; font-size: 12px; border: 1px solid #ced4da; border-radius: 4px;" />
    </div>
  `;

  stepDiv.querySelector(".btn-remove-step").addEventListener("click", () => {
    stepDiv.remove();
    reorderSteps();
  });

  stepsContainerList.appendChild(stepDiv);
}

function reorderSteps() {
  const stepItems = stepsContainerList.children;
  for (let i = 0; i < stepItems.length; i++) {
    const span = stepItems[i].querySelector("span");
    if (span) span.innerText = `Bước ${i + 1}:`;
  }
}

function getStepsData() {
  const stepContainers = document.querySelectorAll(".step-input-item");
  const steps = [];
  stepContainers.forEach((container) => {
    const textInput = container.querySelector(".recipe-step-text");
    const videoInput = container.querySelector(".recipe-step-video");
    if (textInput && textInput.value.trim() !== "") {
      steps.push({
        text: textInput.value.trim(),
        video: videoInput ? videoInput.value.trim() : ""
      });
    }
  });
  return steps;
}

function updateFormLabels(type) {
  const lblDynamic = document.getElementById("lblDynamic");
  const dynamicInput = document.getElementById("dynamicInput");
  const recipeTimeGroup = document.getElementById("recipeTimeGroup");
  const recipeStepsSection = document.getElementById("recipeStepsSection");

  if (type === "recipe") {
    if (lblDynamic)
      lblDynamic.innerText = "Nguyên liệu làm món (cách nhau bởi dấu phẩy):";
    if (dynamicInput)
      dynamicInput.placeholder =
        "Ví dụ: 300g thịt ba rọi, 150g dứa, 2 tép tỏi...";
    if (recipeTimeGroup) recipeTimeGroup.style.display = "flex";
    if (recipeStepsSection) recipeStepsSection.style.display = "block";
  } else {
    if (lblDynamic) lblDynamic.innerText = "Địa chỉ quán ăn:";
    if (dynamicInput) dynamicInput.placeholder = "Ví dụ: 123 Cầu Giấy, Hà Nội";
    if (recipeTimeGroup) recipeTimeGroup.style.display = "none";
    if (recipeStepsSection) recipeStepsSection.style.display = "none";
  }
}

const postTypeSelect = document.getElementById("postType");
if (postTypeSelect) {
  postTypeSelect.addEventListener("change", (e) => {
    updateFormLabels(e.target.value);
  });
}

document.querySelectorAll(".sidebar-item").forEach((item) => {
  item.addEventListener("click", function (e) {
    e.preventDefault();
    document
      .querySelectorAll(".sidebar-item")
      .forEach((i) => i.classList.remove("active"));
    this.classList.add("active");

    const targetPageId = this.getAttribute("data-page");
    document
      .querySelectorAll(".page-view")
      .forEach((page) => page.classList.remove("active"));

    const targetPageNode = document.getElementById(`page-${targetPageId}`);
    if (targetPageNode) targetPageNode.classList.add("active");

    if (targetPageId === "explore") {
      displayPosts(allPostsCache);
    } else if (targetPageId === "saved") {
      displaySavedPosts();
    }
  });
});

function listenToSavedPosts() {
  if (!currentUser) return;
  onSnapshot(
    collection(db, "users", currentUser.uid, "savedPosts"),
    (snapshot) => {
      savedPostIds = snapshot.docs.map((doc) => doc.id);
      displayPosts(allPostsCache);
      displaySavedPosts();
    },
  );
}

function displayPosts(posts) {
  const postsContainer = document.getElementById("postsContainer");
  if (!postsContainer) return;
  postsContainer.innerHTML = "";

  const filtered = posts.filter((post) => {
    if (currentFilterNav === "recipe" && post.postType !== "recipe")
      return false;
    if (currentFilterNav === "review" && post.postType !== "review")
      return false;
    if (currentFilterNav === "mine" && post.userId !== currentUser?.uid)
      return false;
    if (currentFilterType !== "all") {
      const tagKeyword = currentFilterType.toLowerCase();
      const inputData = (post.dynamicInput || "").toLowerCase();
      if (!inputData.includes(tagKeyword)) return false;
    }

    if (searchInput && searchInput.value.trim() !== "") {
      const keyword = searchInput.value.toLowerCase();
      return (post.foodName || "").toLowerCase().includes(keyword);
    }
    return true;
  });

  if (filtered.length === 0) {
    postsContainer.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:50px 0; color:#a4b0be;">Không có bài viết phù hợp bộ lọc.</div>`;
    return;
  }

  filtered.forEach((post) => {
    const isRecipe = post.postType === "recipe";
    const isOwner = post.userId === currentUser?.uid;
    const isSaved = savedPostIds.includes(post.id);
    
    // 🟢 Kiểm tra xem User hiện tại có phải Admin không
    const isAdmin = isAdminUser(currentUser);

    const authorAvatar = isOwner
      ? currentUser?.photoURL ||
        "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"
      : post.userAvatar ||
        "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";

    const authorName = isOwner
      ? currentUser?.displayName || "Thành viên"
      : post.userName || "Thành viên";

    const card = document.createElement("div");
    card.className = "post-card";
    card.style.cursor = "pointer";

    card.innerHTML = `
      <div class="post-image-wrapper">
          <img src="${post.foodImageUrl || "https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=600"}" alt="Food">
          <span class="badge ${isRecipe ? "badge-recipe" : "badge-review"}">${isRecipe ? "Công thức" : "Review"}</span>
          <button class="btn-bookmark ${isSaved ? "active" : ""}" title="${isSaved ? "Bỏ lưu" : "Lưu bài viết"}">
            <i class="${isSaved ? "fas" : "far"} fa-bookmark"></i>
          </button>
      </div>
      <div class="post-info">
          <h3 class="post-title">${post.foodName || "Món ăn chưa đặt tên"}</h3>
          <p class="post-excerpt">${post.foodContent || "Không có mô tả chi tiết bài viết..."}</p>
          
          <div style="display:flex; justify-content:flex-end; align-items:center; margin-top:10px; min-height: 25px;">
              <div style="display:flex; gap:8px;">
                ${isOwner ? `<button class="btn-card-edit" style="background:none; border:none; color:#27ae60; cursor:pointer; font-size:13px;"><i class="fas fa-edit"></i> Sửa</button>` : ''}
                ${(isOwner || isAdmin) ? `<button class="btn-card-delete" style="background:none; border:none; color:#be2c2c; cursor:pointer; font-size:13px;"><i class="fas fa-trash"></i> Xóa ${isAdmin && !isOwner ? '(Admin)' : ''}</button>` : ''}
              </div>
          </div>

          <div class="post-author">
              <img src="${authorAvatar}" alt="Avatar">
              <span class="author-name">${authorName}</span>
          </div>
      </div>
    `;

    // Click vào card để tới trang chi tiết
    card.addEventListener("click", () => {
      window.location.href = `detail.html?id=${post.id}`;
    });

    // Nút Bookmark bài viết
    const bookmarkBtn = card.querySelector(".btn-bookmark");
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await toggleSavePost(post.id);
      });
    }

    // Nút Sửa (Chỉ chính chủ)
    if (isOwner) {
      card.querySelector(".btn-card-edit")?.addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal(post);
      });
    }

    // Nút Xóa (Cho Cả Chính chủ VÀ Admin)
    if (isOwner || isAdmin) {
      card
        .querySelector(".btn-card-delete")
        ?.addEventListener("click", async (e) => {
          e.stopPropagation();
          
          const confirmMsg = isAdmin && !isOwner 
            ? `[ADMIN] Bạn chắc chắn muốn xóa bài viết "${post.foodName}" của ${post.userName || "thành viên này"}?`
            : `Bạn chắc chắn muốn xóa bài viết "${post.foodName}" chứ?`;

          if (confirm(confirmMsg)) {
            try {
              await deleteDoc(doc(db, "posts", post.id));
              showToast("Đã xóa bài viết thành công!");
            } catch (err) {
              console.error(err);
              showToast("Không thể xóa bài viết!", "danger");
            }
          }
        });
    }

    postsContainer.appendChild(card);
  });
}

async function toggleSavePost(postId) {
  if (!currentUser) return;
  const savedRef = doc(db, "users", currentUser.uid, "savedPosts", postId);

  try {
    if (savedPostIds.includes(postId)) {
      await deleteDoc(savedRef);
      showToast("Đã bỏ lưu bài viết!");
    } else {
      await setDoc(savedRef, { savedAt: Date.now() });
      showToast("Đã lưu bài viết thành công!");
    }
  } catch (err) {
    console.error("Lỗi khi lưu bài viết:", err);
    showToast("Không thể thực hiện thao tác!", "danger");
  }
}

function displaySavedPosts() {
  const savedContainer = document.getElementById("savedPostsContainer");
  if (!savedContainer) return;

  const savedPosts = allPostsCache.filter((post) =>
    savedPostIds.includes(post.id),
  );

  if (savedPosts.length === 0) {
    savedContainer.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <i class="fas fa-bookmark"></i>
        <h2>Bài viết bạn đã lưu sẽ hiển thị ở đây</h2>
      </div>
    `;
    return;
  }

  savedContainer.innerHTML = "";
  savedPosts.forEach((post) => {
    const isRecipe = post.postType === "recipe";
    const isOwner = post.userId === currentUser?.uid;

    const authorAvatar = isOwner
      ? currentUser?.photoURL ||
        "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"
      : post.userAvatar ||
        "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";

    const authorName = isOwner
      ? currentUser?.displayName || "Thành viên"
      : post.userName || "Thành viên";

    const card = document.createElement("div");
    card.className = "post-card";

    card.innerHTML = `
      <div class="post-image-wrapper">
          <img src="${post.foodImageUrl || "https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=600"}" alt="Food">
          <span class="badge ${isRecipe ? "badge-recipe" : "badge-review"}">${isRecipe ? "Công thức" : "Review"}</span>
          <button class="btn-bookmark active" title="Bỏ lưu">
            <i class="fas fa-bookmark"></i>
          </button>
      </div>
      <div class="post-info">
          <h3 class="post-title">${post.foodName || "Món ăn chưa đặt tên"}</h3>
          <p class="post-excerpt">${post.foodContent || "Không có mô tả..."}</p>
          <div class="post-author">
              <img src="${authorAvatar}" alt="Avatar">
              <span class="author-name">${authorName}</span>
          </div>
      </div>
    `;

    card.addEventListener("click", () => {
      window.location.href = `detail.html?id=${post.id}`;
    });

    card.querySelector(".btn-bookmark").addEventListener("click", async (e) => {
      e.stopPropagation();
      await toggleSavePost(post.id);
    });

    savedContainer.appendChild(card);
  });
}

document.querySelectorAll(".filter-nav .nav-item").forEach((tab) => {
  tab.addEventListener("click", function (e) {
    e.preventDefault();

    document.querySelectorAll(".filter-nav .nav-item").forEach((t) => {
      t.classList.remove("active");
    });
    this.classList.add("active");
    currentFilterNav = this.getAttribute("data-filter");
    displayPosts(allPostsCache);
  });
});

const searchInput = document.getElementById("searchInput");
if (searchInput) {
  searchInput.addEventListener("input", () => {
    const activePage = document.querySelector(".page-view.active")?.id;
    if (activePage === "page-explore") {
      displayPosts(allPostsCache);
    } else if (activePage === "page-saved") {
      displaySavedPosts();
    }
  });
}

function listenToPosts() {
  onSnapshot(
    collection(db, "posts"),
    (snapshot) => {
      allPostsCache = [];
      snapshot.forEach((doc) => {
        allPostsCache.push({ id: doc.id, ...doc.data() });
      });
      allPostsCache.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      displayPosts(allPostsCache);
      displaySavedPosts();
    },
    (error) => {
      console.error("Lỗi dữ liệu bài viết:", error);
    },
  );
}

const foodModal = document.getElementById("foodModal");
const openAddModalBtn = document.getElementById("openAddModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const foodForm = document.getElementById("foodForm");

if (openAddModalBtn) {
  openAddModalBtn.addEventListener("click", () => {
    document.getElementById("modalTitle").innerText = "Chia Sẻ Bài Viết Mới";
    foodForm.reset();
    document.getElementById("postId").value = "";
    document.getElementById("foodImageUrl").value = "";
    document.getElementById("foodVideoUrl").value = "";
    if (imagePreview) imagePreview.style.display = "none";
    if (uploadStatus) uploadStatus.innerText = "";
    if (stepsContainerList) stepsContainerList.innerHTML = "";
    updateFormLabels("recipe");
    foodModal.style.display = "flex";

    if (foodImageFileInput) {
      foodImageFileInput.value = "";
    }
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    foodModal.style.display = "none";
  });
}

function openEditModal(post) {
  document.getElementById("modalTitle").innerText = "Chỉnh Sửa Bài Viết";
  document.getElementById("postId").value = post.id;
  document.getElementById("postType").value = post.postType;
  document.getElementById("foodName").value = post.foodName;
  document.getElementById("dynamicInput").value = post.dynamicInput || "";
  document.getElementById("foodImageUrl").value = post.foodImageUrl || "";
  document.getElementById("foodVideoUrl").value = post.foodVideoUrl || "";
  document.getElementById("foodContent").value = post.foodContent;

  // TỰ ĐỘNG HIỂN THỊ PREVIEW KHIN DÁN LINK ẢNH
  if (foodImageUrlInput) {
    foodImageUrlInput.addEventListener("input", (e) => {
      const url = e.target.value.trim();
      if (url !== "") {
        imagePreview.src = url;
        imagePreview.style.display = "block";
        if (uploadStatus) uploadStatus.innerText = "";
      } else {
        imagePreview.style.display = "none";
      }
    });
  }

  updateFormLabels(post.postType);

  if (post.postType === "recipe") {
    document.getElementById("prepTime").value = post.prepTime || "";
    document.getElementById("cookTime").value = post.cookTime || "";
    document.getElementById("servingSize").value = post.servingSize || "";

    if (stepsContainerList) {
      stepsContainerList.innerHTML = "";
      if (post.steps && Array.isArray(post.steps)) {
        post.steps.forEach((step) => {
          const stepText = typeof step === "object" ? step.text : step;
          const stepVideo = typeof step === "object" ? step.video : "";
          addStepInputField(stepText, stepVideo);
        });
      }
    }
  }

  foodModal.style.display = "flex";
}

if (foodForm) {
  foodForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const postId = document.getElementById("postId").value;
    const postType = document.getElementById("postType").value;

    const postData = {
      postType: postType,
      foodName: document.getElementById("foodName").value.trim(),
      dynamicInput: document.getElementById("dynamicInput").value.trim(),
      foodImageUrl: document.getElementById("foodImageUrl").value.trim(),
      foodVideoUrl: document.getElementById("foodVideoUrl").value.trim(),
      foodContent: document.getElementById("foodContent").value.trim(),
      updatedAt: Date.now(),
    };

    if (postType === "recipe") {
      postData.prepTime = document.getElementById("prepTime").value || "0";
      postData.cookTime = document.getElementById("cookTime").value || "0";
      postData.servingSize =
        document.getElementById("servingSize").value || "Nhiều người";
      postData.steps = getStepsData();
    }

    try {
      if (postId) {
        await updateDoc(doc(db, "posts", postId), postData);
        showToast("Cập nhật bài viết thành công!");
      } else {
        postData.userId = currentUser.uid;
        postData.userName = currentUser.displayName || "Thành viên";
        postData.userAvatar =
          currentUser.photoURL ||
          "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";
        postData.createdAt = Date.now();
        await addDoc(collection(db, "posts"), postData);
        showToast("Đăng bài viết mới thành công!");
      }
      foodModal.style.display = "none";
    } catch (err) {
      console.error(err);
      showToast("Lỗi hệ thống dữ liệu!", "danger");
    }
  });
}

const profileModal = document.getElementById("profileModal");
const closeProfileModalBtn = document.getElementById("closeProfileModalBtn");
const profileForm = document.getElementById("profileForm");
const userInfo = document.getElementById("userInfo");
const profileAvatarPreview = document.getElementById("profileAvatarPreview");
const profileAvatarFile = document.getElementById("profileAvatarFile");
const profileAvatarUrl = document.getElementById("profileAvatarUrl");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileUploadStatus = document.getElementById("profileUploadStatus");

if (userInfo) {
  userInfo.style.cursor = "pointer";
  userInfo.title = "Trang cá nhân";
  userInfo.addEventListener("click", (e) => {
    if (e.target.closest("#logoutBtn")) return;
    window.location.href = "edit-profile.html";
  });
}

if (closeProfileModalBtn) {
  closeProfileModalBtn.addEventListener("click", () => {
    if (profileModal) profileModal.style.display = "none";
  });
}

if (profileAvatarFile) {
  profileAvatarFile.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (profileUploadStatus) {
      profileUploadStatus.innerText = "Đang tải ảnh...";
      profileUploadStatus.style.color = "#27ae60";
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await response.json();

      if (data.secure_url) {
        if (profileAvatarUrl) profileAvatarUrl.value = data.secure_url;
        if (profileAvatarPreview) profileAvatarPreview.src = data.secure_url;
        if (profileUploadStatus) {
          profileUploadStatus.innerText = "Tải ảnh thành công!";
          profileUploadStatus.style.color = "#2ecc71";
        }
      } else {
        if (profileUploadStatus) {
          profileUploadStatus.innerText = "Tải ảnh thất bại!";
          profileUploadStatus.style.color = "#ff4d4f";
        }
      }
    } catch (err) {
      console.error(err);
      if (profileUploadStatus) {
        profileUploadStatus.innerText = "Lỗi kết nối!";
        profileUploadStatus.style.color = "#ff4d4f";
      }
    }
  });
}

if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const newName = profileDisplayName.value.trim();
    const newAvatar = profileAvatarUrl.value.trim();

    try {
      await updateProfile(auth.currentUser, {
        displayName: newName,
        photoURL: newAvatar,
      });

      currentUser = auth.currentUser;
      setupUIForUser();

      showToast("Cập nhật trang cá nhân thành công!");
      if (profileModal) profileModal.style.display = "none";
    } catch (err) {
      console.error(err);
      showToast("Không thể cập nhật hồ sơ!", "danger");
    }
  });
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