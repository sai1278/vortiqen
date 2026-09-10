# Cloudflare WAF & Edge Rate Limiting Rules

To protect the Vortiqen production origin from abusive volumetric traffic, configure the following rules in the **Cloudflare Dashboard → Security → WAF**:

## 1. Rate Limiting Rule: Public Contact API
- **Rule Name**: `Rate Limit Contact Enquiries`
- **Field**: `URI Path` equals `/api/contact` AND `Hostname` equals `api.vortiqen.com`
- **Method**: `POST`
- **Characteristics**: `IP Address`
- **Requests / Period**: `5 requests per 10 minutes` (600 seconds)
- **Action**: `Block` (429 Too Many Requests) or `Managed Challenge`
- **Duration**: `10 minutes`

## 2. Custom WAF Rule: Block Malicious User Agents & Scanners
- **Rule Name**: `Block Automated Exploit Scanners`
- **Expression**:
  ```text
  (http.user_agent contains "sqlmap" or http.user_agent contains "nikto" or http.user_agent contains "nmap" or http.user_agent contains "masscan")
  ```
- **Action**: `Block`

## 3. Bot Fight Mode & SSL/TLS Mode
- **SSL/TLS Mode**: **Full (Strict)**
- **Edge Certificates**: Minimum TLS Version `1.2`, Opportunistic Encryption `On`, Always Use HTTPS `On`, HSTS enabled (`max-age=31536000, includeSubDomains, preload`).
- **Bot Management**: `Bot Fight Mode: Enabled`

## 4. Origin Network Security
- Inbound traffic should only come from **Cloudflare Tunnel** or Cloudflare IP ranges.
- Public firewall should block all direct inbound connections to ports 8000 and 8080.
