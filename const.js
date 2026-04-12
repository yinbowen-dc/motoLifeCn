// ── City Data ───────────────────────────────────────────────
export const CITIES = [
  {
    name: '广州',
    nameEn: 'Guangzhou',
    country: '中国',
    countryEn: 'China',
    region: '广东省',
    regionEn: 'Guangdong',
    // 城市中心坐标（切换城市时地图飞到此处）
    lat: 23.1291,
    lng: 113.2644,
    // 城市电台列表（随机切换）
    radios: [
      { name: 'SomaFM · Groove Salad',    url: 'https://ice1.somafm.com/groovesalad-128-mp3'    },
      { name: 'SomaFM · Drone Zone',       url: 'https://ice1.somafm.com/dronezone-128-mp3'      },
      { name: 'SomaFM · Lush',             url: 'https://ice1.somafm.com/lush-128-mp3'           },
      { name: 'SomaFM · Deep Space One',   url: 'https://ice1.somafm.com/deepspaceone-128-mp3'   },
      { name: 'SomaFM · Space Station',    url: 'https://ice1.somafm.com/spacestation-128-mp3'   },
    ],
    // 该城市下的地点列表（随机穿梭的来源）
    spots: [
      {
        id: 'gz-01',
        title: '珠江沿岸骑行',
        titleEn: 'Pearl River Riverside Ride',
        note: '傍晚时段，沿江风景绝佳',
        noteEn: 'Evening ride with stunning riverside views',
        lat: 23.1035,
        lng: 113.2644,
videoUrl: 'https://www.youtube.com/embed/iCPYJBA-dgo?autoplay=1&mute=1&loop=1&playlist=iCPYJBA-dgo&controls=0&disablekb=1&modestbranding=1&hd=1&vq=hd2160',
        gpxPath: 'data/guangzhou_panyu_1.gpx',
        distance: '68 km',
        duration: '2.5 小时',
        durationEn: '2.5 hrs'
      },
      {
        id: 'gz-02',
        title: '白云山盘山公路',
        titleEn: 'Baiyun Mountain Winding Road',
        note: '清晨薄雾，爬坡路段刺激',
        noteEn: 'Morning mist, thrilling uphill sections',
        lat: 23.1726,
        lng: 113.2986,
videoUrl: 'https://www.youtube.com/embed/ScMzIvxBSi4?autoplay=1&mute=1&loop=1&playlist=ScMzIvxBSi4&controls=0&disablekb=1&modestbranding=1&hd=1&vq=hd2160',
        distance: '32 km',
        duration: '1 小时',
        durationEn: '1 hr'
      },
      {
        id: 'gz-03',
        title: '番禺大学城环线',
        titleEn: 'Panyu University Town Loop',
        note: '夜骑路灯延绵，节奏舒缓',
        noteEn: 'Night ride under endless streetlights, relaxed pace',
        lat: 22.9369,
        lng: 113.3939,
videoUrl: 'https://www.youtube.com/embed/2Vv-BfVoq4g?autoplay=1&mute=1&loop=1&playlist=2Vv-BfVoq4g&controls=0&disablekb=1&modestbranding=1&hd=1&vq=hd2160',
        distance: '24 km',
        duration: '45 分钟',
        durationEn: '45 min'
      }
    ]
  }
];
