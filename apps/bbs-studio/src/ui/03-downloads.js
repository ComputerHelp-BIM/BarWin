  /* ---------- downloads ---------- */
  var ALLOWED = /\.(png|jpg|jpeg|webp|gif|txt|json|md|csv|html|svg|pdf|xlsx|zip|docx|pptx)$/i, capPromise = null;
  function downloadsCap() { if (!capPromise) capPromise = (window.claude && window.claude.use) ? window.claude.use('downloads').catch(function () { return null; }) : Promise.resolve(null); return capPromise; }
  /** Saves a file. Inside the Claude viewer only some extensions are allowed, so others are wrapped in a zip. */
  function saveFile(name, data, mime) {
    return downloadsCap().then(function (cap) {
      if (!cap) {
        var blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' }), a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000); toast('Saved ' + name); return;
      }
      var ready = Promise.resolve({ name: name, data: data });
      if (!ALLOWED.test(name)) {
        if (!window.JSZip) { toast('Cannot save ' + name + ': the zip library did not load.'); return; }
        var z = new window.JSZip(); z.file(name, data); ready = z.generateAsync({ type: 'blob' }).then(function (b) { return { name: name + '.zip', data: b }; });
      }
      return ready.then(function (f) { return cap.save({ filename: f.name, data: f.data }).then(function () { toast('Saved ' + f.name); }); })
        .catch(function (e) { var c = e && e.code; toast(c === 'declined' ? 'Save cancelled.' : c === 'rate_limited' ? 'Another save prompt is open. Finish it, then try again.' : 'This view cannot save ' + name + (c ? ' (' + c + ').' : '.')); });
    });
  }

