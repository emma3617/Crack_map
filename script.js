mapboxgl.accessToken = 'pk.eyJ1IjoieWl3ZW4zNjE3IiwiYSI6ImNsdzVzODNrMTAybncybG80MjdvMDVuMTQifQ.CGOJXckagzUD5SNYfu2rTQ';
let esriBasemapVisible = false;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [121.65645392142392, 24.931344004693024],
  zoom: 14,
  minZoom: 12,
  maxZoom: 17
});

// 切換底圖功能
function toggleBasemap() {
  const visibility = esriBasemapVisible ? 'none' : 'visible';
  map.setLayoutProperty('esri-basemap-layer', 'visibility', visibility);
  esriBasemapVisible = !esriBasemapVisible;
}

// 將函式掛到全域供 HTML 呼叫
window.toggleBasemap = toggleBasemap;

// 綁定按鈕事件
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('basemapToggleBtn')?.addEventListener('click', toggleBasemap);
});

map.on('load', () => {
  // Esri 底圖
  map.addSource('esri-basemap', {
    type: 'raster',
    tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256
  });
  map.addLayer({
    id: 'esri-basemap-layer',
    type: 'raster',
    source: 'esri-basemap',
    layout: { visibility: 'none' },
    paint: {}
  });

  // NDVI Layers
  map.addSource('esri-ndvi-landsat', {
    type: 'raster',
    tiles: ['https://tiles.arcgis.com/tiles/gDvgvk6tNkAnOdO4/arcgis/rest/services/Normalized_difference_vegetation_index_Variation_area_Landsat9_result/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256
  });
  map.addLayer({
    id: 'esri-ndvi-landsat-layer',
    type: 'raster',
    source: 'esri-ndvi-landsat',
    paint: { 'raster-opacity': 1 }
  });

  map.addSource('esri-ndvi-sentinel', {
    type: 'raster',
    tiles: ['https://tiles.arcgis.com/tiles/gDvgvk6tNkAnOdO4/arcgis/rest/services/Sentinel2_NDVI_result_/MapServer/tile/{z}/{y}/{x}'],
    tileSize: 256
  });
  map.addLayer({
    id: 'esri-ndvi-sentinel-layer',
    type: 'raster',
    source: 'esri-ndvi-sentinel',
    paint: { 'raster-opacity': 1 }
  });

  // 回報事件資料
  fetch('report/report_.json')
    .then(res => res.json())
    .then(data => {
      const geojson = {
        type: 'FeatureCollection',
        features: data.map(item => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(item.經度), parseFloat(item.緯度)]
          },
          properties: {
            id: item.ID,
            type: item.事件,
            image: item.圖片,
            time: item.時間
          }
        }))
      };

      map.addSource('report-points', {
        type: 'geojson',
        data: geojson
      });

      map.addLayer({
        id: 'report-points-layer',
        type: 'circle',
        source: 'report-points',
        paint: {
          'circle-radius': 6,
          'circle-color': '#e74c3c',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1
        }
      });

      map.on('click', 'report-points-layer', (e) => {
        const props = e.features[0].properties;
        const coordinates = e.features[0].geometry.coordinates;
        const html = `
          <strong>事件：</strong> ${props.type}<br/>
          <strong>時間：</strong> ${props.time}<br/>
          <img src="report/${props.id}.jpg" style="width:200px;margin-top:5px;" />
        `;
        new mapboxgl.Popup().setLngLat(coordinates).setHTML(html).addTo(map);
      });

      document.getElementById('typeFilter').addEventListener('change', (e) => {
        const selected = e.target.value;
        map.setFilter('report-points-layer', selected === 'all' ? null : ['==', ['get', 'type'], selected]);
      });
    });

  // 模型預測點
  fetch('predict/predict.snapshots.json')
    .then(res => res.json())
    .then(data => {
      const geojson = {
        type: 'FeatureCollection',
        features: data.map(item => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [item.lng, item.lat] },
          properties: {
            id: item._id.$oid,
            createdAt: item.createdAt.$date
          }
        }))
      };

      map.addSource('predict-points', {
        type: 'geojson',
        data: geojson
      });

      map.addLayer({
        id: 'predict-points-layer',
        type: 'circle',
        source: 'predict-points',
        paint: {
          'circle-radius': 6,
          'circle-color': '#3498db',
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1
        }
      });

      map.on('click', 'predict-points-layer', (e) => {
        const props = e.features[0].properties;
        const coordinates = e.features[0].geometry.coordinates;
        const html = `
          <strong>類型：</strong> 道路裂縫<br/>
          <strong>預測影像 ID：</strong> ${props.id}<br/>
          <strong>建立時間：</strong> ${props.createdAt}<br/>
          <img src="predict/${props.id}.jpg" style="width:200px;margin-top:5px;" />
        `;
        new mapboxgl.Popup().setLngLat(coordinates).setHTML(html).addTo(map);
      });
    });

  // 透明度調整事件
  document.getElementById('landsatToggle').addEventListener('change', (e) => {
    map.setLayoutProperty('esri-ndvi-landsat-layer', 'visibility', e.target.checked ? 'visible' : 'none');
  });
  document.getElementById('sentinelToggle').addEventListener('change', (e) => {
    map.setLayoutProperty('esri-ndvi-sentinel-layer', 'visibility', e.target.checked ? 'visible' : 'none');
  });
  document.getElementById('landsatOpacity').addEventListener('input', (e) => {
    map.setPaintProperty('esri-ndvi-landsat-layer', 'raster-opacity', parseFloat(e.target.value));
  });
  document.getElementById('sentinelOpacity').addEventListener('input', (e) => {
    map.setPaintProperty('esri-ndvi-sentinel-layer', 'raster-opacity', parseFloat(e.target.value));
  });
});
