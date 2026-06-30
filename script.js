PdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const { PDFDocument, rgb, degrees } = PDFLib;

let activeFiles = [];
let currentToolId = null;

class AppUI {
    static showToast(msg, type = 'success') {
        const t = document.getElementById('toast');
        const isError = type === 'error';
        t.innerHTML = isError 
            ? `<i class="fa-solid fa-circle-exclamation text-sm"></i> <span>${msg}</span>` 
            : `<i class="fa-solid fa-circle-check text-sm"></i> <span>${msg}</span>`;
        t.className = `fixed bottom-6 right-6 px-5 py-3 rounded-xl text-white text-xs font-semibold shadow-2xl flex items-center space-x-2 z-50 transition duration-300 transform translate-y-0 opacity-100 gpu-accelerate ${isError ? 'bg-red-500 shadow-red-200/50' : 'bg-emerald-600 shadow-emerald-200/50'}`;
        setTimeout(() => { t.classList.remove('translate-y-0', 'opacity-100'); t.classList.add('translate-y-20', 'opacity-0'); }, 4000);
    }

    static renderFileInput(tool, multiple = false, accept = ".pdf") {
        const cBase = tool.color.split('-')[0];
        return `
            <div class="space-y-3">
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Source File(s)</label>
                <div id="drop-zone" class="relative w-full border-2 border-dashed border-${cBase}-300 rounded-2xl p-6 bg-${cBase}-50/50 transition-colors text-center hover:bg-${cBase}-100/60">
                    <input type="file" id="active-file-input" ${multiple ? 'multiple' : ''} accept="${accept}" 
                        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange="AppUI.handleFileSelect(event, ${multiple}, '${tool.color}')">
                    <div class="pointer-events-none space-y-2">
                        <i class="fa-solid fa-cloud-arrow-up text-3xl text-${tool.color} mb-1"></i>
                        <p class="text-sm font-semibold text-slate-600">Drag & drop files or click to browse</p>
                        <p class="text-xs text-slate-400">Maximum speed processing</p>
                    </div>
                </div>
                <div id="file-list" class="space-y-2 max-h-40 overflow-y-auto hidden"></div>
                <div id="preview-container" class="hidden w-full mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100 preview-scroll"></div>
                <div id="progress-container" class="hidden w-full bg-slate-200 rounded-full h-1.5 mt-2">
                    <div id="progress-bar" class="bg-${tool.color} h-1.5 rounded-full" style="width: 0%; transition: width 0.2s;"></div>
                </div>
            </div>
        `;
    }

    static handleFileSelect(event, multiple, colorClass) {
        const files = Array.from(event.target.files);
        if (!files.length) return;
        if(!multiple) activeFiles = files.slice(0,1);
        else activeFiles = [...activeFiles, ...files];
        this.updateFileList(colorClass);
    }

    static updateFileList(colorClass) {
        const list = document.getElementById('file-list');
        const preview = document.getElementById('preview-container');
        if(!activeFiles.length) { 
            list.classList.add('hidden'); 
            if(preview) preview.classList.add('hidden');
            return; 
        }
        list.classList.remove('hidden');
        
        const fragment = document.createDocumentFragment();
        activeFiles.forEach((f, i) => {
            const div = document.createElement('div');
            div.className = "flex items-center justify-between bg-white p-3 border border-slate-200 rounded-xl shadow-sm text-sm";
            div.draggable = true;
            div.ondragstart = (e) => AppUI.dragStart(e, i);
            div.ondragover = (e) => e.preventDefault();
            div.ondrop = (e) => AppUI.drop(e, i, colorClass);
            
            div.innerHTML = `
                <span class="truncate max-w-[200px] font-medium text-slate-700">
                    <i class="fa-solid fa-grip-vertical text-slate-300 cursor-move mr-2"></i> ${f.name}
                </span>
                <div class="flex items-center space-x-3">
                    <span class="text-slate-400 text-xs">${(f.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button onclick="AppUI.removeFile(${i}, '${colorClass}')" class="text-red-400 hover:text-red-600 transition-colors"><i class="fa-solid fa-xmark"></i></button>
                </div>
            `;
            fragment.appendChild(div);
        });
        
        list.innerHTML = '';
        list.appendChild(fragment);

        // Render previews if applicable
        const previewTools = ['del', 'extract', 'rotate', 'reorder', 'numbers'];
        if (activeFiles.length === 1 && activeFiles[0].type === 'application/pdf' && previewTools.includes(currentToolId)) {
            this.renderThumbnails(activeFiles[0]);
        } else if (previewTools.includes(currentToolId) && preview) {
            preview.classList.add('hidden');
        }
    }

    static async renderThumbnails(file) {
        const container = document.getElementById('preview-container');
        if(!container) return;
        
        container.innerHTML = '<div class="text-xs text-slate-500 text-center py-2"><i class="fa-solid fa-spinner fa-spin"></i> Generating previews...</div>';
        container.classList.remove('hidden');
        
        try {
            const url = URL.createObjectURL(file);
            const pdf = await pdfjsLib.getDocument(url).promise;
            const maxPages = Math.min(pdf.numPages, 12); // Limit for performance
            
            let html = '<div class="flex gap-3 overflow-x-auto pb-2 preview-scroll">';
            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.3 });
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({ canvasContext: ctx, viewport }).promise;
                
                html += `
                    <div class="shrink-0 flex flex-col items-center">
                        <img src="${canvas.toDataURL()}" class="h-24 w-auto border border-slate-200 rounded shadow-sm object-contain bg-white">
                        <span class="text-[10px] mt-1.5 font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Page ${i}</span>
                    </div>
                `;
            }
            if (pdf.numPages > maxPages) {
                html += `
                    <div class="shrink-0 flex items-center justify-center h-24 px-4 bg-slate-100 border border-slate-200 rounded text-xs text-slate-400 font-medium">
                        +${pdf.numPages - maxPages} more
                    </div>
                `;
            }
            html += '</div>';
            container.innerHTML = html;
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Preview rendering failed:", e);
            container.innerHTML = '<div class="text-xs text-red-400 text-center py-2">Preview unavailable</div>';
        }
    }

    static removeFile(index, colorClass) {
        activeFiles.splice(index, 1);
        this.updateFileList(colorClass);
        if(activeFiles.length === 0) document.getElementById('active-file-input').value = '';
    }

    static dragStart(e, index) { e.dataTransfer.setData("text/plain", index); }
    static drop(e, targetIndex, colorClass) {
        const sourceIndex = e.dataTransfer.getData("text/plain");
        const item = activeFiles.splice(sourceIndex, 1)[0];
        activeFiles.splice(targetIndex, 0, item);
        this.updateFileList(colorClass);
    }

    static updateProgress(percent) {
        const container = document.getElementById('progress-container');
        const bar = document.getElementById('progress-bar');
        if(container && bar) {
            container.classList.remove('hidden');
            bar.style.width = `${percent}%`;
        }
    }

    static loadImgDims(input) {
        this.handleFileSelect({target: input}, false, 'red-500');
        if(activeFiles.length === 0) return;
        const file = activeFiles[0];
        if(!file.type.startsWith('image/')) { this.showToast("Please select a valid image.", 'error'); return; }
        const img = new Image();
        const url = URL.createObjectURL(file); 
        img.onload = () => { 
            const origDims = document.getElementById('orig-dims');
            if(origDims) origDims.innerHTML = `Original: <b>${img.width}x${img.height}</b> px`;
            
            document.getElementById('img-w').value = img.width; 
            document.getElementById('img-h').value = img.height; 
            document.getElementById('img-w').dataset.ratio = img.width / img.height;
            URL.revokeObjectURL(url); 
        }
        img.src = url;
    }

    static toggleResizeMode() {
        const mode = document.getElementById('resize-mode').value;
        if (mode === 'pct') {
            document.getElementById('dim-inputs').classList.add('hidden');
            document.getElementById('pct-inputs').classList.remove('hidden');
        } else {
            document.getElementById('dim-inputs').classList.remove('hidden');
            document.getElementById('pct-inputs').classList.add('hidden');
        }
    }

    static toggleWatermarkMode() {
        const type = document.getElementById('wm-type').value;
        if(type === 'image') {
            document.getElementById('wm-text-opts').classList.add('hidden');
            document.getElementById('wm-img-opts').classList.remove('hidden');
        } else {
            document.getElementById('wm-text-opts').classList.remove('hidden');
            document.getElementById('wm-img-opts').classList.add('hidden');
        }
    }

    static syncRatio(isWidth) {
        const lock = document.getElementById('lock-ratio').checked;
        if(!lock) return;
        const wInput = document.getElementById('img-w');
        const hInput = document.getElementById('img-h');
        const ratio = parseFloat(wInput.dataset.ratio);
        if(isWidth && wInput.value) hInput.value = Math.round(wInput.value / ratio);
        else if(!isWidth && hInput.value) wInput.value = Math.round(hInput.value * ratio);
    }
}

class PDFEngine {
    static async downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); 
        URL.revokeObjectURL(url);
    }

    static parsePageRanges(rangeStr, maxPages) {
        if(!rangeStr || rangeStr.trim() === '') return Array.from({length: maxPages}, (_, i) => i);
        const pages = new Set();
        const parts = rangeStr.split(',').map(p => p.trim());
        for (let part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if (start > 0 && end <= maxPages && start <= end) {
                    for (let i = start; i <= end; i++) pages.add(i - 1);
                } else throw new Error(`Invalid range: ${part}`);
            } else {
                const num = Number(part);
                if (num > 0 && num <= maxPages) pages.add(num - 1);
                else throw new Error(`Invalid page number: ${part}`);
            }
        }
        return Array.from(pages).sort((a,b) => a-b);
    }

    static async execute(id, toolDef) {
        if(!activeFiles || activeFiles.length === 0) { AppUI.showToast("Please upload required file(s).", 'error'); return; }
        
        const btn = document.getElementById('execute-btn');
        const originalBtnText = btn.innerHTML;
        btn.disabled = true; 
        btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Processing...`; 
        btn.classList.add('opacity-70', 'cursor-not-allowed');
        
        AppUI.updateProgress(10);
        await new Promise(r => setTimeout(r, 10)); 

        try {
            let finalBlob = null; let filename = `Output_${id}.pdf`;
            if (id === 'resizer') { 
                finalBlob = await this.processResizer(activeFiles[0]); 
                filename = `Resized_Image.${document.getElementById('img-format').value.split('/')[1]}`; 
            } 
            else if (id === 'imgToPdf') { 
                finalBlob = await this.processImagesToPdf(activeFiles); 
            } 
            else if (id === 'merge') { 
                finalBlob = await this.processMerge(activeFiles); 
            } 
            else {
                AppUI.updateProgress(30);
                await new Promise(r => setTimeout(r, 10)); 
                const fileBytes = await activeFiles[0].arrayBuffer();
                const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
                AppUI.updateProgress(50);
                await new Promise(r => setTimeout(r, 10)); 
                finalBlob = await this.processSinglePDF(id, pdfDoc);
                if(id === 'split') filename = `Split_Result.zip`;
            }
            AppUI.updateProgress(100);
            if (finalBlob) { 
                await this.downloadBlob(finalBlob, filename); 
                AppUI.showToast("Operation completed successfully!"); 
            }
        } catch (error) { 
            console.error(error);
            AppUI.showToast(error.message, 'error'); 
        } 
        finally { 
            btn.disabled = false; btn.innerHTML = originalBtnText; btn.classList.remove('opacity-70', 'cursor-not-allowed');
            setTimeout(() => { 
                const pc = document.getElementById('progress-container');
                if (pc) pc.classList.add('hidden'); 
            }, 1500);
        }
    }

    static async processResizer(file) {
        let w, h;
        const mode = document.getElementById('resize-mode')?.value || 'dim';
        const format = document.getElementById('img-format').value;
        const quality = parseFloat(document.getElementById('img-quality').value) / 100;
        
        const img = await new Promise((resolve, reject) => { 
            const imgEl = new Image(); 
            const url = URL.createObjectURL(file);
            imgEl.onload = () => { resolve(imgEl); URL.revokeObjectURL(url); }; 
            imgEl.onerror = () => { reject(new Error("Failed to decode image.")); URL.revokeObjectURL(url); }; 
            imgEl.src = url; 
        });

        if (mode === 'pct') {
            const pct = parseFloat(document.getElementById('img-pct').value) / 100;
            if (!pct || pct <= 0) throw new Error("Invalid percentage.");
            w = Math.max(1, Math.round(img.width * pct));
            h = Math.max(1, Math.round(img.height * pct));
        } else {
            w = parseInt(document.getElementById('img-w').value);
            h = parseInt(document.getElementById('img-h').value);
            if (!w || !h || w <= 0 || h <= 0) throw new Error("Invalid dimensions specified.");
        }
        
        const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d', { alpha: format !== 'image/jpeg' });
        if(format === 'image/jpeg') { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(img, 0, 0, w, h);
        return await new Promise(resolve => canvas.toBlob(resolve, format, quality));
    }

    static async processImagesToPdf(files) {
        const doc = await PDFDocument.create(); 
        const sizeSetting = document.getElementById('page-size').value.split(',');
        const orientation = document.getElementById('orientation').value;
        const fitMode = document.getElementById('img-fit').value;
        const margin = parseInt(document.getElementById('margin').value) || 0;
        
        let PAGE_W = parseFloat(sizeSetting[0]);
        let PAGE_H = parseFloat(sizeSetting[1]);
        if(orientation === 'landscape') { const temp = PAGE_W; PAGE_W = PAGE_H; PAGE_H = temp; }

        for (let i=0; i<files.length; i++) {
            const f = files[i];
            AppUI.updateProgress(10 + (i / files.length) * 80);
            await new Promise(r => setTimeout(r, 0)); 
            
            const bytes = await f.arrayBuffer(); let img;
            if (f.type === 'image/png') img = await doc.embedPng(bytes); 
            else if (f.type === 'image/jpeg' || f.type === 'image/jpg') img = await doc.embedJpg(bytes); 
            else continue;
            
            const drawAreaW = PAGE_W - (margin * 2);
            const drawAreaH = PAGE_H - (margin * 2);
            
            let finalW, finalH, x, y;

            if (fitMode === 'stretch') {
                finalW = drawAreaW; finalH = drawAreaH;
                x = margin; y = margin;
            } else if (fitMode === 'fill') {
                const scale = Math.max(drawAreaW / img.width, drawAreaH / img.height);
                finalW = img.width * scale; finalH = img.height * scale;
                x = (PAGE_W - finalW) / 2; y = (PAGE_H - finalH) / 2;
            } else { // 'fit' (default)
                const scale = Math.min(drawAreaW / img.width, drawAreaH / img.height);
                finalW = img.width * scale; finalH = img.height * scale;
                x = (PAGE_W / 2) - (finalW / 2); y = (PAGE_H / 2) - (finalH / 2);
            }
            
            const page = doc.addPage([PAGE_W, PAGE_H]);
            page.drawImage(img, { x, y, width: finalW, height: finalH });
        }
        const pdfBytes = await doc.save(); return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    static async processMerge(files) {
        const doc = await PDFDocument.create();
        for (let i = 0; i < files.length; i++) {
            AppUI.updateProgress(10 + (i / files.length) * 80);
            await new Promise(r => setTimeout(r, 10)); 
            
            const f = files[i];
            const bytes = await f.arrayBuffer(); const src = await PDFDocument.load(bytes);
            const pages = await doc.copyPages(src, src.getPageIndices()); pages.forEach(p => doc.addPage(p));
        }
        const pdfBytes = await doc.save(); return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? rgb(parseInt(result[1], 16)/255, parseInt(result[2], 16)/255, parseInt(result[3], 16)/255) : rgb(0,0,0);
    }

    static async processSinglePDF(id, sourceDoc) {
        const totalPages = sourceDoc.getPageCount();
        
        if (id === 'split') {
            const zip = new JSZip();
            const mode = document.getElementById('split-mode').value;
            const rangeStr = document.getElementById('pg-input').value;
            
            if (mode === 'every') {
                for (let i = 0; i < totalPages; i++) {
                    AppUI.updateProgress(50 + (i / totalPages) * 40);
                    await new Promise(r => setTimeout(r, 0));
                    const subDoc = await PDFDocument.create(); 
                    const [p] = await subDoc.copyPages(sourceDoc, [i]); 
                    subDoc.addPage(p);
                    zip.file(`Page_${i + 1}.pdf`, await subDoc.save());
                }
            } else if (mode === 'n-pages') {
                const n = parseInt(rangeStr) || 1;
                if (n <= 0) throw new Error("Invalid N pages value.");
                for (let i = 0; i < totalPages; i += n) {
                    AppUI.updateProgress(50 + (i / totalPages) * 40);
                    await new Promise(r => setTimeout(r, 0));
                    const subDoc = await PDFDocument.create();
                    const end = Math.min(i + n, totalPages);
                    const indices = Array.from({length: end - i}, (_, idx) => i + idx);
                    const pages = await subDoc.copyPages(sourceDoc, indices);
                    pages.forEach(p => subDoc.addPage(p));
                    zip.file(`Pages_${i + 1}_to_${end}.pdf`, await subDoc.save());
                }
            } else {
                const indicesToSplit = this.parsePageRanges(rangeStr, totalPages);
                for (let i = 0; i < indicesToSplit.length; i++) {
                    const idx = indicesToSplit[i];
                    AppUI.updateProgress(50 + (i / indicesToSplit.length) * 40);
                    await new Promise(r => setTimeout(r, 0)); 
                    const subDoc = await PDFDocument.create(); 
                    const [p] = await subDoc.copyPages(sourceDoc, [idx]); 
                    subDoc.addPage(p);
                    zip.file(`Page_${idx + 1}.pdf`, await subDoc.save());
                }
            }
            return await zip.generateAsync({type: "blob"});
        } 
        if (id === 'rotate') { 
            const dir = parseInt(document.getElementById('rot-dir').value);
            const rangeStr = document.getElementById('pg-input').value;
            const indices = this.parsePageRanges(rangeStr, totalPages);
            indices.forEach(idx => {
                const p = sourceDoc.getPage(idx);
                p.setRotation(degrees((p.getRotation().angle + dir) % 360));
            });
        } 
        else if (id === 'del') { 
            const rangeStr = document.getElementById('pg-input').value;
            const indices = this.parsePageRanges(rangeStr, totalPages).sort((a,b) => b-a); 
            if (indices.length >= totalPages) throw new Error("Cannot delete all pages."); 
            if (indices.length === 0) throw new Error("No pages selected to delete.");
            indices.forEach(idx => sourceDoc.removePage(idx));
        } 
        else if (id === 'extract') { 
            const rangeStr = document.getElementById('pg-input').value;
            const indices = this.parsePageRanges(rangeStr, totalPages);
            if(indices.length === 0) throw new Error("No valid pages selected.");
            const newDoc = await PDFDocument.create(); 
            const extracted = await newDoc.copyPages(sourceDoc, indices); 
            extracted.forEach(p => newDoc.addPage(p)); 
            sourceDoc = newDoc; 
        } 
        else if (id === 'reorder') { 
            const rangeStr = document.getElementById('pg-input')?.value;
            const indices = rangeStr ? this.parsePageRanges(rangeStr, totalPages) : Array.from({length: totalPages}, (_, i) => i);
            if (indices.length === 0) throw new Error("No pages selected to reverse.");
            
            const reversedIndices = [...indices].reverse();
            const newDoc = await PDFDocument.create();
            for(let i = 0; i < totalPages; i++) {
                const srcIdx = indices.includes(i) ? reversedIndices[indices.indexOf(i)] : i;
                const [p] = await newDoc.copyPages(sourceDoc, [srcIdx]);
                newDoc.addPage(p);
            }
            sourceDoc = newDoc; 
        } 
        else if (id === 'watermark') { 
            const type = document.getElementById('wm-type').value;
            const rangeStr = document.getElementById('pg-input').value;
            const indices = this.parsePageRanges(rangeStr, totalPages);
            
            if (type === 'image') {
                const imgFile = document.getElementById('wm-img').files[0];
                if (!imgFile) throw new Error("Please select an image file.");
                const bytes = await imgFile.arrayBuffer();
                let wmImg;
                if (imgFile.type === 'image/png') wmImg = await sourceDoc.embedPng(bytes);
                else if (imgFile.type === 'image/jpeg' || imgFile.type === 'image/jpg') wmImg = await sourceDoc.embedJpg(bytes);
                else throw new Error("Unsupported image type.");

                const wmScale = parseFloat(document.getElementById('wm-img-scale').value) || 0.5;
                const wmOpacity = parseFloat(document.getElementById('wm-img-opacity').value) || 0.5;

                sourceDoc.getPages().forEach((p, i) => {
                    if (!indices.includes(i)) return;
                    const { width, height } = p.getSize();
                    const scaledW = wmImg.width * wmScale;
                    const scaledH = wmImg.height * wmScale;
                    p.drawImage(wmImg, {
                        x: (width / 2) - (scaledW / 2),
                        y: (height / 2) - (scaledH / 2),
                        width: scaledW,
                        height: scaledH,
                        opacity: wmOpacity
                    });
                });
            } else {
                const text = document.getElementById('txt-input').value || "CONFIDENTIAL"; 
                const color = this.hexToRgb(document.getElementById('wm-color').value);
                const opacity = parseFloat(document.getElementById('wm-opacity').value);
                const size = parseInt(document.getElementById('wm-size').value);
                const pos = document.getElementById('wm-pos').value;

                sourceDoc.getPages().forEach((p, i) => { 
                    if (!indices.includes(i)) return;
                    const { width, height } = p.getSize(); 
                    let x = width / 4, y = height / 2, rot = 45;
                    if(pos === 'top') { x = 50; y = height - 100; rot = 0; }
                    else if(pos === 'bottom') { x = 50; y = 50; rot = 0; }
                    p.drawText(text, { x, y, size, color, opacity, rotate: degrees(rot) }); 
                }); 
            }
        } 
        else if (id === 'numbers') { 
            const pos = document.getElementById('pg-pos').value;
            const startNum = parseInt(document.getElementById('pg-start').value);
            const size = parseInt(document.getElementById('pg-size').value);
            const color = this.hexToRgb(document.getElementById('pg-color').value);
            const rangeStr = document.getElementById('pg-input').value;
            const indices = this.parsePageRanges(rangeStr, totalPages);
            
            let count = startNum;
            sourceDoc.getPages().forEach((p, i) => { 
                if (!indices.includes(i)) return;
                
                const { width, height } = p.getSize(); 
                let x = width - 70, y = 30; 
                
                if(pos === 'bottom-left') { x = 30; y = 30; }
                else if(pos === 'bottom-center') { x = width/2 - 20; y = 30; }
                else if(pos === 'bottom-right') { x = width - 70; y = 30; }
                else if(pos === 'top-left') { x = 30; y = height - 30; }
                else if(pos === 'top-center') { x = width/2 - 20; y = height - 30; }
                else if(pos === 'top-right') { x = width - 70; y = height - 30; }
                
                p.drawText(`${count}`, { x, y, size, color }); 
                count++;
            }); 
        }
        AppUI.updateProgress(90);
        await new Promise(r => setTimeout(r, 10));
        const pdfBytes = await sourceDoc.save(); 
        return new Blob([pdfBytes], { type: 'application/pdf' });
    }
}

const ToolsConfig = {
    merge: { name: "Merge PDF", desc: "Combine & reorder PDFs.", icon: "fa-copy", color: "blue-600", render: (t) => AppUI.renderFileInput(t, true) },
    split: { name: "Split PDF", desc: "Extract to ZIP by ranges or intervals.", icon: "fa-scissors", color: "emerald-600", render: (t) => AppUI.renderFileInput(t) + `
        <div class="grid grid-cols-2 gap-3 mt-4">
            <select id="split-mode" class="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none bg-white transition-shadow">
                <option value="range">Specific Ranges</option>
                <option value="every">Split Every Page</option>
                <option value="n-pages">Split Every N Pages</option>
            </select>
            <input type="text" id="pg-input" placeholder="Range (e.g. 1-3) or N value" class="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-shadow">
        </div>` },
    imgToPdf: { name: "Image to PDF", desc: "Advanced document creation.", icon: "fa-images", color: "blue-700", render: (t) => AppUI.renderFileInput(t, true, "image/*") + `
        <div class="grid grid-cols-2 gap-3 mt-4">
            <select id="page-size" class="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500/50 transition-shadow">
                <option value="595.28,841.89">A4</option><option value="612,792">US Letter</option>
            </select>
            <select id="orientation" class="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500/50 transition-shadow">
                <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
            </select>
            <select id="img-fit" class="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500/50 transition-shadow">
                <option value="fit">Fit (Preserve Ratio)</option><option value="fill">Fill (Crop to Fit)</option><option value="stretch">Stretch</option>
            </select>
            <input type="number" id="margin" placeholder="Margin (px)" value="20" class="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow">
        </div>` },
    resizer: { name: "Image Resizer", desc: "Advanced resizing offline.", icon: "fa-compress", color: "red-500", render: (t) => `
        <div class="space-y-3">
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Source Image</label>
            <div id="drop-zone" class="relative w-full border-2 border-dashed border-red-300 rounded-2xl p-6 bg-red-50/50 transition-colors text-center hover:bg-red-100/60">
                <input type="file" id="active-file-input" accept="image/jpeg, image/png, image/webp" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange="AppUI.loadImgDims(this)">
                <div class="pointer-events-none space-y-2">
                    <i class="fa-solid fa-cloud-arrow-up text-3xl text-red-500 mb-1"></i>
                    <p class="text-sm font-semibold text-slate-600">Drag & drop or click</p>
                </div>
            </div>
            <div id="file-list" class="space-y-2 hidden"></div>
            <div id="orig-dims" class="text-xs text-slate-500 mt-1 font-medium"></div>
        </div>
        <div class="space-y-4 mt-5">
            <select id="resize-mode" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500/50 outline-none bg-white transition-shadow" onchange="AppUI.toggleResizeMode()">
                <option value="dim">Resize by Dimensions</option>
                <option value="pct">Resize by Percentage</option>
            </select>
            
            <div id="dim-inputs" class="space-y-3">
                <label class="flex items-center space-x-2 text-sm text-slate-600 font-medium"><input type="checkbox" id="lock-ratio" checked class="rounded text-red-500 focus:ring-red-500"> <span>Lock Aspect Ratio</span></label>
                <div class="flex gap-3">
                    <input type="number" id="img-w" placeholder="Width (px)" oninput="AppUI.syncRatio(true)" class="w-1/2 px-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500/50 outline-none transition">
                    <input type="number" id="img-h" placeholder="Height (px)" oninput="AppUI.syncRatio(false)" class="w-1/2 px-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500/50 outline-none transition">
                </div>
            </div>
            
            <div id="pct-inputs" class="hidden space-y-3">
                <input type="number" id="img-pct" placeholder="Scale Percentage (e.g. 50)" value="50" min="1" class="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500/50 outline-none transition">
            </div>
            
            <div class="flex gap-3">
                <select id="img-format" class="w-1/2 px-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500/50 outline-none bg-white transition">
                    <option value="image/jpeg">JPG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option>
                </select>
                <input type="number" id="img-quality" placeholder="Quality % (e.g. 90)" value="90" min="10" max="100" class="w-1/2 px-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-red-500/50 outline-none transition">
            </div>
        </div>` },
    rotate: { name: "Rotate Pages", desc: "Rotate specific pages.", icon: "fa-rotate-right", color: "purple-600", render: (t) => AppUI.renderFileInput(t) + `
        <div class="flex gap-3 mt-4">
            <select id="rot-dir" class="w-1/2 px-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none bg-white transition-shadow">
                <option value="90">Right (90°)</option><option value="-90">Left (-90°)</option><option value="180">Flip (180°)</option>
            </select>
            <input type="text" id="pg-input" placeholder="Pages (e.g. 1-3, 5)" class="w-1/2 px-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-purple-500/50 outline-none transition-shadow">
        </div>` },
    del: { name: "Delete Page", desc: "Remove page ranges.", icon: "fa-trash", color: "amber-500", render: (t) => AppUI.renderFileInput(t) + `<input type="text" id="pg-input" placeholder="Pages to delete (e.g. 1, 3-5)" class="w-full mt-4 px-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition-shadow">` },
    watermark: { name: "Watermark", desc: "Advanced image or text stamping.", icon: "fa-stamp", color: "cyan-500", render: (t) => AppUI.renderFileInput(t) + `
        <div class="grid grid-cols-2 gap-3 mt-4 mb-3">
            <select id="wm-type" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:ring-2 focus:ring-cyan-500/50 transition-shadow" onchange="AppUI.toggleWatermarkMode()">
                <option value="text">Text Watermark</option>
                <option value="image">Image Watermark</option>
            </select>
            <input type="text" id="pg-input" placeholder="Pages (e.g. 1-3) or all" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 transition-shadow">
        </div>
        
        <div id="wm-text-opts" class="space-y-3">
            <input type="text" id="txt-input" placeholder="Watermark Text" class="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 transition-shadow">
            <div class="grid grid-cols-2 gap-3">
                <input type="color" id="wm-color" value="#cccccc" class="w-full h-12 rounded-xl cursor-pointer">
                <input type="number" id="wm-opacity" placeholder="Opacity (0.1 - 1)" value="0.3" step="0.1" max="1" min="0.1" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 transition-shadow">
                <input type="number" id="wm-size" placeholder="Font Size" value="48" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 transition-shadow">
                <select id="wm-pos" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:ring-2 focus:ring-cyan-500/50 transition-shadow">
                    <option value="center">Center Diagonal</option><option value="top">Top</option><option value="bottom">Bottom</option>
                </select>
            </div>
        </div>
        
        <div id="wm-img-opts" class="hidden space-y-3">
            <input type="file" id="wm-img" accept="image/png, image/jpeg" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:ring-2 focus:ring-cyan-500/50 transition-shadow">
            <div class="grid grid-cols-2 gap-3">
                <input type="number" id="wm-img-scale" placeholder="Scale (e.g. 0.5)" value="0.5" step="0.1" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 transition-shadow">
                <input type="number" id="wm-img-opacity" placeholder="Opacity (e.g. 0.5)" value="0.5" step="0.1" max="1" min="0.1" class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-cyan-500/50 transition-shadow">
            </div>
        </div>` },
    numbers: { name: "Page Numbers", desc: "Custom sequence injection.", icon: "fa-list-ol", color: "teal-500", render: (t) => AppUI.renderFileInput(t) + `
        <input type="text" id="pg-input" placeholder="Pages to number (e.g. 1-3) or blank for all" class="w-full mt-4 px-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/50 outline-none transition-shadow">
        <div class="grid grid-cols-2 gap-3 mt-3">
            <select id="pg-pos" class="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm outline-none bg-white focus:ring-2 focus:ring-teal-500/50 transition-shadow">
                <option value="bottom-right">Bottom Right</option><option value="bottom-left">Bottom Left</option><option value="bottom-center">Bottom Center</option>
                <option value="top-right">Top Right</option><option value="top-left">Top Left</option><option value="top-center">Top Center</option>
            </select>
            <input type="color" id="pg-color" value="#000000" class="w-full h-[46px] rounded-xl cursor-pointer mt-1">
            <input type="number" id="pg-start" placeholder="Start Number" value="1" class="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-teal-500/50 transition-shadow">
            <input type="number" id="pg-size" placeholder="Font Size" value="12" class="w-full px-4 py-3.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-teal-500/50 transition-shadow">
        </div>` },
    extract: { name: "Extract Pages", desc: "Isolate specific ranges.", icon: "fa-file-export", color: "orange-500", render: (t) => AppUI.renderFileInput(t) + `<input type="text" id="pg-input" placeholder="Pages to extract (e.g. 2-6)" class="w-full mt-4 px-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-orange-500/50 outline-none transition-shadow">` },
    reorder: { name: "Reverse PDF", desc: "Flip layout order backwards.", icon: "fa-arrow-down-up-across-line", color: "pink-600", render: (t) => AppUI.renderFileInput(t) + `<input type="text" id="pg-input" placeholder="Pages to reverse (e.g. 1-3) or blank for all" class="w-full mt-4 px-4 py-3.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-pink-500/50 outline-none transition-shadow">` }
};

const toolMapping = {
    'image-resizer': 'resizer',
    'merge-pdf': 'merge',
    'split-zip': 'split',
    'rotate-pages': 'rotate',
    'delete-page': 'del',
    'extract-pages': 'extract',
    'reverse-pdf': 'reorder',
    'watermark': 'watermark',
    'page-numbers': 'numbers',
    'image-to-pdf': 'imgToPdf'
};

document.querySelectorAll('#tools-grid [data-tool]').forEach(card => {
    card.addEventListener('click', (e) => {
        e.preventDefault();
        const dataTool = card.getAttribute('data-tool');
        const toolKey = toolMapping[dataTool];
        if (toolKey) {
            activateWorkspace(toolKey);
            history.pushState(null, null, `#tool-${toolKey}`);
        }
    });
});

window.closeTool = function() {
    const panel = document.getElementById('hero-tool-panel');
    panel.classList.add('opacity-0');
    
    setTimeout(() => {
        panel.classList.add('hidden');
        panel.classList.remove('flex');
        
        document.getElementById('main-header').classList.remove('hidden');
        document.getElementById('our-tools').classList.remove('hidden');
        document.getElementById('about').classList.remove('hidden');
        document.getElementById('faq-section').classList.remove('hidden');
        
        setTimeout(() => {
            document.getElementById('main-header').classList.remove('opacity-0');
            document.getElementById('our-tools').classList.remove('opacity-0');
            document.getElementById('about').classList.remove('opacity-0');
            document.getElementById('faq-section').classList.remove('opacity-0');
        }, 10);
        
        history.pushState(null, null, 'index.html');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 300);
};

window.activateWorkspace = function(id) {
    document.getElementById('main-header').classList.add('opacity-0');
    document.getElementById('our-tools').classList.add('opacity-0');
    document.getElementById('about').classList.add('opacity-0');
    document.getElementById('faq-section').classList.add('opacity-0');
    
    setTimeout(() => {
        document.getElementById('main-header').classList.add('hidden');
        document.getElementById('our-tools').classList.add('hidden');
        document.getElementById('about').classList.add('hidden');
        document.getElementById('faq-section').classList.add('hidden');
        
        const panel = document.getElementById('hero-tool-panel');
        panel.classList.remove('hidden');
        panel.classList.add('flex');
        
        setTimeout(() => panel.classList.remove('opacity-0'), 20);
        
        const box = document.getElementById('tool-workspace-box');
        const canvas = document.getElementById('canvas-content');
        const tool = ToolsConfig[id];
        
        activeFiles = []; 
        currentToolId = id;
        
        box.style.opacity = '0';
        box.style.transform = 'translateY(15px)';
        
        setTimeout(() => {
            const cBase = tool.color.split('-')[0];
            canvas.className = "text-left flex flex-col";
            canvas.innerHTML = `
                <div class="flex items-center space-x-5 mb-8 pb-8 border-b border-slate-100">
                    <div class="w-16 h-16 bg-${cBase}-50 text-${tool.color} rounded-[18px] flex items-center justify-center text-3xl shadow-sm border border-${cBase}-100/50 flex-shrink-0">
                        <i class="fa-solid ${tool.icon}"></i>
                    </div>
                    <div>
                        <h2 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-1.5">${tool.name}</h2>
                        <p class="text-sm md:text-base text-slate-500">${tool.desc}</p>
                    </div>
                </div>
                
                <div class="space-y-6 flex-grow">
                    ${tool.render(tool)}
                </div>
                
                <div class="mt-10 pt-8 border-t border-slate-100 flex justify-end">
                    <button id="execute-btn" onclick="PDFEngine.execute('${id}')" class="w-full sm:w-auto px-8 py-4 bg-${tool.color} hover:bg-${tool.color.replace('500', '600').replace('600', '700')} text-white text-sm font-bold rounded-xl shadow-lg shadow-${cBase}-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-3">
                        <span>Execute ${tool.name}</span>
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            `;
            
            const dropZone = document.getElementById('drop-zone');
            if(dropZone) {
                ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                    dropZone.addEventListener(eventName, preventDefaults, false);
                });
                function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
                ['dragenter', 'dragover'].forEach(eventName => {
                    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
                });
                ['dragleave', 'drop'].forEach(eventName => {
                    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
                });
                dropZone.addEventListener('drop', (e) => {
                    const dt = e.dataTransfer;
                    const isMultiple = id === 'merge' || id === 'imgToPdf';
                    AppUI.handleFileSelect({target: {files: dt.files}}, isMultiple, tool.color);
                }, false);
            }

            window.requestAnimationFrame(() => {
                box.style.opacity = '1'; 
                box.style.transform = 'translateY(0)';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }, 100);
    }, 300);
}

// --- PWA Installation & Service Worker Integration ---

let deferredPrompt;
const installBtn = document.getElementById('pwa-install-btn');
const installModal = document.getElementById('pwa-install-modal');
const cancelBtn = document.getElementById('pwa-cancel-btn');
const confirmBtn = document.getElementById('pwa-confirm-btn');

// Register the PWA Service Worker gracefully
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker actively running.'))
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}

// Intercept browser install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // Prevent standard browser mini-info bar
    deferredPrompt = e; // Store event for later custom triggering
    if(installBtn) installBtn.classList.remove('hidden'); // Reveal premium button
});

// UI Event Handlers for Install Flow
if(installBtn) {
    installBtn.addEventListener('click', () => {
        if(installModal) {
            installModal.classList.remove('hidden');
            installModal.classList.add('flex');
            setTimeout(() => installModal.classList.remove('opacity-0'), 10);
        }
    });
}

if(cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        if(installModal) {
            installModal.classList.add('opacity-0');
            setTimeout(() => {
                installModal.classList.add('hidden');
                installModal.classList.remove('flex');
            }, 300);
        }
    });
}

if(confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
        if(installModal) {
            installModal.classList.add('opacity-0');
            setTimeout(() => {
                installModal.classList.add('hidden');
                installModal.classList.remove('flex');
            }, 300);
        }
        
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Install prompt outcome: ${outcome}`);
            deferredPrompt = null;
            installBtn.classList.add('hidden');
        }
    });
}

// Clean up after successful installation
window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if(installBtn) installBtn.classList.add('hidden');
    console.log('PDFExpert PWA cleanly installed');
});
