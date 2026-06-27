// اسکرین شاٹ کے مطابق اپ ڈیٹ شدہ 10 ٹولز کا ڈیٹا (Image to PDF کے ساتھ)
const pdfTools = [
  { id: 'image-to-pdf', name: 'Image to PDF', desc: 'Convert JPG, PNG, and other images to PDF files', icon: 'fa-file-image', color: '#ef4444' },
  { id: 'merge', name: 'Merge PDF', desc: 'Combine multiple PDFs into one file', icon: 'fa-file-pdf', color: '#3b82f6' },
  { id: 'split', name: 'Split PDF', desc: 'Split PDF into multiple separate files', icon: 'fa-scissors', color: '#10b981' },
  { id: 'pdf-to-word', name: 'PDF to Word', desc: 'Convert PDF files to editable Word documents', icon: 'fa-file-word', color: '#6366f1' },
  { id: 'word-to-pdf', name: 'Word to PDF', desc: 'Convert Word documents to PDF files', icon: 'fa-file-invoice', color: '#f59e0b' },
  { id: 'jpg-to-pdf', name: 'JPG to PDF', desc: 'Convert standard JPG images to PDF documents', icon: 'fa-images', color: '#22c55e' },
  { id: 'pdf-to-jpg', name: 'PDF to JPG', desc: 'Convert PDF pages to JPG images seamlessly', icon: 'fa-file-lines', color: '#ec4899' },
  { id: 'rotate', name: 'Rotate PDF', desc: 'Rotate PDF pages in any direction you need', icon: 'fa-rotate', color: '#06b6d4' },
  { id: 'unlock', name: 'Unlock PDF', desc: 'Remove password and restrictions from PDF files', icon: 'fa-unlock-keyhole', color: '#eab308' },
  { id: 'protect', name: 'Protect PDF', desc: 'Add secure password to protect confidential PDFs', icon: 'fa-lock', color: '#a855f7' }
];

// 1. ٹولز کو ہوم پیج کے گریڈ (Grid) میں رینڈر کرنے کا فنکشن
function displayTools() {
  const toolsGrid = document.getElementById('tools-grid');
  if (!toolsGrid) return;

  toolsGrid.innerHTML = pdfTools.map(tool => `
    <div class="tool-card" onclick="selectTool('${tool.id}')" role="listitem">
      <div class="tool-icon-wrapper" style="background-color: ${tool.color}15; color: ${tool.color}; width: 60px; height: 60px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1.25rem;">
        <i class="fa-solid ${tool.icon}"></i>
      </div>
      <h3 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.5rem; color: #0f172a;">${tool.name}</h3>
      <p style="font-size: 0.9rem; color: #475569; margin-bottom: 1.5rem; flex-grow: 1; line-height: 1.4;">${tool.desc}</p>
      <span class="btn-use-tool" style="color: #2563eb; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; margin-top: auto;">
        Use Tool <i class="fa-solid fa-arrow-right" style="font-size: 0.8rem;"></i>
      </span>
    </div>
  `).join('');
}

// 2. جب کوئی صارف ٹول کارڈ پر کلک کرے گا تو ورک اسپیس کو اپڈیٹ کرنے کا فنکشن
function selectTool(toolId) {
  const workspace = document.getElementById('hero-workspace');
  const canvasContent = document.getElementById('canvas-content');
  const selectedTool = pdfTools.find(t => t.id === toolId);
  
  if (workspace && canvasContent && selectedTool) {
    // ورک اسپیس کا سٹائل اور مواد اسکرین شاٹ کی طرح پریمیم لک میں بدلیں
    canvasContent.className = "workspace-active";
    canvasContent.innerHTML = `
      <div style="text-align: center; width: 100%; padding: 1rem;">
        <div style="display: inline-flex; background-color: ${selectedTool.color}15; color: ${selectedTool.color}; padding: 0.75rem; border-radius: 50%; margin-bottom: 1rem; font-size: 1.5rem;">
          <i class="fa-solid ${selectedTool.icon}"></i>
        </div>
        <h2 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem; color: #0f172a;">${selectedTool.name}</h2>
        <p style="color: #475569; margin-bottom: 2rem; max-width: 600px; margin-left: auto; margin-right: auto; font-size: 0.95rem;">
          ${selectedTool.desc}. <br><span style="color: #10b981; font-weight: 600;"><i class="fa-solid fa-shield-halved"></i> Secured:</span> Your files are processed 100% locally on your browser.
        </p>
        
        <!-- ڈریگ اینڈ ڈراپ اپلوڈ ایریا -->
        <div id="drop-zone" style="border: 2px dashed #2563eb; padding: 3.5rem 2rem; border-radius: 16px; background: #f8fafc; cursor: pointer; max-width: 550px; margin: 0 auto; transition: all 0.3s;" onclick="document.getElementById('pdf-file-input').click()">
          <i class="fa-solid fa-cloud-arrow-up" style="font-size: 3.5rem; color: #2563eb; margin-bottom: 1.25rem;"></i>
          <p style="font-weight: 700; font-size: 1.1rem; color: #0f172a; margin-bottom: 0.25rem;">Drag & drop files here</p>
          <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1rem;">or click to browse from device</p>
          <span style="background-color: #2563eb; color: white; padding: 0.5rem 1.5rem; border-radius: 8px; font-size: 0.9rem; font-weight: 600; display: inline-block;">Choose Files</span>
          <input type="file" id="pdf-file-input" style="display: none;" multiple accept=".pdf,image/*">
        </div>
      </div>
    `;
    
    // سکرین کو اوپر ورک اسپیس (Workspace) پینل کی طرف اسکرول کریں
    workspace.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // اپلوڈ فائل کی کلک ہینڈلنگ سیٹ کریں
    setupUploadListener(selectedTool.id);
  }
}

// 3. اپلوڈ ان پٹ سننے اور عارضی الرٹ دکھانے کے لیے فنکشن
function setupUploadListener(toolId) {
  const fileInput = document.getElementById('pdf-file-input');
  if (!fileInput) return;

  fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      showToast(`Successfully loaded ${files.length} file(s) for ${toolId.replace('-', ' ')}!`);
    }
  });
}

// 4. ٹوسٹ نوٹیفکیشن (Toast Alert) دکھانے کا فنکشن
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.innerText = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// 5. موبائل مینو ٹوگلر (Hamburger Menu) لاجک
document.addEventListener('DOMContentLoaded', () => {
  displayTools();

  const navToggle = document.querySelector('.nav-toggle');
  const primaryNav = document.getElementById('primary-nav');

  if (navToggle && primaryNav) {
    navToggle.addEventListener('click', () => {
      const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !isExpanded);
      primaryNav.style.display = isExpanded ? 'none' : 'flex';
    });
  }
});
