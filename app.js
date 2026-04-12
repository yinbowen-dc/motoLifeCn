/* ═══════════════════════════════════════════════════════════
   Moto Life China — App Logic
   ═══════════════════════════════════════════════════════════ */

'use strict';

import { CITIES } from './const.js';

// ── State ──────────────────────────────────────────────────
let map = null;
let marker = null;
let isPlaying = false;
let currentCityIndex = 0;   // 当前选中城市
let currentSpotIndex = 0;   // 当前展示的地点索引

// ── DOM Refs ───────────────────────────────────────────────
const citySelector  = document.getElementById('citySelector');
const stationName   = document.getElementById('stationName');
const radioPlayBtn  = document.getElementById('radioPlayBtn');
const playIcon      = document.getElementById('playIcon');
const volumeSlider  = document.getElementById('volumeSlider');
const radioAudio    = document.getElementById('radioAudio');
const cityLabel     = document.getElementById('city-label');
const cityIframe    = document.getElementById('cityIframe');
const randomBtn     = document.getElementById('randomBtn');
const routeCity     = document.getElementById('routeCity');
const routeTitle    = document.getElementById('routeTitle');
const routeDistance = document.getElementById('routeDistance');
const routeDuration = document.getElementById('routeDuration');
const routeNote     = document.getElementById('routeNote');
const waveform      = document.getElementById('waveform');

// ── Init Leaflet Map ───────────────────────────────────────
function initMap() {
  map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    zoomControl: true,
    attributionControl: true
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/" target="_blank">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  map.on('tileerror', function(e) {
    console.warn('Tile loading error:', e);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);
  });

  setTimeout(() => {
    if (map) {
      map.invalidateSize();
      const first = CITIES[0];
      const firstSpot = first.spots[0];
      map.setView([firstSpot.lat, firstSpot.lng], 13);
      updateMarker(firstSpot.lat, firstSpot.lng, firstSpot.title);
      cityLabel.textContent = `${first.name}，${first.country}`;
      cityLabel.classList.add('visible');
    }
  }, 100);
}

// ── Populate Dropdown ──────────────────────────────────────
function populateSelector() {
  CITIES.forEach((city, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${city.name}・${city.region}`;
    citySelector.appendChild(opt);
  });
}

// ── Custom Marker Icon ─────────────────────────────────────
function createPulseIcon() {
  return L.divIcon({
    className: '',
    html: '<div class="pulse-marker"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12]
  });
}

// ── Update Marker ──────────────────────────────────────────
function updateMarker(lat, lng, title) {
  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }
  marker = L.marker([lat, lng], { icon: createPulseIcon() })
    .addTo(map)
    .bindPopup(`<strong>${title}</strong>`)
    .openPopup();
}

// ── Video (iframe) ─────────────────────────────────────────
function updateVideo(url) {
  // 淡出
  cityIframe.classList.remove('loaded');
  setTimeout(() => {
    cityIframe.src = url;
    // 淡入：等 iframe onload 触发
    const onLoad = () => {
      cityIframe.classList.add('loaded');
      cityIframe.removeEventListener('load', onLoad);
    };
    cityIframe.addEventListener('load', onLoad);
    // 兜底：1.5s 后强制显示（避免跨域 load 事件不触发）
    setTimeout(() => cityIframe.classList.add('loaded'), 1500);
  }, 300);
}

// ── Radio Controls ─────────────────────────────────────────
function updateRadio(radio) {
  const wasPlaying = isPlaying;
  stopRadio();
  stationName.textContent = radio.name;
  radioAudio.src = radio.url;
  if (wasPlaying) {
    setTimeout(() => playRadio(), 300);
  }
}

function playRadio() {
  if (!radioAudio.src) return;
  radioAudio.volume = parseFloat(volumeSlider.value);
  radioAudio.play().then(() => {
    setPlayState(true);
  }).catch((err) => {
    console.warn('Radio play failed:', err);
    setPlayState(false);
  });
}

function stopRadio() {
  radioAudio.pause();
  setPlayState(false);
}

function setPlayState(playing) {
  isPlaying = playing;
  playIcon.setAttribute('data-lucide', playing ? 'square' : 'play');
  lucide.createIcons();
  waveform.classList.toggle('active', playing);
}

// ── Load Spot (地点级：视频 + 地图 + 信息卡) ───────────────
function loadSpot(spotIdx) {
  currentSpotIndex = spotIdx;
  const city = CITIES[currentCityIndex];
  const spot = city.spots[spotIdx];

  // 1. 更新视频（淡出 → 换 src → 淡入）
  updateVideo(spot.videoUrl);

  // 2. 地图飞到地点坐标
  if (map) {
    map.flyTo([spot.lat, spot.lng], 13, { duration: 1.2 });
    setTimeout(() => updateMarker(spot.lat, spot.lng, spot.title), 600);
  }

  // 3. 更新信息卡
  routeCity.textContent     = `${city.name} · ${city.region}`;
  routeTitle.textContent    = spot.title;
  routeDistance.textContent = `🛣 ${spot.distance}`;
  routeDuration.textContent = `⏱ ${spot.duration}`;
  routeNote.textContent     = spot.note;
}

// ── Load City (城市级：切换城市) ────────────────────────────
function loadCity(cityIdx) {
  currentCityIndex = cityIdx;
  const city = CITIES[cityIdx];

  // 更新城市标签
  cityLabel.textContent = `${city.name}，${city.country}`;
  cityLabel.classList.add('visible');

  // 地图先飞到城市中心
  if (map) {
    map.flyTo([city.lat, city.lng], 10, { duration: 1.5 });
  }

  // 更新电台
  updateRadio(city.radio);

  // 随机选一个地点并加载
  const spotIdx = Math.floor(Math.random() * city.spots.length);
  loadSpot(spotIdx);

  // 更新随机按钮禁用状态
  updateRandomBtnState(city);
}

// ── Random Spot (城市内随机换地点) ─────────────────────────
function randomSpot() {
  const city = CITIES[currentCityIndex];
  if (city.spots.length <= 1) return;
  let idx;
  do {
    idx = Math.floor(Math.random() * city.spots.length);
  } while (idx === currentSpotIndex);
  loadSpot(idx);
}

// ── Random Button State ────────────────────────────────────
function updateRandomBtnState(city) {
  if (city.spots.length <= 1) {
    randomBtn.disabled = true;
    randomBtn.title = '该城市只有一个地点';
  } else {
    randomBtn.disabled = false;
    randomBtn.title = '随机地点 (R)';
  }
}

// ── Event Listeners ────────────────────────────────────────
citySelector.addEventListener('change', (e) => {
  loadCity(parseInt(e.target.value, 10));
});

randomBtn.addEventListener('click', () => {
  randomSpot();
});

document.addEventListener('keydown', (e) => {
  // 避免在输入框聚焦时触发
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (e.key === 'r' || e.key === 'R') {
    randomSpot();
  }
});

radioPlayBtn.addEventListener('click', () => {
  if (isPlaying) {
    stopRadio();
  } else {
    const city = CITIES[currentCityIndex];
    if (!radioAudio.src || radioAudio.src !== city.radio.url) {
      radioAudio.src = city.radio.url;
    }
    playRadio();
  }
});

volumeSlider.addEventListener('input', () => {
  radioAudio.volume = parseFloat(volumeSlider.value);
});

radioAudio.addEventListener('error',   (e) => { console.warn('Radio stream error:', e); setPlayState(false); });
radioAudio.addEventListener('playing', ()  => setPlayState(true));
radioAudio.addEventListener('pause',   ()  => setPlayState(false));

// ── Init ───────────────────────────────────────────────────
function init() {
  populateSelector();
  initMap();
  lucide.createIcons();

  const first     = CITIES[0];
  const firstSpot = first.spots[0];

  // 加载第一个城市的第一个地点视频
  updateVideo(firstSpot.videoUrl);

  // 信息卡
  routeCity.textContent     = `${first.name} · ${first.region}`;
  routeTitle.textContent    = firstSpot.title;
  routeDistance.textContent = `🛣 ${firstSpot.distance}`;
  routeDuration.textContent = `⏱ ${firstSpot.duration}`;
  routeNote.textContent     = firstSpot.note;

  // 电台
  stationName.textContent = first.radio.name;
  radioAudio.src = first.radio.url;
  radioAudio.load();

  // 随机按钮初始状态
  updateRandomBtnState(first);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
