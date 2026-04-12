// ── i18n — Internationalization ───────────────────────────
export let currentLang = localStorage.getItem('lang') || 'zh';

export const TRANSLATIONS = {
  zh: {
    // Header
    randomTitle:      '随机地点 (R)',
    gpxTitle:         '上传GPX轨迹文件',
    onlyOneSpot:      '该城市只有一个地点',

    // Route Card
    trackTime:        '时间',
    trackAccuracy:    '精度',
    trackSpeed:       '速度',

    // Radio
    radioLabel:       'Radio',
    radioShuffleTitle:'随机切换电台',
    radioPlayTitle:   'Play / Stop',

    // GPX errors / alerts
    gpxInvalidFile:   '请选择有效的GPX文件',
    gpxParseError:    'GPX文件格式错误',
    gpxNoPoints:      '未找到有效的轨迹点',
    gpxLoadFail:      '加载GPX文件失败: ',
    gpxParseFail:     'GPX文件解析失败: ',
    gpxLoadError:     '无法加载GPX文件: ',

    // Date format
    dateFormat:       (y, mo, d, h, mi, s) => `${y}年${mo}月${d}日 ${h}:${mi}:${s}`,

    // City label
    cityLabel:        (name, country) => `${name}，${country}`,

    // Selector option
    selectorOption:   (name, region) => `${name}・${region}`,

    // Route card
    routeCity:        (name, region) => `${name} · ${region}`,
  },
  en: {
    // Header
    randomTitle:      'Random Spot (R)',
    gpxTitle:         'Upload GPX Track',
    onlyOneSpot:      'Only one spot in this city',

    // Route Card
    trackTime:        'Time',
    trackAccuracy:    'Accuracy',
    trackSpeed:       'Speed',

    // Radio
    radioLabel:       'Radio',
    radioShuffleTitle:'Shuffle Station',
    radioPlayTitle:   'Play / Stop',

    // GPX errors / alerts
    gpxInvalidFile:   'Please select a valid GPX file',
    gpxParseError:    'Invalid GPX file format',
    gpxNoPoints:      'No valid track points found',
    gpxLoadFail:      'Failed to load GPX file: ',
    gpxParseFail:     'Failed to parse GPX file: ',
    gpxLoadError:     'Cannot load GPX file: ',

    // Date format
    dateFormat:       (y, mo, d, h, mi, s) => `${y}-${mo}-${d} ${h}:${mi}:${s}`,

    // City label
    cityLabel:        (name, country) => `${name}, ${country}`,

    // Selector option
    selectorOption:   (name, region) => `${name} · ${region}`,

    // Route card
    routeCity:        (name, region) => `${name} · ${region}`,
  }
};

/** Get translation string or call template function */
export function t(key, ...args) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.zh;
  const val = dict[key];
  if (typeof val === 'function') return val(...args);
  return val ?? key;
}

/** Switch language and persist */
export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('lang', lang);
}
