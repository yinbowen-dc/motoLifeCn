/* ═══════════════════════════════════════════════════════════
   Moto Life China — App Logic
   ═══════════════════════════════════════════════════════════ */

import { CITIES } from './const.js';
import { t, setLang, currentLang } from './i18n.js';

// ── HLS.js 动态加载 ────────────────────────────────────────
let hlsInstance = null;
async function loadHls() {
  if (window.Hls) return window.Hls;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';
    s.onload = () => resolve(window.Hls);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ── State ──────────────────────────────────────────────────
let map = null;
let marker = null;
let isPlaying = false;
let currentCityIndex = 0;   // 当前选中城市
let currentSpotIndex = 0;   // 当前展示的地点索引
let currentRadioIndex = 0;  // 当前电台索引
let gpxLayer = null;        // GPX轨迹图层

// 全局变量
let gpxAnimation = null;
let gpxTrackPoints = [];
let gpxTimestamps = [];
let gpxExtensions = [];

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
const radioShuffleBtn = document.getElementById('radioShuffleBtn');
const waveform      = document.getElementById('waveform');

const gpxUpload     = document.getElementById('gpxUpload');
const langToggleBtn = document.getElementById('langToggleBtn');
function initMap() {
  map = L.map('map', {
    center: [20, 0],
    zoom: 3,
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
      map.setView([firstSpot.lat, firstSpot.lng], 15);
      updateMarker(firstSpot.lat, firstSpot.lng, firstSpot.title);
      const c = CITIES[0];
      cityLabel.textContent = t('cityLabel', currentLang === 'en' ? c.nameEn : c.name, currentLang === 'en' ? c.countryEn : c.country);
      cityLabel.classList.add('visible');
    }
  }, 100);
}
// ── Populate Dropdown ──────────────────────────────────────
function populateSelector() {
  citySelector.innerHTML = '';
  CITIES.forEach((city, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    const name   = currentLang === 'en' ? city.nameEn   : city.name;
    const region = currentLang === 'en' ? city.regionEn : city.region;
    opt.textContent = t('selectorOption', name, region);
    citySelector.appendChild(opt);
  });
  citySelector.value = currentCityIndex;
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
// 随机选一个不重复的电台
function pickRandomRadio() {
  const city = CITIES[currentCityIndex];
  if (city.radios.length <= 1) return;
  let idx;
  do {
    idx = Math.floor(Math.random() * city.radios.length);
  } while (idx === currentRadioIndex);
  currentRadioIndex = idx;
  const radio = city.radios[idx];
  updateRadio(radio);
  if (!isPlaying) playRadio();
}

function updateRadio(radio) {
  const wasPlaying = isPlaying;
  stopRadio();
  stationName.textContent = radio.name;
  if (wasPlaying) {
    setTimeout(() => playRadio(), 300);
  }
}

async function playRadio() {
  const city = CITIES[currentCityIndex];
  const url = city.radios[currentRadioIndex].url;
  if (!url) return;
  radioAudio.volume = parseFloat(volumeSlider.value);

  if (url.includes('.m3u8')) {
    // HLS 流：使用 HLS.js
    try {
      const Hls = await loadHls();
      if (Hls.isSupported()) {
        if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
        hlsInstance = new Hls();
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(radioAudio);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          radioAudio.play().then(() => setPlayState(true)).catch(err => {
            console.warn('HLS play failed:', err);
            setPlayState(false);
          });
        });
        hlsInstance.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.warn('HLS fatal error:', data);
            setPlayState(false);
          }
        });
      } else if (radioAudio.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari 原生支持 HLS
        radioAudio.src = url;
        radioAudio.play().then(() => setPlayState(true)).catch(err => {
          console.warn('Native HLS play failed:', err);
          setPlayState(false);
        });
      } else {
        console.warn('HLS not supported in this browser');
        setPlayState(false);
      }
    } catch (err) {
      console.warn('Failed to load HLS.js:', err);
      setPlayState(false);
    }
  } else {
    // 普通流
    radioAudio.src = url;
    radioAudio.play().then(() => setPlayState(true)).catch(err => {
      console.warn('Radio play failed:', err);
      setPlayState(false);
    });
  }
}

function stopRadio() {
  radioAudio.pause();
  if (hlsInstance) { hlsInstance.destroy(); hlsInstance = null; }
  setPlayState(false);
}

function setPlayState(playing) {
  isPlaying = playing;
  // 直接替换按钮内的图标（lucide.createIcons 无法更新已渲染的 SVG）
  radioPlayBtn.innerHTML = playing
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>`;
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
  const cityName   = currentLang === 'en' ? city.nameEn   : city.name;
  const cityRegion = currentLang === 'en' ? city.regionEn : city.region;
  routeCity.textContent     = t('routeCity', cityName, cityRegion);
  routeTitle.textContent    = currentLang === 'en' ? (spot.titleEn || spot.title) : spot.title;
  routeDistance.textContent = '';
  routeDuration.textContent = '';
  routeNote.textContent     = currentLang === 'en' ? (spot.noteEn || spot.note) : spot.note;

  // 4. 如果该位置有GPX文件路径，自动加载GPX轨迹
  if (spot.gpxPath) {
    loadGpxFromPath(spot.gpxPath);
  }
}

// ── Load City (城市级：切换城市) ────────────────────────────
function loadCity(cityIdx) {
  // 清除GPX轨迹
  clearGpxTrack();
  
  currentCityIndex = cityIdx;
  const city = CITIES[cityIdx];

  // 更新城市标签
  const labelName    = currentLang === 'en' ? city.nameEn    : city.name;
  const labelCountry = currentLang === 'en' ? city.countryEn : city.country;
  cityLabel.textContent = t('cityLabel', labelName, labelCountry);
  cityLabel.classList.add('visible');

  // 地图先飞到城市中心
  if (map) {
    map.flyTo([city.lat, city.lng], 10, { duration: 1.5 });
  }

  // 随机选一个电台
  currentRadioIndex = Math.floor(Math.random() * city.radios.length);
  updateRadio(city.radios[currentRadioIndex]);

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
    randomBtn.title = t('onlyOneSpot');
  } else {
    randomBtn.disabled = false;
    randomBtn.title = t('randomTitle');
  }
}

// ── GPX File Handling ──────────────────────────────────────
function handleGpxUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.name.endsWith('.gpx')) {
    alert(t('gpxInvalidFile'));
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const gpxContent = e.target.result;
    parseGpxFile(gpxContent);
  };
  reader.readAsText(file);
  
  // 重置文件输入，允许重复选择同一文件
  event.target.value = '';
}

// 解析GPX文件并显示轨迹
async function parseGpxFile(gpxContent) {
  try {
    // 清除之前的GPX轨迹
    clearGpxTrack();

    // 解析GPX XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(gpxContent, 'text/xml');
    
    // 检查解析错误（兼容命名空间，parsererror 可能在任意命名空间下）
    const parseError = xmlDoc.querySelector('parsererror') ||
                       xmlDoc.getElementsByTagNameNS('http://www.mozilla.org/newlayout/xml/parsererror.xml', 'parsererror')[0];
    if (parseError) {
      throw new Error(t('gpxParseError'));
    }

    // 提取轨迹点、时间信息和扩展数据
    gpxTrackPoints = [];
    gpxTimestamps = [];
    gpxExtensions = [];
    // 使用 getElementsByTagNameNS 兼容带命名空间的 GPX 文件
    const GPX_NS = 'http://www.topografix.com/GPX/1/1';
    let trkptElements = xmlDoc.getElementsByTagNameNS(GPX_NS, 'trkpt');
    // fallback：如果命名空间查找失败，退回到无命名空间查找
    if (trkptElements.length === 0) {
      trkptElements = xmlDoc.getElementsByTagName('trkpt');
    }
    
    for (let i = 0; i < trkptElements.length; i++) {
      const trkpt = trkptElements[i];
      const lat = parseFloat(trkpt.getAttribute('lat'));
      const lon = parseFloat(trkpt.getAttribute('lon'));
      
      // 提取时间信息
      let timeElement = trkpt.getElementsByTagNameNS(GPX_NS, 'time')[0];
      if (!timeElement) timeElement = trkpt.getElementsByTagName('time')[0];
      let timestamp = null;
      if (timeElement) {
        timestamp = new Date(timeElement.textContent);
      }
      
      // 提取扩展数据（c和s指标）
      const GEOTRACKER_NS = 'http://ilyabogdanovich.com/gpx/extensions/geotracker';
      let extensionElement = trkpt.getElementsByTagNameNS(GEOTRACKER_NS, 'meta')[0];
      if (!extensionElement) extensionElement = trkpt.getElementsByTagName('geotracker:meta')[0];
      let extensionData = null;
      if (extensionElement) {
        const c = parseFloat(extensionElement.getAttribute('c'));
        const s = parseFloat(extensionElement.getAttribute('s'));
        extensionData = { c: isNaN(c) ? null : c, s: isNaN(s) ? null : s };
      }
      
      if (!isNaN(lat) && !isNaN(lon)) {
        gpxTrackPoints.push([lat, lon]);
        gpxTimestamps.push(timestamp);
        gpxExtensions.push(extensionData);
      }
    }

    if (gpxTrackPoints.length === 0) {
      throw new Error(t('gpxNoPoints'));
    }

    // 创建初始的GPX轨迹线（空路径）
    gpxLayer = L.polyline([], {
      color: '#936240',
      weight: 4,
      opacity: 0.8,
      lineJoin: 'round'
    }).addTo(map);

    // 调整地图视图以显示整个轨迹
    const bounds = L.latLngBounds(gpxTrackPoints);
    map.fitBounds(bounds, { padding: [20, 20] });

    // 显示轨迹信息
    const metadata = xmlDoc.getElementsByTagName('metadata')[0];
    const trackName = xmlDoc.getElementsByTagName('name')[0]?.textContent || 'GPX轨迹';
    const trackLength = xmlDoc.getElementsByTagName('geotracker:length')[0]?.textContent || '未知';
    const trackDuration = xmlDoc.getElementsByTagName('geotracker:duration')[0]?.textContent || '未知';

    // 更新信息卡：保留原有城市、地点标题和描述，只清空距离和时长
    routeDistance.textContent = '';
    routeDuration.textContent = '';

    // 显示轨迹信息区域
    const trackInfo = document.getElementById('trackInfo');
    if (trackInfo) {
      trackInfo.style.display = 'block';
    }
    
    // 自动开始动画（延迟500ms确保页面完全加载）
    setTimeout(() => {
      startAnimation();
    }, 500);
  
  console.log('GPX轨迹加载成功:', gpxTrackPoints.length, '个点');

  } catch (error) {
    console.error('GPX parse error:', error);
    alert(t('gpxParseFail') + error.message);
  }
}

// 更新轨迹信息显示
function updateTrackInfo(index) {
  const currentTimeElement = document.getElementById('currentTime');
  const metricCElement = document.getElementById('metricC');
  const metricSElement = document.getElementById('metricS');
  
  if (currentTimeElement && gpxTimestamps[index]) {
    const timestamp = gpxTimestamps[index];
    
    // 手动转换UTC时间到北京时间（UTC+8），避免toLocaleString的时区二次转换
    const beijingOffset = 8 * 60 * 60 * 1000;
    const beijingTime = new Date(timestamp.getTime() + beijingOffset);
    
    // 使用UTC方法读取（因为已手动加了8小时偏移，用getUTC*读取即为北京时间）
    const y = beijingTime.getUTCFullYear();
    const mo = String(beijingTime.getUTCMonth() + 1).padStart(2, '0');
    const d = String(beijingTime.getUTCDate()).padStart(2, '0');
    const h = String(beijingTime.getUTCHours()).padStart(2, '0');
    const mi = String(beijingTime.getUTCMinutes()).padStart(2, '0');
    const s = String(beijingTime.getUTCSeconds()).padStart(2, '0');
    
    const dateTimeString = t('dateFormat', y, mo, d, h, mi, s);
    currentTimeElement.textContent = dateTimeString;
  }
  
  if (metricCElement && gpxExtensions[index]) {
    const cValue = gpxExtensions[index].c;
    metricCElement.textContent = cValue !== null ? cValue.toFixed(2) : '--';
  }
  
  if (metricSElement && gpxExtensions[index]) {
    const sValue = gpxExtensions[index].s;
    metricSElement.textContent = sValue !== null ? `${sValue.toFixed(2)} m/s` : '--';
  }
}





// 显示动画控制界面


// 开始动画
function startAnimation() {
  if (gpxAnimation && gpxAnimation.playing) {
    return;
  }
  
  if (!gpxAnimation) {
    gpxAnimation = {
      currentIndex: 0,
      playing: true,
      startTime: Date.now()
    };
  } else {
    gpxAnimation.playing = true;
  }
  
  animateTrack();
}

// 暂停动画
function pauseAnimation() {
  if (gpxAnimation) {
    gpxAnimation.playing = false;
  }
}

// 重置动画
function resetAnimation() {
  if (gpxAnimation) {
    gpxAnimation.playing = false;
    gpxAnimation.currentIndex = 0;
    
    // 重置轨迹线
    if (gpxLayer) {
      gpxLayer.setLatLngs([]);
    }
    
    // 更新进度
    updateProgress(0);
    
    // 重置轨迹信息显示
    updateTrackInfo(0);
  }
}

// 跳转到指定进度
function seekAnimation(event) {
  const progress = parseInt(event.target.value);
  const targetIndex = Math.floor((progress / 100) * gpxTrackPoints.length);
  
  if (gpxAnimation) {
    gpxAnimation.playing = false;
    gpxAnimation.currentIndex = targetIndex;
    
    // 更新轨迹显示
    const currentPoints = gpxTrackPoints.slice(0, targetIndex + 1);
    if (gpxLayer) {
      gpxLayer.setLatLngs(currentPoints);
    }
    
    updateProgress(progress);
    
    // 更新轨迹信息显示
    updateTrackInfo(targetIndex);
  }
}

// 更新进度显示
function updateProgress(progress) {
  const progressElement = document.getElementById('animation-progress');
  const slider = document.getElementById('animation-slider');
  
  if (progressElement) {
    progressElement.textContent = `${progress}%`;
  }
  
  if (slider) {
    slider.value = progress;
  }
}

// 动画循环
function animateTrack() {
  if (!gpxAnimation || !gpxAnimation.playing) {
    return;
  }
  
  if (gpxAnimation.currentIndex >= gpxTrackPoints.length) {
    gpxAnimation.playing = false;
    return;
  }
  
  // 计算当前应该显示的轨迹点
  const currentPoints = gpxTrackPoints.slice(0, gpxAnimation.currentIndex + 1);
  
  // 更新轨迹线
  if (gpxLayer) {
    gpxLayer.setLatLngs(currentPoints);
  }
  
  // 更新地图视图，使当前轨迹点居中
  if (map && gpxTrackPoints[gpxAnimation.currentIndex]) {
    const currentPoint = gpxTrackPoints[gpxAnimation.currentIndex];
    map.setView(currentPoint, map.getZoom(), {
      animate: true,
      duration: 0.5
    });
  }
  
  // 更新进度
  const progress = Math.round((gpxAnimation.currentIndex / gpxTrackPoints.length) * 100);
  updateProgress(progress);
  
  // 更新时间信息和扩展数据显示
  updateTrackInfo(gpxAnimation.currentIndex);
  
  // 移动到下一个点
  gpxAnimation.currentIndex++;
  
  // 计算下一个点的延迟时间
  let delay = 1000; // 默认延迟1秒
  
  // 如果有时间信息，根据实际时间间隔计算延迟
  if (gpxTimestamps[gpxAnimation.currentIndex] && gpxTimestamps[gpxAnimation.currentIndex - 1]) {
    const timeDiff = gpxTimestamps[gpxAnimation.currentIndex] - gpxTimestamps[gpxAnimation.currentIndex - 1];
    delay = Math.max(100, Math.min(timeDiff, 5000)); // 限制在100ms-5000ms之间，使用真实时间间隔
  }
  
  // 设置下一个动画帧
  if (gpxAnimation.playing) {
    gpxAnimation.interval = setTimeout(animateTrack, delay);
  }
}

function clearGpxTrack() {
  if (gpxLayer) {
    map.removeLayer(gpxLayer);
    gpxLayer = null;
  }
  
  // 移除动画控件
  const controls = document.getElementById('animation-controls');
  if (controls) {
    controls.remove();
  }
  
  // 清除动画
  if (gpxAnimation) {
    clearInterval(gpxAnimation.interval);
    gpxAnimation = null;
  }
  
  gpxTrackPoints = [];
  gpxTimestamps = [];
  
  console.log('GPX轨迹已清除');
}

// ── i18n: Apply translations to static DOM elements ────────
function applyI18n() {
  const lang = currentLang;

  // Update <html lang>
  document.getElementById('html-root').lang = lang === 'en' ? 'en' : 'zh-CN';

  // Update lang toggle button label
  langToggleBtn.textContent = lang === 'en' ? '中文' : 'EN';

  // Update data-i18n text nodes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  // Update data-i18n-title attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });

  // Update random / gpx button titles
  randomBtn.title = t('randomTitle');
  document.querySelector('.btn-gpx').title = t('gpxTitle');

  // Re-render selector options
  populateSelector();

  // Re-render current route card
  const city = CITIES[currentCityIndex];
  const spot = city.spots[currentSpotIndex];
  const cityName   = lang === 'en' ? city.nameEn   : city.name;
  const cityRegion = lang === 'en' ? city.regionEn : city.region;
  routeCity.textContent  = t('routeCity', cityName, cityRegion);
  routeTitle.textContent = lang === 'en' ? (spot.titleEn || spot.title) : spot.title;
  routeNote.textContent  = lang === 'en' ? (spot.noteEn  || spot.note)  : spot.note;

  // Re-render city label
  const labelName    = lang === 'en' ? city.nameEn    : city.name;
  const labelCountry = lang === 'en' ? city.countryEn : city.country;
  cityLabel.textContent = t('cityLabel', labelName, labelCountry);
}

// ── Event Listeners ────────────────────────────────────────
langToggleBtn.addEventListener('click', () => {
  const newLang = currentLang === 'zh' ? 'en' : 'zh';
  setLang(newLang);
  applyI18n();
});

citySelector.addEventListener('change', (e) => {
  // 清除GPX轨迹
  clearGpxTrack();
  loadCity(parseInt(e.target.value, 10));
});

randomBtn.addEventListener('click', () => {
  randomSpot();
});

gpxUpload.addEventListener('change', handleGpxUpload);

document.addEventListener('keydown', (e) => {
  // 避免在输入框聚焦时触发
  const tag = document.activeElement.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (e.key === 'r' || e.key === 'R') {
    randomSpot();
  }
  // 添加清除GPX轨迹的快捷键 (C键)
  if (e.key === 'c' || e.key === 'C') {
    clearGpxTrack();
  }
});

radioShuffleBtn.addEventListener('click', () => {
  pickRandomRadio();
});

radioPlayBtn.addEventListener('click', () => {
  if (isPlaying) {
    stopRadio();
  } else {
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
  const initCityName   = currentLang === 'en' ? first.nameEn   : first.name;
  const initCityRegion = currentLang === 'en' ? first.regionEn : first.region;
  routeCity.textContent     = t('routeCity', initCityName, initCityRegion);
  routeTitle.textContent    = currentLang === 'en' ? (firstSpot.titleEn || firstSpot.title) : firstSpot.title;
  routeDistance.textContent = '';
  routeDuration.textContent = '';
  routeNote.textContent     = currentLang === 'en' ? (firstSpot.noteEn || firstSpot.note) : firstSpot.note;

  // 电台：随机选一个
  currentRadioIndex = Math.floor(Math.random() * first.radios.length);
  stationName.textContent = first.radios[currentRadioIndex].name;

  // 随机按钮初始状态
  updateRandomBtnState(first);

  // 初始化 i18n（根据 localStorage 中保存的语言设置更新 UI）
  applyI18n();

  // 自动加载第一个地点的GPX轨迹（如果存在）
  if (firstSpot.gpxPath) {
    loadGpxFromPath(firstSpot.gpxPath);
  }

  // 自动播放：等待用户第一次交互后触发（浏览器安全策略要求）
  const autoPlayOnInteraction = () => {
    if (!isPlaying) {
      playRadio();
    }
    document.removeEventListener('click', autoPlayOnInteraction);
    document.removeEventListener('keydown', autoPlayOnInteraction);
  };
  document.addEventListener('click', autoPlayOnInteraction);
  document.addEventListener('keydown', autoPlayOnInteraction);
}

// 从文件路径加载GPX文件
async function loadGpxFromPath(gpxPath) {
  try {
    // 清除之前的GPX轨迹
    clearGpxTrack();

    // 使用fetch加载GPX文件
    const response = await fetch(gpxPath);
    if (!response.ok) {
      throw new Error(t('gpxLoadError') + response.status);
    }
    
    const gpxContent = await response.text();
    parseGpxFile(gpxContent);
    
  } catch (error) {
    console.error('GPX load error:', error);
    alert(t('gpxLoadFail') + error.message);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
