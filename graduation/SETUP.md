# Thiệp mời tốt nghiệp — Hướng dẫn cài đặt / Setup guide

Trang: `https://joom25.github.io/graduation/`

## 1. Tạo Google Sheet nhận RSVP / Create the RSVP Sheet

**VI**
1. Vào <https://sheets.new>, đặt tên ví dụ "RSVP tốt nghiệp".
2. Menu **Tiện ích mở rộng → Apps Script** (Extensions → Apps Script).
3. Xóa code mẫu, dán toàn bộ nội dung file `apps-script/Code.gs`, bấm **Lưu**.
4. Bấm **Triển khai → Tùy chọn triển khai mới** (Deploy → New deployment), chọn loại **Ứng dụng web** (Web app).
   - Thực thi dưới dạng (Execute as): **Tôi** (Me)
   - Người có quyền truy cập (Who has access): **Bất kỳ ai** (Anyone)
5. Bấm **Triển khai**, cấp quyền khi Google hỏi, rồi sao chép **URL ứng dụng web** (kết thúc bằng `/exec`).
6. Mở `js/content.mjs`, dán URL vào `appsScriptUrl: '...'`.

Hàng đầu tiên trong Sheet sẽ tự có tiêu đề: Thời gian, Nhóm, Tên, Tham dự, Lời nhắn.
Nếu sau này sửa `Code.gs`, hãy dùng **Quản lý triển khai → Chỉnh sửa → Phiên bản mới** để giữ nguyên URL.

**EN**
1. Create a new Sheet at <https://sheets.new>.
2. Open **Extensions → Apps Script**.
3. Replace the sample code with `apps-script/Code.gs` and save.
4. **Deploy → New deployment**, type **Web app**, Execute as **Me**, Who has access **Anyone**.
5. Deploy, authorize, and copy the web app URL (ends in `/exec`).
6. Paste it into `appsScriptUrl` in `js/content.mjs`.

The header row (Thời gian, Nhóm, Tên, Tham dự, Lời nhắn) is written on the first RSVP. When you change `Code.gs` later, use **Manage deployments → Edit → New version** so the URL stays the same. The URL is public by design; it is not a secret.

## 2. Sửa nội dung / Edit content

**VI** — Chỉ sửa `js/content.mjs`: giờ làm lễ, giờ đón từng nhóm (`slot`), địa điểm, link bản đồ, lời chào, câu chuyện, ảnh. Ảnh đặt trong thư mục `assets/` (thay `assets/hero.svg` bằng ảnh chính, rồi đổi `heroPhoto`). Để trống thì trang tự hiện "cập nhật sau" hoặc ẩn mục đó. Link đã gửi không cần đổi. Sau khi đẩy lên GitHub, có thể mất vài phút trang mới cập nhật.

**EN** — Edit only `js/content.mjs`: ceremony time, each group's `slot`, venue, map URL, greetings, story, photos. Put images in `assets/` (replace the placeholder `assets/hero.svg` and update `heroPhoto`). Empty values show "update coming" text or hide the section. Links already sent keep working. GitHub Pages may take a few minutes to show changes.

## 3. Gửi thử một RSVP thật / Send one real test RSVP

**VI** — TRƯỚC KHI gửi bất kỳ link nào: mở trang thật (`https://joom25.github.io/graduation/?g=family`), điền tên, chọn có/không, bấm **Gửi ☕**. Phải thấy lời cảm ơn, và trong Sheet phải có một hàng mới. Nếu thấy "Gửi chưa được…", kiểm tra lại `appsScriptUrl` trong `js/content.mjs` (nếu để trống thì RSVP của mọi khách đều lỗi) và quyền truy cập "Bất kỳ ai". Xong thì xóa hàng thử trong Sheet.

**EN** — BEFORE sending any group link: open the live page (`https://joom25.github.io/graduation/?g=family`), fill in a name, pick yes/no and tap **Gửi ☕**. You must see the thank-you message and a new row in the Sheet. If you see "Gửi chưa được…", check `appsScriptUrl` in `js/content.mjs` (left empty, every guest's RSVP fails) and that access is "Anyone". Delete the test row afterwards.

## 4. Link cho từng nhóm / Group links

| Nhóm / Group | Link |
|---|---|
| Gia đình / Family | `https://joom25.github.io/graduation/?g=family` |
| Bạn bè / Friends | `https://joom25.github.io/graduation/?g=friends` |
| Bạn cùng lớp / Classmates | `https://joom25.github.io/graduation/?g=classmates` |
| Đồng nghiệp / Coworkers | `https://joom25.github.io/graduation/?g=coworkers` |
| Người yêu / Girlfriend (Cotton Candy Sky) | `https://joom25.github.io/graduation/?g=21-06-2026_10.8039N_106.7133E` |

Link của em không phân biệt chữ hoa/thường (`N`/`n`, `E`/`e` đều được). Trước khi gửi: trong `js/content.mjs` thay `{tên em}`, điền giờ đón `slot` của em, và thay ảnh `assets/hero-us.svg`. Nếu dùng ảnh thật `.jpg` (ví dụ `assets/hai-dua.jpg`) thì đổi `heroPhoto` trong nhóm của em sang đúng đường dẫn đó.
Her key is case-insensitive. Before sending: in `js/content.mjs` replace `{tên em}`, set her `slot`, and replace the placeholder `assets/hero-us.svg`. If you use a real `.jpg` photo (e.g. `assets/hai-dua.jpg`), change her group's `heroPhoto` to that path.

Link không có `?g=` hoặc sai nhóm vẫn mở được, với lời chào chung và giờ làm lễ.
A link without `?g=` or with an unknown group still works, with a neutral greeting and the ceremony time.

## 5. Kiểm tra / Test

```sh
node --test          # chạy trong thư mục graduation / run inside graduation/
python -m http.server 8000   # rồi mở / then open http://localhost:8000/?g=family
```
