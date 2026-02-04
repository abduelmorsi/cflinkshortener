export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // --- 1. AUTHENTICATION CHECK ---
    // We check auth for everything EXCEPT the actual redirect logic
    // (We don't want users to need a password just to visit a link!)
    const isPublicLink = path !== "/admin" && !path.startsWith("/api");
    
    if (!isPublicLink) {
      if (!await checkAuth(request, env)) {
        return new Response("Access Denied", {
          status: 401,
          headers: { "WWW-Authenticate": 'Basic realm="Admin Area"' }
        });
      }
    }

    // --- 2. PUBLIC REDIRECTS ---
    if (isPublicLink) {
      const slug = path.slice(1); 
      if (!slug) return Response.redirect("https://google.com", 302); // Fallback

      const destination = await env.SHORTLINKS.get(slug);
      if (destination) {
        return Response.redirect(destination, 301);
      }
      return new Response("404 - Link not found", { status: 404 });
    }

    // --- 3. ADMIN GUI ---
    if (path === "/admin") {
      return new Response(htmlDashboard(url.hostname), {
        headers: { "Content-Type": "text/html" }
      });
    }

    // --- 4. API ENDPOINTS ---
    
    // Add Link
    if (path === "/api/add" && request.method === "POST") {
      const formData = await request.formData();
      const slug = formData.get("slug");
      const url = formData.get("url");

      if (slug && url) {
        await env.SHORTLINKS.put(slug, url);
        return new Response("Success", { status: 200 });
      }
      return new Response("Missing data", { status: 400 });
    }

    // Delete Link
    if (path === "/api/delete" && request.method === "POST") {
      const formData = await request.formData();
      const slug = formData.get("slug");
      
      if (slug) {
        await env.SHORTLINKS.delete(slug);
        return new Response("Deleted", { status: 200 });
      }
    }

    // List All Links (New!)
    if (path === "/api/list") {
      // KV list() returns up to 1000 keys at a time.
      // For personal use, this is usually plenty.
      const list = await env.SHORTLINKS.list();
      
      // We need to fetch the VALUES (URLs) for these keys to show them
      // Note: Doing this in a loop is okay for small lists (<50), 
      // but for huge lists, it's better to just show keys.
      const links = [];
      for (const key of list.keys) {
        const val = await env.SHORTLINKS.get(key.name);
        links.push({ slug: key.name, url: val });
      }
      
      return new Response(JSON.stringify(links), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Bad Request", { status: 400 });
  }
};

// --- HELPER FUNCTIONS ---

async function checkAuth(request, env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return false;

  const base64 = authHeader.split(" ")[1];
  if (!base64) return false;

  const decoded = atob(base64);
  const [user, pass] = decoded.split(":");

  return pass === env.ADMIN_PASSWORD;
}

function htmlDashboard(hostname) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Link Shortener Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; background: #f0f2f5; color: #333; }
      .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 2rem; }
      h2 { margin-top: 0; font-size: 1.5rem; color: #1a1a1a; }
      
      /* Form Styles */
      .form-group { display: flex; gap: 10px; flex-wrap: wrap; }
      input { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; }
      button.primary { background: #0070f3; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: 600; }
      button.primary:hover { background: #005bb5; }

      /* Table Styles */
      table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
      th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
      th { color: #666; font-weight: 600; font-size: 0.9rem; }
      td { vertical-align: middle; }
      
      .slug-cell { font-weight: bold; color: #0070f3; }
      .url-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #666; font-size: 0.9rem; }
      
      /* Action Buttons */
      .btn-copy { background: #eef2ff; color: #4f46e5; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; margin-right: 5px; }
      .btn-delete { background: #fee2e2; color: #ef4444; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; }
      .btn-delete:hover { background: #fecaca; }
    </style>
  </head>
  <body>
    <div class="card">
      <h2>Create New Link</h2>
      <form id="addForm" class="form-group">
        <input type="text" name="slug" required placeholder="Slug (e.g. 'yt')" autocomplete="off">
        <input type="url" name="url" required placeholder="Destination URL">
        <button type="submit" class="primary">Shorten</button>
      </form>
    </div>

    <div class="card">
      <h2>Your Links</h2>
      <div id="loading" style="color: #666;">Loading links...</div>
      <table id="linkTable" style="display:none;">
        <thead>
          <tr>
            <th>Short Link</th>
            <th>Destination</th>
            <th style="text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>

    <script>
      const HOST = "${hostname}";
      
      // Load links on startup
      loadLinks();

      async function loadLinks() {
        const res = await fetch('/api/list');
        const links = await res.json();
        
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        
        links.forEach(link => {
          const shortUrl = window.location.protocol + "//" + HOST + "/" + link.slug;
          
          const row = document.createElement('tr');
          row.innerHTML = \`
            <td class="slug-cell">/\${link.slug}</td>
            <td class="url-cell"><a href="\${link.url}" target="_blank" style="color: inherit; text-decoration: none;">\${link.url}</a></td>
            <td style="text-align: right;">
              <button class="btn-copy" onclick="copyLink('\${shortUrl}')">Copy</button>
              <button class="btn-delete" onclick="deleteLink('\${link.slug}')">Delete</button>
            </td>
          \`;
          tbody.appendChild(row);
        });

        document.getElementById('loading').style.display = 'none';
        document.getElementById('linkTable').style.display = 'table';
      }

      // Add Link
      document.getElementById('addForm').onsubmit = async (e) => {
        e.preventDefault();
        const form = new FormData(e.target);
        
        const res = await fetch('/api/add', { method: 'POST', body: form });
        if (res.ok) {
          e.target.reset();
          loadLinks(); // Refresh table
        } else {
          alert("Error creating link.");
        }
      };

      // Delete Link
      async function deleteLink(slug) {
        if(!confirm('Delete /' + slug + '?')) return;
        
        const form = new FormData();
        form.append('slug', slug);
        
        const res = await fetch('/api/delete', { method: 'POST', body: form });
        if (res.ok) {
          loadLinks();
        }
      }

      // Copy to Clipboard
      function copyLink(text) {
        navigator.clipboard.writeText(text).then(() => {
          alert("Copied to clipboard!");
        });
      }
    </script>
  </body>
  </html>
  `;
}