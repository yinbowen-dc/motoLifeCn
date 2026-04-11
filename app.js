/* ═══════════════════════════════════════════════════════════
   Moto Life China — App Logic
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ── State ───────────────────────────────────────────────────
let map = null;
let marker = null;
let isPlaying = false;
let currentCityIndex = 0;

// ── DOM Refs ────────────────────────────────────────────────
const citySelector  = document.getElementById('citySelector');
const stationName   = document.getElementById('stationName');
const radioPlayBtn  = document.getElementById('radioPlayBtn');
const playIcon      = document.getElementById('playIcon');
const volumeSlider  = document.getElementById('volumeSlider');
const radioAudio    = document.getElementById('radioAudio');
const cityLabel     = document.getElementById('city-label');
const cityVideo     = document.getElementById('cityVideo');
const routeCity     = document.getElementById('routeCity');
const routeTitle    = document.getElementById('routeTitle');
const routeDistance = document.getElementById('routeDistance');
const routeDuration = document.getElementById('routeDuration');
const routeNote     = document.getElementById('routeNote');
const waveform      = document.getElementById('waveform');

// ── Init Leaflet Map ────────────────────────────────────────
function initMap() {
  map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    zoomControl: true,
    attributionControl: true
  });

  const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/" target="_blank">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  // Add error handling for tile loading
  map.on('tileerror', function(e) {
    console.warn('Tile loading error:', e);
    // Try alternative tile server if primary fails
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);
  });

  // Render map with first city immediately
  renderMapWithCity();
}

function renderMapWithCity() {
  console.log('Rendering map with city data...');
  const first = CITIES[0];
  
  // Ensure map container is properly sized
  try {
    // Force map to recalculate size
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
        
        // Set initial view
        map.setView([first.lat, first.lng], 9);
        marker = L.marker([first.lat, first.lng], { icon: createPulseIcon() })
          .addTo(map)
          .bindPopup(`<strong>${first.name}</strong><br>${first.region}，${first.country}`)
          .openPopup();

        cityLabel.textContent = `${first.name}，${first.country}`;
        cityLabel.classList.add('visible');
        
        console.log('Map rendered successfully');
      }
    }, 100);
  } catch (error) {
    console.error('Error rendering map:', error);
  }
}

// ── Populate Dropdown ───────────────────────────────────────
function populateSelector() {
  CITIES.forEach((city, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${city.name}・${city.region}`;
    citySelector.appendChild(opt);
  });
}

// ── Custom Marker Icon ──────────────────────────────────────
function createPulseIcon() {
  return L.divIcon({
    className: '',
    html: '<div class="pulse-marker"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12]
  });
}

// ── Load City ───────────────────────────────────────────────
function loadCity(cityIndex) {
  const city = CITIES[cityIndex];
  currentCityIndex = cityIndex;

  // 1. Update city label on map
  cityLabel.textContent = `${city.name}，${city.country}`;
  cityLabel.classList.add('visible');

  // 2. Fly map to city
  if (map) {
    map.flyTo([city.lat, city.lng], 9, { duration: 1.5 });

    if (marker) {
      map.removeLayer(marker);
      marker = null;
    }

    // Drop marker after fly animation starts
    setTimeout(() => {
      marker = L.marker([city.lat, city.lng], { icon: createPulseIcon() })
        .addTo(map)
        .bindPopup(`<strong>${city.name}</strong><br>${city.region}，${city.country}`)
        .openPopup();
    }, 600);
  }

  // 3. Load local video
  cityVideo.src = city.videoFile;
  cityVideo.load();
  cityVideo.play().catch(() => {
    // Autoplay may be blocked; video will play on user interaction
  });

  // 4. Update route info card
  routeCity.textContent = `${city.name} · ${city.region}`;
  routeTitle.textContent = city.route.title;
  routeDistance.textContent = `🛣 ${city.route.distance}`;
  routeDuration.textContent = `⏱ ${city.route.duration}`;
  routeNote.textContent = city.route.note;

  // 5. Update radio
  const wasPlaying = isPlaying;
  stopRadio();

  stationName.textContent = city.radio.name;
  radioAudio.src = city.radio.url;

  if (wasPlaying) {
    // Small delay to let src settle
    setTimeout(() => playRadio(), 300);
  }
}

// ── Radio Controls ──────────────────────────────────────────
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

radioPlayBtn.addEventListener('click', () => {
  if (isPlaying) {
    stopRadio();
  } else {
    // Ensure src is set for current city
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

radioAudio.addEventListener('error', (e) => {
  console.warn('Radio stream error:', e);
  setPlayState(false);
});

radioAudio.addEventListener('playing', () => {
  setPlayState(true);
});

radioAudio.addEventListener('pause', () => {
  setPlayState(false);
});

// ── City Selector Change ────────────────────────────────────
citySelector.addEventListener('change', (e) => {
  loadCity(parseInt(e.target.value, 10));
});

// ── Init ────────────────────────────────────────────────────
function init() {
  populateSelector();
  initMap();
  
  // Render Lucide icons
  lucide.createIcons();

  // Load first city UI elements
  const first = CITIES[0];

  // Load video
  cityVideo.src = first.videoFile;
  cityVideo.load();
  cityVideo.play().catch(() => {
    // Autoplay may be blocked; video will play on user interaction
  });

  // Load audio
  radioAudio.src = first.radio.url;
  radioAudio.load();

  // Update UI elements
  routeCity.textContent = `${first.name} · ${first.region}`;
  routeTitle.textContent = first.route.title;
  routeDistance.textContent = `🛣 ${first.route.distance}`;
  routeDuration.textContent = `⏱ ${first.route.duration}`;
  routeNote.textContent = first.route.note;
  stationName.textContent = first.radio.name;
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
