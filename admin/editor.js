import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDQCed1Led55t9s8deU1BZSpkVe1oSt-oU",
  authDomain: "nomnom-42f0b.firebaseapp.com",
  projectId: "nomnom-42f0b",
  storageBucket: "nomnom-42f0b.firebasestorage.app",
  messagingSenderId: "1011885827413",
  appId: "1:1011885827413:web:56a91e6298d8f219dc7bdc",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let currentPostId = null;

const CLOUDINARY_UPLOAD_PRESET = 'nomnom_preset'; 
const CLOUDINARY_CLOUD_NAME = 'dbzv3vctm'; 

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "../login.html";
  } else {
    currentUser = user;
    checkEditMode();
  }
});

// Kiểm tra xem có đang sửa bài viết cũ hay không (thông qua query string ?id=...)
async function checkEditMode() {
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('id');
  
  if (editId) {
    currentPostId = editId;
    const docRef = doc(db, "posts", editId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const post = docSnap.data();
      document.getElementById('postTitle').value = post.title;
      document.getElementById('postSummary').value = post.summary;
      document.getElementById('postThumbnail').value = post.thumbnail;
      document.getElementById('postCategory').value = post.category;
      
      // Khôi phục các Block cũ lên UI
      post.blocks.forEach(block => {
        window.addBlock(block.type, block.data);
      });
    }
  } else {
    // Nếu tạo bài viết mới, tự động cho sẵn 1 paragraph block cho người viết dễ dùng
    window.addBlock('paragraph');
  }
}

// Định nghĩa hàm global để nút bấm bên HTML gọi được
window.addBlock = function(type, initialData = {}) {
  const blockId = 'block-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const blockWrapper = document.createElement('div');
  blockWrapper.className = 'editor-block-wrapper';
  blockWrapper.setAttribute('data-id', blockId);
  blockWrapper.setAttribute('data-type', type);
  
  let innerHTML = '';
  
  switch(type) {
    case 'heading':
      innerHTML = `
        <div class="block-controls"><span>Tiêu đề phụ (Heading)</span><button class="btn-delete-block" onclick="this.closest('.editor-block-wrapper').remove()">Xóa</button></div>
        <input type="text" class="block-input heading-input" placeholder="Nhập tiêu đề phụ..." value="${initialData.text || ''}">
      `;
      break;
    case 'paragraph':
      innerHTML = `
        <div class="block-controls"><span>Đoạn văn (Paragraph)</span><button class="btn-delete-block" onclick="this.closest('.editor-block-wrapper').remove()">Xóa</button></div>
        <textarea class="block-input paragraph-input" placeholder="Bắt đầu viết nội dung tại đây..." rows="3">${initialData.text || ''}</textarea>
      `;
      break;
    case 'image':
      const currentUrl = initialData.url || '';
      innerHTML = `
        <div class="block-controls"><span>Hình ảnh</span><button class="btn-delete-block" onclick="this.closest('.editor-block-wrapper').remove()">Xóa</button></div>
        <div class="image-uploader-zone">
          <input type="file" class="block-file-input" accept="image/*" ${currentUrl ? 'style="display:none;"' : ''}>
          <div class="image-preview-container" ${!currentUrl ? 'style="display:none;"' : 'style="display:block;"'}>
            <img src="${currentUrl}" class="editor-img-preview" style="max-height:200px; display:block; margin-bottom:10px; border-radius:6px;">
            <button type="button" class="btn-control btn-remove-uploaded-img">Chọn ảnh khác</button>
          </div>
          <input type="text" class="block-input image-caption" placeholder="Mô tả ảnh..." value="${initialData.caption || ''}" style="margin-top:8px;">
        </div>
      `;
      break;
    case 'quote':
      innerHTML = `
        <div class="block-controls"><span>Trích dẫn (Quote)</span><button class="btn-delete-block" onclick="this.closest('.editor-block-wrapper').remove()">Xóa</button></div>
        <textarea class="block-input quote-text" placeholder="Nhập lời trích dẫn..." rows="2">${initialData.text || ''}</textarea>
        <input type="text" class="block-input quote-caption" placeholder="Tác giả hoặc nguồn dẫn..." value="${initialData.caption || ''}" style="margin-top:8px;">
      `;
      break;
    case 'divider':
      innerHTML = `
        <div class="block-controls"><span>Đường kẻ ngang</span><button class="btn-delete-block" onclick="this.closest('.editor-block-wrapper').remove()">Xóa</button></div>
        <hr style="border:0; border-top: 1px solid #ddd; margin:10px 0;">
      `;
      break;
  }
  
  blockWrapper.innerHTML = innerHTML;
  document.getElementById('editorContainer').appendChild(blockWrapper);

  if (type === 'image') {
    setupImageBlockEvents(blockWrapper);
  }
}

async function uploadToCloudinary(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(url, { method: 'POST', body: formData });
    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error(error);
    alert('Upload ảnh lên Cloudinary lỗi!');
    return null;
  }
}

function setupImageBlockEvents(blockWrapper) {
  const fileInput = blockWrapper.querySelector('.block-file-input');
  const previewContainer = blockWrapper.querySelector('.image-preview-container');
  const previewImg = blockWrapper.querySelector('.editor-img-preview');
  const removeBtn = blockWrapper.querySelector('.btn-remove-uploaded-img');

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    blockWrapper.querySelector('.block-controls span').innerText = 'Đang tải ảnh lên... ⏳';
    const imageUrl = await uploadToCloudinary(file);
    
    if (imageUrl) {
      previewImg.src = imageUrl;
      fileInput.style.display = 'none';
      previewContainer.style.display = 'block';
    }
    blockWrapper.querySelector('.block-controls span').innerText = 'Hình ảnh';
  });

  removeBtn.addEventListener('click', () => {
    previewImg.src = '';
    previewContainer.style.display = 'none';
    fileInput.value = '';
    fileInput.style.display = 'block';
  });
}

// Thu thập toàn bộ nội dung khối Block
function collectBlocksData() {
  const blocks = [];
  document.querySelectorAll('.editor-block-wrapper').forEach(node => {
    const type = node.getAttribute('data-type');
    const block = { type, data: {} };
    
    switch(type) {
      case 'heading':
        block.data.text = node.querySelector('.heading-input').value.trim();
        break;
      case 'paragraph':
        block.data.text = node.querySelector('.paragraph-input').value.trim();
        break;
      case 'image':
        block.data.url = node.querySelector('.editor-img-preview').src;
        block.data.caption = node.querySelector('.image-caption').value.trim();
        break;
      case 'quote':
        block.data.text = node.querySelector('.quote-text').value.trim();
        block.data.caption = node.querySelector('.quote-caption').value.trim();
        break;
      case 'divider':
        break;
    }
    blocks.push(block);
  });
  return blocks;
}

async function savePost(status) {
  const title = document.getElementById('postTitle').value.trim();
  const summary = document.getElementById('postSummary').value.trim();
  const thumbnail = document.getElementById('postThumbnail').value.trim();
  const category = document.getElementById('postCategory').value;
  const blocks = collectBlocksData();

  if(!title || !summary) {
    alert("Vui lòng điền tiêu đề và mô tả bài viết!");
    return;
  }

  const postData = {
    title,
    summary,
    thumbnail,
    category,
    blocks,
    status,
    userId: currentUser.uid,
    author: {
      displayName: currentUser.displayName || "Thành viên",
      photoURL: currentUser.photoURL || "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"
    },
    updatedAt: Date.now()
  };

  try {
    if (currentPostId) {
      await setDoc(doc(db, "posts", currentPostId), postData, { merge: true });
    } else {
      postData.createdAt = Date.now();
      const docRef = await addDoc(collection(db, "posts"), postData);
      currentPostId = docRef.id;
    }
    alert(status === 'published' ? 'Đã công bố bài viết thành công!' : 'Đã lưu bản nháp thành công!');
    window.location.href = "../main.html";
  } catch (error) {
    console.error(error);
    alert('Không thể lưu bài viết!');
  }
}

document.getElementById('btnSaveDraft').addEventListener('click', () => savePost('draft'));
document.getElementById('btnPublish').addEventListener('click', () => savePost('published'));