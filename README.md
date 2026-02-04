# 🔗 Serverless Link Shortener (Cloudflare Workers)

A free, private, and self-hosted URL shortener that runs entirely on [Cloudflare Workers](https://workers.cloudflare.com/). 

No servers to maintain. No database costs. 100% control over your data.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Cloudflare-orange.svg)

## ✨ Features

- **🚀 Blazing Fast:** Runs on Cloudflare's edge network (global low latency).
- **💸 Free to Host:** Runs within the generous Cloudflare Workers free tier (100k requests/day).
- **🔒 Secure Admin Panel:** Built-in GUI to manage links, protected by a password.
- **📊 Link Management:** Create, delete, and list all your active short links.
- **🔌 API Support:** Programmatically add/remove links via simple REST endpoints.
- **📋 Copy to Clipboard:** One-click copying for new short links.

## 🛠️ Setup Guide

### Option 1: The "No-Code" Way (Browser Only)
Use this method if you don't want to install anything on your computer.

1.  **Create KV Namespace (Database):**
    - Go to Cloudflare Dashboard > **Workers & Pages** > **KV** (sidebar).
    - Click **Create a Namespace**.
    - Name it `SHORTLINKS` and click **Add**.

2.  **Create the Worker:**
    - Go to **Workers & Pages** > **Create Application** > **Create Worker**.
    - Name it `link-shortener` and deploy.
    - Click **Edit Code**, delete existing code, and paste the contents of `src/worker.js`.
    - Click **Deploy** (top right) to save the code.

3.  **Connect Database:**
    - Go back to your Worker's overview page.
    - Click the **Bindings** tab (top menu).
    - Click **Add binding** (or "Add") > select **KV namespace**.
    - **Variable name:** `SHORTLINKS` (Must be uppercase).
    - **KV namespace:** Select the `SHORTLINKS` namespace you created in step 1.
    - Click **Add Binding** and then **Deploy** if prompted.

4.  **Set Password:**
    - Click the **Settings** tab (top menu).
    - Go to **Variables** (sometimes labeled "Environment Variables").
    - Click **Add Variable**.
    - **Variable name:** `ADMIN_PASSWORD`
    - **Value:** Your secret password (e.g., `MySecretPass123`).
    - Click **Encrypt** (Recommended) and **Save/Deploy**.

5.  **Add Domain:**
    - Still in **Settings**, go to the **Triggers** tab (or "Domains & Routes").
    - Click **Add Custom Domain**.
    - Enter your subdomain (e.g., `link.yourdomain.com`) and save.

---

### Option 2: The CLI Way (For Developers)
If you have `npm` and `wrangler` installed.

1.  **Clone the repo:**
    ```bash
    git clone [https://github.com/yourusername/link-shortener.git](https://github.com/yourusername/link-shortener.git)
    cd link-shortener
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Create the KV Namespace:**
    ```bash
    npx wrangler kv:namespace create SHORTLINKS
    ```
    *Copy the `id` outputted by this command.*

4.  **Update `wrangler.toml`:**
    Uncomment the `[[kv_namespaces]]` section and paste your ID.

5.  **Set Password:**
    ```bash
    npx wrangler secret put ADMIN_PASSWORD
    ```

6.  **Deploy:**
    ```bash
    npx wrangler deploy
    ```

## 🖥️ Usage

### Admin Dashboard
Navigate to `https://link.yourdomain.com/admin` and log in with your password.
- **Slug:** The short path (e.g., `yt` becomes `domain.com/yt`).
- **URL:** The destination.

### API Reference
You can manage links programmatically using headers for authentication.

**Authorization:** `Authorization: Basic <base64(user:password)>`

#### 1. Add Link
`POST /api/add`
- Form Data: `slug`, `url`

#### 2. Delete Link
`POST /api/delete`
- Form Data: `slug`

#### 3. List Links
`GET /api/list`
- Returns a JSON array of all links.

## 🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

[MIT](LICENSE)
