/* ============================================================
PDF TOOL EXPERT — script.js
Handles: tool registry, card rendering, workspace activation,
mobile nav toggle, toast notifications
============================================================ */

'use strict';

// ─────────────────────────────────────────────────────────────
// 1. TOOL REGISTRY
//    Each tool has an icon, display name, short tagline (shown on
//    the card) and a longer description (shown in the workspace).
// ─────────────────────────────────────────────────────────────
const TOOLS = [
{
id:          'merge',
icon:        'fa-solid fa-layer-group',
name:        'Merge PDF',
tagline:     'Combine multiple PDFs into one',
description: 'Upload two or more PDF files and combine them into a single document in any order you choose. Drag the file thumbnails to rearrange pages before merging. Ideal for assembling reports, contracts, or multi-chapter documents.',
action:      'Merge Files',
},
{
id:          'split',
icon:        'fa-solid fa-scissors',
name:        'Split PDF',
tagline:     'Extract pages or page ranges',
description: 'Divide a PDF into separate files by specifying page numbers or ranges (e.g. 1-3, 5, 7-10). You can extract a single chapter from a large book, separate invoices from a batch scan, or pull individual certificates from a combined document.',
action:      'Split File',
},
{
id:          'compress',
icon:        'fa-solid fa-compress',
name:        'Compress PDF',
tagline:     'Reduce file size without losing quality',
description: 'Shrink large PDF files so they are easier to email, upload, or store. Choose from three compression levels — Low (best quality), Medium (balanced), and High (smallest size) — to match your needs. Most PDFs can be reduced by 50–80 %.',
action:      'Compress File',
},
{
id:          'rotate',
icon:        'fa-solid fa-rotate',
name:        'Rotate PDF',
tagline:     'Fix orientation of any page',
description: 'Rotate pages in a PDF by 90°, 180°, or 270° clockwise. Apply the rotation to all pages at once or select specific page numbers to rotate individually. Perfect for correcting scanned documents or pages pasted in the wrong orientation.',
action:      'Rotate File',
},
{
id:          'pdf-to-img',
icon:        'fa-solid fa-file-image',
name:        'PDF to Image',
tagline:     'Convert pages to JPG or PNG',
description: 'Turn each page of your PDF into a high-resolution JPG or PNG image. Choose your preferred format and download all images in a single ZIP file. Useful for sharing PDF content on social media, embedding in presentations, or archiving visual records.',
action:      'Convert to Images',
},
{
id:          'img-to-pdf',
icon:        'fa-solid fa-file-arrow-up',
name:        'Image to PDF',
tagline:     'Build a PDF from photos or images',
description: 'Combine one or more JPG, PNG, or WebP images into a properly formatted PDF. Drag to reorder images, choose portrait or landscape layout, and set margins. Great for scanning receipts, creating photo albums, or preparing image-heavy documents.',
action:      'Create PDF',
},
{
id:          'watermark',
icon:        'fa-solid fa-stamp',
name:        'Add Watermark',
tagline:     'Brand or protect your documents',
description: 'Overlay custom text (e.g. "Confidential", "Draft", your company name) on every page of a PDF. Control the opacity, font size, rotation angle, and position of the watermark. Your original content remains intact and fully readable.',
action:      'Apply Watermark',
},
{
id:          'unlock',
icon:        'fa-solid fa-lock-open',
name:        'Unlock PDF',
tagline:     'Remove password protection',
description: 'Remove the password from a PDF file you own so it can be opened freely on any device or shared without restrictions. You will need to supply the correct password once to authorise the removal. Only use this tool on files you have permission to unlock.',
action:      'Unlock File',
},
{
id:          'protect',
icon:        'fa-solid fa-lock',
name:        'Protect PDF',
tagline:     'Password-protect sensitive files',
description: 'Set a strong password on a PDF to prevent unauthorised access. You can also restrict individual permissions — such as printing, copying text, or making edits — while still allowing the file to be viewed with the password. Encryption is applied locally in your browser.',
action:      'Protect File',
},
{
id:          'page-numbers',
icon:        'fa-solid fa-list-ol',
name:        'Add Page Numbers',
tagline:     'Number pages automatically',
description: 'Insert page numbers into your PDF at any position — top-left, top-center, top-right, bottom-left, bottom-center, or bottom-right. Choose the starting number, font size, and margin. Supports Roman numerals or standard Arabic numbering.',
action:      'Add Numbers',
},
{
id:          'reorder',
icon:        'fa-solid fa-arrows-up-down',
name:        'Reorder Pages',
tagline:     'Drag pages into the right order',
description: 'Rearrange the pages of a PDF using a visual drag-and-drop interface. Thumbnail previews let you see exactly what each page contains before you commit. Delete unwanted pages in the same step, then download the reordered document.',
action:      'Save Order',
},
{
id:          'pdf-to-word',
icon:        'fa-solid fa-file-word',
name:        'PDF to Word',
tagline:     'Convert to editable .docx format',
description: 'Export a PDF as a Microsoft Word (.docx) file while preserving headings, paragraphs, tables, and basic formatting. Useful when you need to edit or repurpose the text in a PDF that was originally created from a Word document.',
action:      'Convert to Word',
},
];

// ─────────────────────────────────────────────────────────────
// 2. DOM REFERENCES
// ─────────────────────────────────────────────────────────────
const toolsGrid     = document.getElementById('tools-grid');
const workspace     = document.getElementById('hero-workspace');
const canvasContent = document.getElementById('canvas-content');
const toastEl       = document.getElementById('toast');
const navToggle     = document.querySelector('.nav-toggle');
const navLinks      = document.getElementById('primary-nav');

// ─────────────────────────────────────────────────────────────
// 3. RENDER TOOL CARDS
// ─────────────────────────────────────────────────────────────
function renderToolCards() {
if (!toolsGrid) return;

TOOLS.forEach(tool => {
const card = document.createElement('article');
card.className = 'tool-card';
card.setAttribute('role', 'listitem');
card.setAttribute('tabindex', '0');
card.setAttribute('aria-label', ${tool.name}: ${tool.tagline});
card.dataset.toolId = tool.id;

card.innerHTML = `  
  <div class="tool-card-icon" aria-hidden="true">  
    <i class="${tool.icon}"></i>  
  </div>  
  <div>  
    <p class="tool-card-name">${tool.name}</p>  
    <p class="tool-card-tagline">${tool.tagline}</p>  
  </div>  
`;  

card.addEventListener('click', () => activateTool(tool));  
card.addEventListener('keydown', e => {  
  if (e.key === 'Enter' || e.key === ' ') {  
    e.preventDefault();  
    activateTool(tool);  
  }  
});  

toolsGrid.appendChild(card);

});
}

// ─────────────────────────────────────────────────────────────
// 4. ACTIVATE TOOL IN WORKSPACE
// ─────────────────────────────────────────────────────────────
function activateTool(tool) {
// Highlight the selected card
document.querySelectorAll('.tool-card').forEach(c => c.classList.remove('active'));
document.querySelector(.tool-card[data-tool-id="${tool.id}"])?.classList.add('active');

// Populate the hero workspace panel
workspace.innerHTML = `
<div class="tool-active-panel" role="region" aria-label="${tool.name} workspace">
<h3>
<i class="${tool.icon}" aria-hidden="true"></i>
${tool.name}
</h3>
<p class="tool-description">${tool.description}</p>

<div  
    class="upload-area"  
    id="upload-area-${tool.id}"  
    role="button"  
    tabindex="0"  
    aria-label="Upload files for ${tool.name}"  
  >  
    <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>  
    <strong>Drag &amp; drop files here</strong><br>  
    <span style="font-size:0.85em;opacity:.8">or click to browse</span>  
    <input  
      type="file"  
      id="file-input-${tool.id}"  
      style="display:none"  
      accept=".pdf,application/pdf"  
      ${['img-to-pdf', 'pdf-to-img'].includes(tool.id) ? 'accept="image/*,.pdf"' : ''}  
      multiple  
      aria-label="File input for ${tool.name}"  
    >  
  </div>  

  <button class="tool-action-btn" id="action-btn-${tool.id}" disabled>  
    <i class="fa-solid fa-bolt" aria-hidden="true"></i>  
    ${tool.action}  
  </button>  
</div>

`;

bindUploadArea(tool);

// Smooth scroll to workspace on mobile
if (window.innerWidth < 960) {
workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
}

// ─────────────────────────────────────────────────────────────
// 5. UPLOAD AREA BEHAVIOUR
// ─────────────────────────────────────────────────────────────
function bindUploadArea(tool) {
const area      = document.getElementById(upload-area-${tool.id});
const fileInput = document.getElementById(file-input-${tool.id});
const actionBtn = document.getElementById(action-btn-${tool.id});

if (!area || !fileInput || !actionBtn) return;

let selectedFiles = [];

// Click to open file picker
area.addEventListener('click', () => fileInput.click());
area.addEventListener('keydown', e => {
if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});

fileInput.addEventListener('change', () => {
selectedFiles = Array.from(fileInput.files);
onFilesSelected(selectedFiles, area, actionBtn);
});

// Drag & drop
area.addEventListener('dragover', e => {
e.preventDefault();
area.classList.add('dragover');
});

area.addEventListener('dragleave', () => area.classList.remove('dragover'));

area.addEventListener('drop', e => {
e.preventDefault();
area.classList.remove('dragover');
selectedFiles = Array.from(e.dataTransfer.files);
onFilesSelected(selectedFiles, area, actionBtn);
});

// Action button click — calls the appropriate handler
actionBtn.addEventListener('click', () => {
if (!selectedFiles.length) return;
handleToolAction(tool, selectedFiles);
});
}

function onFilesSelected(files, area, btn) {
if (!files.length) return;

const names = files.map(f => f.name).join(', ');
const summary = files.length === 1
? files[0].name
: ${files.length} files selected;

area.innerHTML =   <i class="fa-solid fa-file-circle-check" aria-hidden="true"></i>   <strong>${summary}</strong><br>   <span style="font-size:0.8em;opacity:.7">${names}</span>  ;

btn.disabled = false;
}

// ─────────────────────────────────────────────────────────────
// 6. TOOL ACTION HANDLER (extend per tool as needed)
// ─────────────────────────────────────────────────────────────
async function handleToolAction(tool, files) {
const actionBtn = document.getElementById(action-btn-${tool.id});
if (actionBtn) {
actionBtn.disabled = true;
actionBtn.innerHTML = <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Processing…;
}

try {
switch (tool.id) {
case 'merge':    await mergePDFs(files);    break;
case 'rotate':   await rotatePDF(files[0]); break;
case 'compress': await compressPDF(files[0]); break;
// Add additional cases here as you implement each tool
default:
showToast("${tool.name}" processing — integration coming soon!, 'info');
}
} catch (err) {
console.error(err);
showToast(Error: ${err.message}, 'error');
} finally {
if (actionBtn) {
actionBtn.disabled = false;
actionBtn.innerHTML = <i class="fa-solid fa-bolt" aria-hidden="true"></i> ${tool.action};
}
}
}

// ─────────────────────────────────────────────────────────────
// 7. PDF OPERATIONS  (using pdf-lib)
// ─────────────────────────────────────────────────────────────

/** Merge multiple PDF files into one and trigger download. */
async function mergePDFs(files) {
const { PDFDocument } = PDFLib;
const merged = await PDFDocument.create();

for (const file of files) {
const bytes    = await readFileAsArrayBuffer(file);
const srcDoc   = await PDFDocument.load(bytes);
const copiedPages = await merged.copyPages(srcDoc, srcDoc.getPageIndices());
copiedPages.forEach(p => merged.addPage(p));
}

const mergedBytes = await merged.save();
downloadBytes(mergedBytes, 'merged.pdf');
showToast('Files merged successfully!', 'success');
}

/** Rotate all pages of a PDF 90° clockwise and download. */
async function rotatePDF(file) {
const { PDFDocument, degrees } = PDFLib;
const bytes = await readFileAsArrayBuffer(file);
const pdfDoc = await PDFDocument.load(bytes);

pdfDoc.getPages().forEach(page => {
const current = page.getRotation().angle;
page.setRotation(degrees((current + 90) % 360));
});

const rotatedBytes = await pdfDoc.save();
downloadBytes(rotatedBytes, 'rotated.pdf');
showToast('PDF rotated 90° and ready to download!', 'success');
}

/** Basic compress: re-saves PDF (removes redundant metadata). */
async function compressPDF(file) {
const { PDFDocument } = PDFLib;
const bytes  = await readFileAsArrayBuffer(file);
const pdfDoc = await PDFDocument.load(bytes, { updateMetadata: false });
const compressedBytes = await pdfDoc.save({ useObjectStreams: true });
downloadBytes(compressedBytes, 'compressed.pdf');
showToast('PDF compressed and ready to download!', 'success');
}

// ─────────────────────────────────────────────────────────────
// 8. UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────

function readFileAsArrayBuffer(file) {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload  = () => resolve(reader.result);
reader.onerror = () => reject(new Error('Failed to read file.'));
reader.readAsArrayBuffer(file);
});
}

function downloadBytes(bytes, filename) {
const blob = new Blob([bytes], { type: 'application/pdf' });
const url  = URL.createObjectURL(blob);
const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// 9. TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────────
let toastTimer;

function showToast(message, type = 'info') {
if (!toastEl) return;
clearTimeout(toastTimer);

toastEl.textContent = message;
toastEl.className   = toast ${type} visible;

toastTimer = setTimeout(() => {
toastEl.classList.remove('visible');
}, 4000);
}

// ─────────────────────────────────────────────────────────────
// 10. MOBILE NAVIGATION TOGGLE
// ─────────────────────────────────────────────────────────────
if (navToggle && navLinks) {
navToggle.addEventListener('click', () => {
const open = navLinks.classList.toggle('open');
navToggle.setAttribute('aria-expanded', String(open));
});

// Close nav when a link is clicked
navLinks.querySelectorAll('.nav-link').forEach(link => {
link.addEventListener('click', () => {
navLinks.classList.remove('open');
navToggle.setAttribute('aria-expanded', 'false');
});
});

// Close nav on outside click
document.addEventListener('click', e => {
if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
navLinks.classList.remove('open');
navToggle.setAttribute('aria-expanded', 'false');
}
});
}

// ─────────────────────────────────────────────────────────────
// 11. INIT
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
renderToolCards();
});
