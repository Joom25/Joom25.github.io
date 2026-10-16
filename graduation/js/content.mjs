// Nội dung thiệp mời. Dũng chỉ cần sửa file này; link đã gửi vẫn giữ nguyên.
// Để trống ('') hoặc [] thì trang tự hiện chữ "cập nhật sau" hoặc ẩn mục đó.
// Trong lời chào, {giờ} sẽ được thay bằng giờ đón của nhóm.

export default {
  name: 'Huỳnh Anh Dũng',
  role: 'Cử nhân AI · FPT · CEO @ AICF',
  date: 'Chủ nhật, 08.11.2026',

  // Giờ làm lễ, dùng khi link không có nhóm. Ví dụ: '08:00'
  ceremonyTime: '',

  // Địa điểm. Ví dụ: 'Đại học FPT, Khu CNC Hòa Lạc, Hà Nội'
  venue: '',
  // Link Google Maps. Để trống thì tự tìm theo địa điểm ở trên.
  mapUrl: '',

  heroPhoto: 'assets/hero.svg',
  heroAlt: 'Ảnh Huỳnh Anh Dũng trong lễ phục tốt nghiệp',

  // Lời chào khi link không có nhóm hoặc nhóm không đúng
  neutralGreeting: 'Xin chào! Trân trọng mời bạn đến chung vui trong ngày Dũng nhận bằng Cử nhân Trí tuệ Nhân tạo.',

  // skin: 'coffee' (Coffee.exe), 'boot' (Boot Sequence), 'moon' (Moonlight) hoặc 'paper' (trắng be, dịu mắt). slot: giờ đón, ví dụ '07:30'
  // Không bắt buộc: heroPhoto (ảnh riêng, để '' thì dùng ảnh chính), heroAlt (mô tả ảnh riêng), title (chữ trên thanh tiêu đề),
  // submitLabel (chữ trên nút gửi RSVP). Bỏ trống thì dùng mặc định.
  groups: {
    family: {
      greeting: 'Kính mời ông bà, bố mẹ, cô dì chú bác và anh chị em đến chung vui trong ngày con/em nhận bằng Cử nhân Trí tuệ Nhân tạo. Hành trình này có được là nhờ cả nhà. Con/em mong được gặp mọi người lúc {giờ}.',
      slot: '',
      skin: 'paper',
    },
    friends: {
      greeting: 'Ê! Dũng tốt nghiệp rồi nè ☕ Ghé chung vui với mình lúc {giờ} nha. Thiếu bạn là thiếu một tấm ảnh đẹp đó!',
      slot: '',
      skin: 'coffee',
    },
    classmates: {
      greeting: 'Bao nhiêu deadline, bao nhiêu đêm chạy model, cuối cùng tụi mình cũng tới đích! Hẹn gặp cả lớp lúc {giờ}, để chụp chung một tấm ảnh tốt nghiệp thật xịn.',
      slot: '',
      skin: 'coffee',
    },
    coworkers: {
      greeting: 'Trân trọng kính mời anh/chị đến dự lễ tốt nghiệp Cử nhân Trí tuệ Nhân tạo của Dũng. Rất mong được gặp anh/chị lúc {giờ}.',
      slot: '',
      skin: 'boot',
    },
    // Link riêng cho em: ?g=21-06-2026_10.8039N_106.7133E (không phân biệt hoa thường).
    // Nhớ thay {tên em} bằng tên gọi của em.
    '21-06-2026_10.8039n_106.7133e': {
      greeting: '{tên em} ơi, ngày anh tốt nghiệp, người anh muốn thấy đầu tiên dưới khán đài là em. Em đến sớm một chút lúc {giờ} nhé, anh muốn có tấm ảnh đầu tiên với em.',
      slot: '',
      skin: 'moon',
      heroPhoto: 'assets/hero-us.svg',
      heroAlt: 'Ảnh Dũng và em',
      title: 'dung@aicf:~/for-you',
      submitLabel: 'Em sẽ đến 💜',
    },
  },

  // Câu chuyện: mỗi phần tử là một đoạn văn. Để [] thì ẩn mục này.
  story: [],

  // Ảnh: [{ src: 'assets/anh-1.jpg', alt: 'Mô tả ảnh' }]. Để [] thì ẩn mục này.
  photos: [],

  // URL web app Apps Script (xem SETUP.md). URL này công khai, không phải bí mật.
  appsScriptUrl: '',
};
