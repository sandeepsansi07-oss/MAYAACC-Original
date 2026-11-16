# MAYAACC Desktop — PC Software (Windows)

Teri MAYAACC website ab PC software ban gayi hai. Browser ki zaroorat nahi, data PC me hi save hoga.

## Data kahan save hota hai?

**Documents \ MAYAACC-Data** — is folder me:
- `mayaacc-data.json` — tumhara saara data (companies, vouchers, ledgers, stock). Har change ke 1-2 second me auto-save hota hai.
- `profile\` — app ki apni storage
- `backups\` — default backup folder

**Backup kaise le?**
1. `Documents \ MAYAACC-Data` folder ko copy karo
2. Pen drive ya Google Drive / OneDrive folder me paste karo — bas, backup ho gaya.

**Restore kaise kare?**
- Us folder ko wapas `Documents` me paste karo aur MAYAACC kholo. Data wapas aa jayega.
- App ke andar bhi hai: **Data → Backup & Restore** aur **Data → Schedule Backup → Backup folder** — wahan pen drive / Google Drive ka folder chun lo, to backup us folder me khud save hota rahega.

## PC par chalane ke 2 tareeke

### Tareeka 1 — Ready EXE (sabse easy, recommended)
1. `dist` folder me jo `MAYAACC-Setup-1.0.0.exe` hai, use apne PC par copy karo.
2. Double-click karo — install nahi karna padta, direct chalega. Desktop par shortcut bana lena.
3. Pehli baar khulte hi data folder `Documents\MAYAACC-Data` ban jayega.

### Tareeka 2 — Source se chalana / khud build karna
PC par Node.js install karo (https://nodejs.org — LTS version), phir is folder me:
```
npm install
npm start
```
Windows installer banane ke liye:
```
npm run build:win
```
Isse `dist\MAYAACC-Setup-1.0.0.exe` ban jayega.

## Kya-kya badla hai web version se?

- Sirf `window.mayaDesktop` wala backup-folder feature add hua hai — ye wahi feature hai jo tumhari HTML file pehle se expect kar rahi thi (`mayaacc-bkfolder` script).
- Ek chhota desktop-sync script add hua hai jo saara `mayaacc_*` data ko `mayaacc-data.json` me auto-save karta hai.
- Tumhara original accounting code, design, vouchers, reports — kuch nahi badla.

## Zaroori baat

- Internet ki zaroorat nahi, offline chalega. Sirf HSN code list aur PDF wale kuch features pehli baar internet mangte hain, baaki sab offline.
- Ye software sirf tumhare PC par data rakhta hai, kisi server par kuch nahi bhejta.
- Backup file me company PIN aur saara business data hota hai — pen drive / Google Drive par safe jagah rakho, kisi ko share mat karo.
