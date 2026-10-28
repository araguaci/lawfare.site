(function () {
  if (window.__lawfareShare) return;
  window.__lawfareShare = true;

  function wrapText(text, maxChars) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return [];
    const lines = [];
    let line = '';
    for (const word of clean.split(' ')) {
      const piece = word.length > maxChars ? word.slice(0, maxChars - 1) + '…' : word;
      const next = line ? line + ' ' + piece : piece;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = piece;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function colorOf(value) {
    return /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#10b981';
  }

  async function draw(canvas, data) {
    try {
      await document.fonts.load('700 46px "Plus Jakarta Sans"');
      await document.fonts.load('500 22px "Plus Jakarta Sans"');
      await document.fonts.load('500 18px "JetBrains Mono"');
    } catch (err) {
      /* fontes do sistema cobrem o cartão se a webfont falhar */
    }
    await document.fonts.ready;

    const ctx = canvas.getContext('2d');
    const titleLinesAll = wrapText(data.title, 36);
    const titleLines = titleLinesAll.slice(0, 4);
    if (titleLinesAll.length > 4 && titleLines[3]) {
      titleLines[3] = titleLines[3].slice(0, 33).trimEnd() + '…';
    }
    const excerptLines = wrapText(data.excerpt === 'N/A' || data.excerpt === '>' ? '' : data.excerpt, 72).slice(0, 2);
    const titleSize = titleLines.length > 3 ? 40 : 46;
    const titleDy = titleSize + 12;
    const color = colorOf(data.categoryColor);
    const category = data.category || 'Arquivo';

    ctx.clearRect(0, 0, 1200, 630);
    ctx.fillStyle = '#080c14';
    ctx.fillRect(0, 0, 1200, 630);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(0, 0, 1200, 8);
    ctx.fillRect(0, 0, 8, 630);

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#10b981';
    ctx.font = '500 18px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('LAWFARE TIMELINE', 72, 92);
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText(data.kicker || '', 1128, 92);

    ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    const pillWidth = Math.min(520, Math.max(96, ctx.measureText(category).width + 36));
    ctx.fillStyle = '#121a2b';
    roundRect(ctx, 72, 118, pillWidth, 36, 18);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.fillText(category, 90, 142);

    if (data.idLabel) {
      ctx.fillStyle = '#64748b';
      ctx.font = '500 16px "JetBrains Mono", ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(data.idLabel, 1128, 142);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '700 ' + titleSize + 'px "Plus Jakarta Sans", sans-serif';
    titleLines.forEach((line, index) => {
      ctx.fillText(line, 72, 206 + index * titleDy);
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
    const excerptStart = 206 + titleLines.length * titleDy + 18;
    excerptLines.forEach((line, index) => {
      ctx.fillText(line, 72, excerptStart + index * 32);
    });

    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(72, 548);
    ctx.lineTo(1128, 548);
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 18px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('lawfare.site', 72, 588);
    ctx.fillStyle = '#64748b';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('arquivo público · confira a fonte na ficha', 1128, 588);
  }

  function blobFromCanvas(canvas) {
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  async function imageBlob(panel, canvas) {
    if (panel.dataset.imageReady === 'remote') {
      const response = await fetch(panel.dataset.og);
      if (response.ok) return response.blob();
    }
    return blobFromCanvas(canvas);
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function copyWithCommand(value) {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (err) {
      ok = false;
    }
    area.remove();
    return ok;
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      try {
        const copied = await Promise.race([
          navigator.clipboard.writeText(value).then(() => true),
          new Promise((resolve) => setTimeout(() => resolve(false), 700)),
        ]);
        if (copied) return true;
      } catch (err) {
        /* tenta o comando clássico abaixo */
      }
    }
    return copyWithCommand(value);
  }

  function setStatus(panel, message) {
    const status = panel.querySelector('[data-share-status]');
    if (status) status.textContent = message;
  }

  async function shareImage(panel, canvas) {
    const blob = await imageBlob(panel, canvas);
    if (!blob) {
      setStatus(panel, 'Não foi possível gerar a imagem.');
      return;
    }
    const file = new File([blob], panel.dataset.filename || 'lawfare.png', { type: 'image/png' });
    const payload = {
      files: [file],
      title: panel.dataset.title || 'Lawfare Timeline',
      text: (panel.dataset.title || '') + ' — ' + (panel.dataset.url || ''),
    };
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share(payload);
      setStatus(panel, 'Imagem enviada ao menu de compartilhamento.');
      return;
    }
    download(blob, file.name);
    setStatus(panel, 'Imagem baixada. No celular, o menu do sistema anexa o cartão.');
  }

  async function init(panel) {
    const canvas = panel.querySelector('canvas');
    const img = panel.querySelector('img');
    const data = panel.dataset;
    const remote = await new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => resolve(true);
      probe.onerror = () => resolve(false);
      probe.src = data.og;
    });

    if (remote && img) {
      img.src = data.og;
      img.hidden = false;
      canvas.hidden = true;
      panel.dataset.imageReady = 'remote';
    } else {
      if (img) img.hidden = true;
      canvas.hidden = false;
      await draw(canvas, data);
      panel.dataset.imageReady = 'canvas';
    }

    panel.querySelector('[data-share="image"]')?.addEventListener('click', () => {
      shareImage(panel, canvas).catch(() => setStatus(panel, 'O compartilhamento foi cancelado.'));
    });

    panel.querySelector('[data-share="download"]')?.addEventListener('click', async () => {
      const blob = await imageBlob(panel, canvas);
      if (!blob) return;
      download(blob, panel.dataset.filename || 'lawfare.png');
      setStatus(panel, 'PNG baixado.');
    });

    panel.querySelector('[data-share="link"]')?.addEventListener('click', async () => {
      const url = panel.dataset.url || location.href;
      setStatus(panel, 'Copiando link…');
      const copied = await copyText(url);
      if (copied) {
        setStatus(panel, 'Link copiado.');
        return;
      }
      setStatus(panel, url);
    });

    panel.querySelector('[data-share="native"]')?.addEventListener('click', async () => {
      const url = panel.dataset.url || location.href;
      const title = panel.dataset.title || document.title;
      if (navigator.share) {
        try {
          await navigator.share({ title, text: title, url });
          setStatus(panel, 'Link enviado ao menu de compartilhamento.');
        } catch (err) {
          setStatus(panel, 'Compartilhamento cancelado.');
        }
        return;
      }
      try {
        await navigator.clipboard.writeText(url);
        setStatus(panel, 'Este navegador não abre o menu. O link foi copiado.');
      } catch (err) {
        window.prompt('Copie o link:', url);
      }
    });
  }

  function boot() {
    document.querySelectorAll('[data-share-card]').forEach((panel) => {
      init(panel);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
