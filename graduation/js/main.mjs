import content from './content.mjs';
import guests from './people.mjs';
import { withGuests, resolveGroup, buildRsvp, validateRsvp, venueInfo, visibleSections, sendRsvp } from './logic.mjs';

const $ = (id) => document.getElementById(id);

const group = resolveGroup(location.search, withGuests(content, guests));
document.documentElement.dataset.skin = group.skin;
$('title-text').textContent = group.title;
$('rsvp-submit').textContent = group.submitLabel;
$('yes-label').textContent = group.yesLabel;
$('no-label').textContent = group.noLabel;

// 1. Hero
if (group.heroPhoto) {
  $('hero-photo').src = group.heroPhoto;
  $('hero-photo').alt = group.heroAlt;
} else {
  $('hero-photo').hidden = true;
}
$('greeting').textContent = group.greeting;
$('name').textContent = content.name;
$('role').textContent = content.role;

// 2. Event info
const venue = venueInfo(content.venue, content.mapUrl);
const show = visibleSections(content);
$('date').textContent = content.date;
$('thanks-date').textContent = content.date;
document.title = `Thư mời tốt nghiệp · ${content.name} · ${content.date}`;
$('time').textContent = group.time;
$('venue').textContent = venue.text;
if (venue.href) {
  $('map-link').href = venue.href;
  $('map-link').hidden = false;
}

// 3. Story
if (show.story) {
  for (const text of content.story) {
    const p = document.createElement('p');
    p.textContent = text;
    $('story-body').append(p);
  }
  $('story').hidden = false;
}

// 4. Photos, tap to view larger, tap again to close
if (show.photos) {
  for (const { src, alt } of content.photos) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'photo';
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.loading = 'lazy';
    btn.append(img);
    btn.addEventListener('click', () => {
      $('lightbox-img').src = src;
      $('lightbox-img').alt = alt || '';
      $('lightbox').showModal();
    });
    $('photo-grid').append(btn);
  }
  $('photos').hidden = false;
}
$('lightbox').addEventListener('click', () => $('lightbox').close());

// 5. RSVP
const form = $('rsvp-form');
const submit = $('rsvp-submit');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = buildRsvp(group.group, {
    name: $('rsvp-name').value,
    attending: form.elements.attending.value,
    message: $('rsvp-message').value,
  });

  const errors = validateRsvp(data);
  $('err-name').textContent = errors.name || '';
  $('err-attending').textContent = errors.attending || '';
  $('form-error').textContent = '';
  if (errors.name) return $('rsvp-name').focus();
  if (errors.attending) return form.elements.attending[0].focus();

  submit.disabled = true;
  submit.textContent = 'Đang gửi…';
  try {
    await sendRsvp(content.appsScriptUrl, data);
    form.hidden = true;
    $('thanks').hidden = false;
    $('thanks').focus();
  } catch (err) {
    console.error(err);
    $('form-error').textContent = 'Gửi chưa được, bạn thử lại giúp Dũng nhé.';
    submit.disabled = false;
    submit.textContent = group.submitLabel;
  }
});
