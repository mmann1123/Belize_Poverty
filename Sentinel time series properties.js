

Map.setCenter(-88.5551, 17.1948, 7)

// Get the boundary of Sri Lanka from Google's Fusion Table
// Change Country name for different location
var country_boundary = ee.FeatureCollection('USDOS/LSIB/2013')
    .filter(ee.Filter.eq('name', 'BELIZE'));

// buffer function
var bufferBy = function(size) {
  return function(feature) {
    return feature.buffer(size);  
  };
};

var bufferedPolys100 = country_boundary.map(bufferBy(1000));

// calculate ndvi 
var addNDVI = function(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
};

// clip to buffer
var clipbounds = function(image) {
  return image.clip(bufferedPolys100);
};



// Function to mask clouds using the Sentinel-2 QA band.
function maskS2clouds(image) {
  var qa = image.select('QA60');// QA = 60 meters
  var cloudBitMask = ee.Number(2).pow(10).int();
  var cirrusBitMask = ee.Number(2).pow(11).int();
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
             qa.bitwiseAnd(cirrusBitMask).eq(0));

  // Return the masked and scaled data
  return image.updateMask(mask) 
  .copyProperties(image, ["system:time_start"]);
}

// Select bands with 10 meters resolution required for cloud mask and final_band calc
var bands = [ 'B4', 'B8','QA60'];

// Select bands with 10 meters resolution
var final_bands = ['NDVI'];

// choose statistics to reduce collection by
var reducer = ee.Reducer.median()
                .combine(ee.Reducer.minMax(), null, true)
                .combine(ee.Reducer.mean(), null, true)
                .combine(ee.Reducer.percentile([5,25,75,95]), null, true)
                .combine(ee.Reducer.sum(), null, true)
                .combine(ee.Reducer.stdDev() , null, true)                


//Load Sentinel-2 TOA reflectance data
var s2 = ee.ImageCollection('COPERNICUS/S2');     
                
// Select time frame, filter using boundary and cloud masker
// Get the median values
var sr_collection = s2.filterDate('2017-01-01', '2017-12-31')
                  .filterBounds(bufferedPolys100)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 3))
                  .select(bands)
                  .map(clipbounds)
                  .map(addNDVI)
                  .map(maskS2clouds)
                  .select(final_bands)
                  .reduce(reducer)
                  .float()   //cast sum and sd from double to float
 
print(sr_collection)

var visParams = {bands: ['NDVI_median'], min: 0.3, max: 0.7,  palette: ['00FFFF', '0000FF']};
Map.addLayer(sr_collection, visParams, 'true-color composite');



// Export image
Export.image.toDrive({
   image:sr_collection,
   region:bel_geom,
   folder:"GEE",
   description:"SL_mosaic_2017_NDVI_Stats",
   scale:10,
   crs: "EPSG:4326",
   skipEmptyTiles: true,
   maxPixels:9000000000 //( pass max value if needed)
 })
 
///// CROP MASKED VERSION USING MODIS LC PRODUCT

// VIEW CROP MASK OPTIONS
var mod_lc = ee.Image("MODIS/006/MCD12Q1/2017_01_01").select('LC_Type1');
 
print(mod_lc) 
var cover_palette = [ '05450a','086a10','54a708','78d203','009900','c6b044','dcd159','dade48',
'fbff13','b6ff05','27ff87','c24f44','a5a5a5','ff6d4c','69fff8','f9ffa4','1c0dff'];

Map.addLayer(mod_lc, {min: 0, max: 17, palette: cover_palette },  'Land Cover classification2');
        
        
var crop = sr_collection.select('NDVI_mean').updateMask(mod_lc.eq(8).or(mod_lc.eq(9)).or(mod_lc.eq(10)).or(mod_lc.eq(12)) ); // mask it
Map.addLayer(crop,{},'Crops NDVI');
// RETAINING 10 GRASSLAND 12 CROP 9 SAVANA 8 WOODY SAVANA
                    

// MASK CROPS FROM TIME SERIES COLLECTION

// mask function
var mask_crop = function(image){
  return image.updateMask(mod_lc.eq(8).or(mod_lc.eq(9)).or(mod_lc.eq(10)).or(mod_lc.eq(12)) ); 
}

// Apply crop mask 

var sr_collection_MASK = s2.filterDate('2017-01-01', '2017-12-31')
                  .filterBounds(bufferedPolys100)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 3))
                  .select(bands)
                  .map(clipbounds)
                  .map(mask_crop)
                  .map(addNDVI)
                  .map(maskS2clouds)
                  .select(final_bands)
                  .reduce(reducer)
                  .float()   //cast sum and sd from double to float


// Export image
Export.image.toDrive({
   image:sr_collection_MASK,
   region:bel_geom,
   folder:"GEE",
   description:"SL_crop_mosaic_2017_NDVI_Stats",
   scale:10,
   crs: "EPSG:4326",
   skipEmptyTiles: true,
   maxPixels:9000000000 //( pass max value if needed)
 })

 