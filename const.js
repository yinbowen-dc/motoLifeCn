// ── City Data ───────────────────────────────────────────────
export const CITIES = [
  {
    name: '广州',
    nameEn: 'Guangzhou',
    country: '中国',
    region: '广东省',
    // 城市中心坐标（切换城市时地图飞到此处）
    lat: 23.1291,
    lng: 113.2644,
    // 城市电台（切换城市时更新）
    radio: {
      name: 'Radio Guangzhou 105.1',
      url: 'https://lhttp.qtfm.cn/l/1/index.m3u8'
    },
    // 该城市下的地点列表（随机穿梭的来源）
    spots: [
      {
        id: 'gz-01',
        title: '珠江沿岸骑行',
        note: '傍晚时段，沿江风景绝佳',
        lat: 23.1035,
        lng: 113.2644,
        videoUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=1&loop=1&playlist=jfKfPfyJRdk&controls=0&disablekb=1&modestbranding=1&vq=hd1080',
        distance: '68 km',
        duration: '2.5 小时'
      },
      {
        id: 'gz-02',
        title: '白云山盘山公路',
        note: '清晨薄雾，爬坡路段刺激',
        lat: 23.1726,
        lng: 113.2986,
        videoUrl: 'https://www.youtube.com/embed/ScMzIvxBSi4?autoplay=1&mute=1&loop=1&playlist=ScMzIvxBSi4&controls=0&disablekb=1&modestbranding=1&vq=hd1080',
        distance: '32 km',
        duration: '1 小时'
      },
      {
        id: 'gz-03',
        title: '番禺大学城环线',
        note: '夜骑路灯延绵，节奏舒缓',
        lat: 22.9369,
        lng: 113.3939,
        videoUrl: 'https://www.youtube.com/embed/2Vv-BfVoq4g?autoplay=1&mute=1&loop=1&playlist=2Vv-BfVoq4g&controls=0&disablekb=1&modestbranding=1&vq=hd1080',
        distance: '24 km',
        duration: '45 分钟'
      }
    ]
  }
];
