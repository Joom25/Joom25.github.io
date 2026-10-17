// Nội dung thiệp mời. Dũng chỉ cần sửa file này; link đã gửi vẫn giữ nguyên.
// Để trống ('') hoặc [] thì trang tự hiện chữ "cập nhật sau" hoặc ẩn mục đó.
// Trong lời chào, {time} sẽ được thay bằng giờ đón, {name} bằng tên gọi của khách (link riêng).
// Link nhóm không có tên thì {name} thành "bạn".

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

  // skin: 'coffee' (Coffee.exe), 'boot' (Boot Sequence), 'cotton' (Cotton Candy Sky) hoặc 'paper' (trắng be, dịu mắt). slot: giờ đón, ví dụ '07:30'
  // Không bắt buộc: heroPhoto (ảnh riêng, để '' thì dùng ảnh chính), heroAlt (mô tả ảnh riêng), title (chữ trên thanh tiêu đề),
  // (title không hiện trên skin 'cotton' và 'paper' vì hai skin này không có thanh tiêu đề.)
  // submitLabel (chữ trên nút gửi RSVP), yesLabel / noLabel (chữ hai lựa chọn Có / Không). Bỏ trống thì dùng mặc định.
  groups: {
    family: {
      greeting: 'Kính mời ông bà, bố mẹ, cô dì chú bác và anh chị em đến chung vui trong ngày con/em nhận bằng Cử nhân Trí tuệ Nhân tạo. Hành trình này có được là nhờ cả nhà. Con/em mong được gặp mọi người lúc {time}.',
      slot: '',
      skin: 'coffee',
    },
    test: {
      greeting: 'Kính mời ông bà, bố mẹ, cô dì chú bác và anh chị em đến chung vui trong ngày con/em nhận bằng Cử nhân Trí tuệ Nhân tạo. Hành trình này có được là nhờ cả nhà. Con/em mong được gặp mọi người lúc {time}.',
      slot: '',
      skin: 'paper',
      submitLabel: 'Gửi cho Bo',
      yesLabel: 'Có, sẽ đến nhé',
      noLabel: 'Tiếc quá, không đến được rồi, gửi bo lời chúc ở đây nha',
    },
    // Ông bà, bố mẹ, cô dì chú bác. Không bắt đầu câu bằng {name} (tên gọi viết thường, ví dụ "bác Hai").
    elders: {
      greeting: 'Thưa {name}, ngày 08.11 này con nhận bằng Cử nhân Trí tuệ Nhân tạo. Con kính mời {name} đến chung vui cùng con lúc {time}. Có được ngày hôm nay là nhờ {name} luôn thương và lo cho con.',
      slot: '',
      skin: 'paper',
      submitLabel: 'Gửi cho Bo',
      yesLabel: 'Có, sẽ đến nhé',
      noLabel: 'Tiếc quá, không đến được rồi, gửi bo lời chúc ở đây nha',
    },
    // Anh chị em: Dũng xưng "Bo" nên dùng chung cho anh chị và em.
    siblings: {
      greeting: 'Tốt nghiệp rồi nè, {name} ơi! 🎓 Ngày 08.11 Bo nhận bằng Cử nhân Trí tuệ Nhân tạo. Đến chung vui với Bo lúc {time} nha, thiếu {name} là thiếu một tấm ảnh gia đình đó.',
      slot: '',
      skin: 'paper',
      submitLabel: 'Gửi cho Bo',
      yesLabel: 'Có, sẽ đến nhé',
      noLabel: 'Tiếc quá, không đến được rồi, gửi bo lời chúc ở đây nha',
    },
    friends: {
      greeting: 'Ê! Dũng tốt nghiệp rồi nè ☕ Ghé chung vui với mình lúc {time} nha. Thiếu bạn là thiếu một tấm ảnh đẹp đó!',
      slot: '',
      skin: 'coffee',
    },
    classmates: {
      greeting: 'Bao nhiêu deadline, bao nhiêu đêm chạy model, cuối cùng tụi mình cũng tới đích! Hẹn gặp cả lớp lúc {time}, để chụp chung một tấm ảnh tốt nghiệp thật xịn.',
      slot: '',
      skin: 'coffee',
    },
    coworkers: {
      greeting: 'Trân trọng kính mời anh/chị đến dự lễ tốt nghiệp Cử nhân Trí tuệ Nhân tạo của Dũng. Rất mong được gặp anh/chị lúc {time}.',
      slot: '',
      skin: 'boot',
    },
    // Link riêng cho em: ?g=21-06-2026_10.8039N_106.7133E (không phân biệt hoa thường).
    // Nhớ thay {nickname} bằng tên gọi của em.
    '21-06-2026_10.8039n_106.7133e': {
      greeting: '{nickname} ơi, ngày anh tốt nghiệp, người anh muốn thấy đầu tiên dưới khán đài là em. Em đến sớm một chút lúc {time} nhé, anh muốn có tấm ảnh đầu tiên với em.',
      slot: '',
      skin: 'cotton',
      heroPhoto: 'assets/hero-us.svg',
      heroAlt: 'Ảnh Dũng và em',
      title: 'dung@aicf:~/for-you',
      submitLabel: 'Em sẽ đến 💜',
    },
  },

  // Link riêng từng người: ?g=<key>. Key = tên không dấu + 4 ký tự ngẫu nhiên, tối đa 20 ký tự.
  // group: nhóm của người đó (lấy lời chào, giờ đón, skin từ nhóm). name: tên gọi, thay cho {name}.
  // heroPhoto / heroAlt: ảnh của Dũng với người đó. Bỏ trống thì dùng ảnh của nhóm hoặc ảnh chính.
  // Ví dụ: 'minh-k7q2': { group: 'friends', name: 'Minh', heroPhoto: 'assets/p/minh.jpg', heroAlt: 'Dũng và Minh ở Đà Lạt, 2019' },
  people: {},

  // Câu chuyện: mỗi phần tử là một đoạn văn. Để [] thì ẩn mục này.
  story: [],

  // Ảnh: [{ src: 'assets/anh-1.jpg', alt: 'Mô tả ảnh' }]. Để [] thì ẩn mục này.
  photos: [],

  // URL web app Apps Script (xem SETUP.md). URL này công khai, không phải bí mật.
  appsScriptUrl: '',
};
