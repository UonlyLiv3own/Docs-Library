KHO HO SO PDF - VERCEL + GOOGLE DRIVE

CAC BUOC CAI DAT

A. TAO GOOGLE APPS SCRIPT
1. Dang nhap tai khoan Google dang quan ly thu muc Drive.
2. Mo https://script.google.com/ va tao New project.
3. Xoa noi dung Code.gs mac dinh, dan toan bo noi dung trong file Code.gs di kem.
4. Luu project.
5. Chon ham testConnection va bam Run. Cap quyen cho Apps Script truy cap Google Drive va Google Sheets.
6. Vao Deploy > New deployment.
7. Chon type: Web app.
8. Execute as: Me.
9. Who has access: Anyone.
10. Bam Deploy, cap quyen neu Google hoi, sau do copy URL Web app ket thuc bang /exec.

B. GAN URL APPS SCRIPT VAO WEBSITE
1. Mo index.html.
2. Tim dong:
   const APPS_SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
3. Thay chuoi PASTE... bang URL /exec vua copy, giu nguyen dau nhay.
4. Luu index.html.

C. DEPLOY LEN GITHUB + VERCEL
1. Tao GitHub repository moi.
2. Upload index.html vao thu muc goc cua repository.
3. Import repository do vao Vercel.
4. Framework Preset: Other.
5. Build Command: de trong.
6. Output Directory: . (hoac de mac dinh neu Vercel tu nhan static site).
7. Deploy.

CACH HOAT DONG
- Website doc PDF tu thu muc Drive co ID da cau hinh trong Code.gs.
- Cau truc duoc doc: Kho chung tu / Dau tu Xay dung hoac Boi thuong / 6 nhom DA / Ma du an - Ten du an / CV, QD, VB, PA, HD, KHAC / PDF.
- Khi Apps Script chay lan dau, no tao mot Google Sheets de luu luot xem va luot tai.
- Moi file duoc nhan dien bang Drive File ID, khong phai ten file.
- Code.gs dang bat ENSURE_PUBLIC_LINK_ACCESS = true. Khi dong bo, Apps Script se dat quyen thu muc goc thanh Anyone with the link - Viewer. Tat ca tai lieu ben trong thu muc nay co the duoc xem/tai boi nguoi co link.

LUU Y
- Chi dat trong thu muc goc nay cac tai lieu duoc phep cong khai. Khong de ho so mat/nhay cam trong thu muc.
- Apps Script va Drive phai duoc phep chia se Anyone with the link. Tai khoan Google Workspace co the bi quan tri vien chan chia se cong khai.
- Form Them Ho So trong giao dien HTML cu van la thao tac them tam tren trang hien tai; no chua upload file len Drive va chua ghi vao danh sach dong bo. Muon them file that, hay upload PDF vao dung thu muc Drive theo cau truc tren, sau do tai lai website.
- Dem luot tai la dem lan nhan nut Tai, khong xac nhan Google Drive da tai file thanh cong.
- Neu doi ma nguon Apps Script sau khi deploy, can Deploy > Manage deployments > Edit > New version.
