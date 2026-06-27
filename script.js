const { PDFDocument, rgb, degrees } = PDFLib;

/* ---------------- TOOLS ---------------- */

const Tools = {
  resizer: {
    name: "Image Resizer",
    desc: "Resize images instantly",
    render: () => `
      <input type="file" id="f">
      <input type="number" id="img-w" placeholder="Width">
      <input type="number" id="img-h" placeholder="Height">
      <select id="img-format">
        <option value="image/jpeg">JPG</option>
        <option value="image/png">PNG</option>
        <option value="image/webp">WebP</option>
      </select>
      <button onclick="run('resizer')">Resize</button>
    `
  },

  merge: {
    name: "Merge PDF",
    desc: "Combine PDFs",
    render: () => `
      <input type="file" id="f" multiple>
      <button onclick="run('merge')">Merge</button>
    `
  },

  split: {
    name: "Split PDF",
    desc: "Split pages",
    render: () => `
      <input type="file" id="f">
      <button onclick="run('split')">Split</button>
    `
  },

  rotate: {
    name: "Rotate PDF",
    desc: "Rotate pages",
    render: () => `
      <input type="file" id="f">
      <button onclick="run('rotate')">Rotate</button>
    `
  },

  del: {
    name: "Delete Page",
    desc: "Remove page",
    render: () => `
      <input type="file" id="f">
      <input type="number" id="pg">
      <button onclick="run('del')">Delete</button>
    `
  },

  extract: {
    name: "Extract Page",
    desc: "Extract page",
    render: () => `
      <input type="file" id="f">
      <input type="number" id="pg">
      <button onclick="run('extract')">Extract</button>
    `
  },

  reorder: {
    name: "Reverse Order",
    desc: "Reverse pages",
    render: () => `
      <input type="file" id="f">
      <button onclick="run('reorder')">Reverse</button>
    `
  },

  watermark: {
    name: "Watermark",
    desc: "Add text watermark",
    render: () => `
      <input type="file" id="f">
      <input type="text" id="txt">
      <button onclick="run('watermark')">Add</button>
    `
  },

  numbers: {
    name: "Page Numbers",
    desc: "Add page numbers",
    render: () => `
      <input type="file" id="f">
      <button onclick="run('numbers')">Add</button>
    `
  },

  imgToPdf: {
    name: "Images to PDF",
    desc: "Convert images",
    render: () => `
      <input type="file" id="f" multiple>
      <button onclick="run('imgToPdf')">Convert</button>
    `
  }
};

/* ---------------- RENDER ---------------- */

const grid = document.getElementById("tools-grid");

Object.keys(Tools).forEach(k => {
  const tool = Tools[k];

  const card = document.createElement("div");
  card.className = "tool-card";

  card.innerHTML = `
    <h4>${tool.name}</h4>
    <p>${tool.desc}</p>
    <button onclick="selectTool('${k}')">Use</button>
  `;

  grid.appendChild(card);
});

function selectTool(id) {
  document.getElementById("canvas-content").innerHTML =
    Tools[id].render();
}

/* ---------------- MAIN ENGINE ---------------- */

async function run(id) {
  const input = document.getElementById("f");

  try {
    let bytes;

    if (id === "merge") {
      const doc = await PDFDocument.create();
      for (let f of input.files) {
        const src = await PDFDocument.load(await f.arrayBuffer());
        const pages = await doc.copyPages(src, src.getPageIndices());
        pages.forEach(p => doc.addPage(p));
      }
      bytes = await doc.save();
    }

    else if (id === "split") {
      const src = await PDFDocument.load(await input.files[0].arrayBuffer());

      for (let i = 0; i < src.getPageCount(); i++) {
        const d = await PDFDocument.create();
        const [p] = await d.copyPages(src, [i]);
        d.addPage(p);
        const b = await d.save();
        download(b, `page_${i + 1}.pdf`);
      }
      toast("Split Done");
      return;
    }

    else if (id === "rotate") {
      const doc = await PDFDocument.load(await input.files[0].arrayBuffer());
      doc.getPages().forEach(p => p.setRotation(degrees(90)));
      bytes = await doc.save();
    }

    else if (id === "del") {
      const doc = await PDFDocument.load(await input.files[0].arrayBuffer());
      const pg = parseInt(document.getElementById("pg").value) - 1;
      doc.removePage(pg);
      bytes = await doc.save();
    }

    else if (id === "extract") {
      const doc = await PDFDocument.load(await input.files[0].arrayBuffer());
      const pg = parseInt(document.getElementById("pg").value) - 1;

      const newDoc = await PDFDocument.create();
      const [p] = await newDoc.copyPages(doc, [pg]);
      newDoc.addPage(p);
      bytes = await newDoc.save();
    }

    else if (id === "reorder") {
      const doc = await PDFDocument.load(await input.files[0].arrayBuffer());
      const newDoc = await PDFDocument.create();

      for (let i = doc.getPageCount() - 1; i >= 0; i--) {
        const [p] = await newDoc.copyPages(doc, [i]);
        newDoc.addPage(p);
      }

      bytes = await newDoc.save();
    }

    else if (id === "watermark") {
      const doc = await PDFDocument.load(await input.files[0].arrayBuffer());
      const text = document.getElementById("txt").value || "CONFIDENTIAL";

      doc.getPages().forEach(p => {
        p.drawText(text, { x: 100, y: 300, size: 30 });
      });

      bytes = await doc.save();
    }

    else if (id === "numbers") {
      const doc = await PDFDocument.load(await input.files[0].arrayBuffer());

      doc.getPages().forEach((p, i) => {
        p.drawText(`Page ${i + 1}`);
      });

      bytes = await doc.save();
    }

    else if (id === "imgToPdf") {
      const doc = await PDFDocument.create();

      for (let f of input.files) {
        const imgBytes = await f.arrayBuffer();
        let img;

        if (f.type.includes("png")) {
          img = await doc.embedPng(imgBytes);
        } else {
          img = await doc.embedJpg(imgBytes);
        }

        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height
        });
      }

      bytes = await doc.save();
    }

    const blob = new Blob([bytes], { type: "application/pdf" });
    download(blob, "output.pdf");
    toast("Done");

  } catch (e) {
    toast(e.message, true);
  }
}

/* ---------------- HELPERS ---------------- */

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}

function toast(msg, err) {
  alert(msg);
}
