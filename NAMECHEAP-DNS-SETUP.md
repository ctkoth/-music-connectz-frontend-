# 🌐 Namecheap DNS Setup for Cloudflare Pages

## Step 1: Get Cloudflare Nameservers

After adding your domain in Cloudflare, you'll see 2 nameservers like:
```
alice.ns.cloudflare.com
bob.ns.cloudflare.com
```
(Your actual names will be different)

## Step 2: Update Namecheap Nameservers

1. Log in to Namecheap: https://ap.www.namecheap.com/
2. Go to **Domain List** → click **Manage** next to musicconnectz.com
3. Scroll to **NAMESERVERS** section
4. Select **Custom DNS**
5. Enter the 2 Cloudflare nameservers:
   - Nameserver 1: `alice.ns.cloudflare.com` (use your actual one)
   - Nameserver 2: `bob.ns.cloudflare.com` (use your actual one)
6. Click ✓ to save
7. Wait 5-30 minutes for DNS propagation

## Step 3: Verify in Cloudflare

1. Go back to Cloudflare dashboard
2. Click **Done, check nameservers**
3. Wait for "Active" status (can take up to 24 hours, usually 10-30 min)

## Step 4: Connect Domain to Pages

Once Cloudflare shows "Active":
1. Go to your Pages project
2. **Custom domains** → **Set up a custom domain**
3. Enter `musicconnectz.com`
4. Cloudflare auto-creates DNS records
5. SSL certificate provisions in 5-10 minutes

## ✅ Done!

Your site will be live at https://musicconnectz.com

## 🔧 Troubleshooting

- **DNS not updating?** Check Namecheap for typos in nameservers
- **Still showing old site?** Clear browser cache or wait 30 min
- **SSL error?** Wait 10 minutes for certificate to activate
