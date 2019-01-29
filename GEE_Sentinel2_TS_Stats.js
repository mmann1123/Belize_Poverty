

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
  return image.updateMask(mask).divide(10000)
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
 

/**
// Create a mosaic of image collections
var mosaic = ee.ImageCollection([
  median.select(bands).clip(bufferedPolys100),
]).mosaic();
**/





/**
// Reduce the collection.
var extrema = collection.reduce(ee.Reducer.minMax());
print(extrema)


// Reduce the collection with a median reducer.
var median = collection.reduce(ee.Reducer.percentile([25,75])).combine();
print(median)





// Display the median image.
Map.addLayer(median,
             {bands: ['B4_percentile', 'B3_percentile', 'B2_percentile'], max: 0.3},
             'also median');

                  

// Select bands with 10 meters resolution
var bands = ['B2_percentile', 'B3_percentile', 'B4_percentile', 'B8_percentile'];

// Create a mosaic of image collections
var mosaic = ee.ImageCollection([
  median.select(bands).clip(bufferedPolys100),
]).mosaic();

// Visualize
//Map.addLayer(mosaic,  {bands: ['B8', 'B4', 'B3'], max: 0.3}, 'Median');





///////////////////   MEDIAN    //////////////////////////////

// Select time frame, filter using boundary and cloud masker
// Get the median values
var sr_collection = s2.filterDate('2017-01-01', '2017-12-31')
                  .filterBounds(bufferedPolys100)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 3))
                  .map(maskS2clouds)
                  .median()

// Select bands with 10 meters resolution
var bands = ['B2', 'B3', 'B4', 'B8'];

// Create a mosaic of image collections
var mosaic = ee.ImageCollection([
  sr_collection.select(bands).clip(bufferedPolys100),
]).mosaic();

// Visualize
Map.addLayer(mosaic,  {bands: ['B8', 'B4', 'B3'], max: 0.3}, 'Median');

 // Export image
 Export.image.toDrive({
   image:mosaic,
   folder:"GEE",
   description:"SL_mosaic_2017_median",
   scale:10,
   crs: "EPSG:4326",
   maxPixels:2000000000 //( pass max value if needed)
 })
 

/////////////////// MEAN ///////////////////////


// Select time frame, filter using boundary and cloud masker
// Get the median values
var sr_collection = s2.filterDate('2017-01-01', '2017-12-31')
                  .filterBounds(bufferedPolys100)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 3))
                  .map(maskS2clouds)
                  .mean()

// Select bands with 10 meters resolution
var bands = ['B2', 'B3', 'B4', 'B8'];

// Create a mosaic of image collections
var mosaic = ee.ImageCollection([
  sr_collection.select(bands).clip(bufferedPolys100),
]).mosaic();

// Visualize
Map.addLayer(mosaic,  {bands: ['B8', 'B4', 'B3'], max: 0.3}, 'Mean');

 // Export image
 Export.image.toDrive({
   image:mosaic,
   folder:"GEE",
   description:"SL_mosaic_2017_mean",
   scale:10,
   crs: "EPSG:4326",
   maxPixels:2000000000 //( pass max value if needed)
 })


 
/////////////////// MEAN ///////////////////////


// Select time frame, filter using boundary and cloud masker
// Get the median values
var sr_collection = s2.filterDate('2017-01-01', '2017-12-31')
                  .filterBounds(bufferedPolys100)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 3))
                  .map(maskS2clouds)
                  .mean()

// Select bands with 10 meters resolution
var bands = ['B2', 'B3', 'B4', 'B8'];

// Create a mosaic of image collections
var mosaic = ee.ImageCollection([
  sr_collection.select(bands).clip(bufferedPolys100),
]).mosaic();

// Visualize
Map.addLayer(mosaic,  {bands: ['B8', 'B4', 'B3'], max: 0.3}, 'Mean');

 // Export image
 Export.image.toDrive({
   image:mosaic,
   folder:"GEE",
   description:"SL_mosaic_2017_mean",
   scale:10,
   crs: "EPSG:4326",
   maxPixels:2000000000 //( pass max value if needed)
 })

 
/////////////////// MAX ///////////////////////


// Select time frame, filter using boundary and cloud masker
// Get the median values
var sr_collection = s2.filterDate('2017-01-01', '2017-12-31')
                  .filterBounds(bufferedPolys100)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 3))
                  .map(maskS2clouds)
                  .max()

// Select bands with 10 meters resolution
var bands = ['B2', 'B3', 'B4', 'B8'];

// Create a mosaic of image collections
var mosaic = ee.ImageCollection([
  sr_collection.select(bands).clip(bufferedPolys100),
]).mosaic();

// Visualize
Map.addLayer(mosaic,  {bands: ['B8', 'B4', 'B3'], max: 0.3}, 'Max');

 // Export image
 Export.image.toDrive({
   image:mosaic,
   folder:"GEE",
   description:"SL_mosaic_2017_max",
   scale:10,
   crs: "EPSG:4326",
   maxPixels:2000000000 //( pass max value if needed)
 })
 
 
 /////////////////// MIN ///////////////////////


// Select time frame, filter using boundary and cloud masker
// Get the median values
var sr_collection = s2.filterDate('2017-01-01', '2017-12-31')
                  .filterBounds(bufferedPolys100)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 3))
                  .map(maskS2clouds)
                  .min()

// Select bands with 10 meters resolution
var bands = ['B2', 'B3', 'B4', 'B8'];

// Create a mosaic of image collections
var mosaic = ee.ImageCollection([
  sr_collection.select(bands).clip(bufferedPolys100),
]).mosaic();

// Visualize
Map.addLayer(mosaic,  {bands: ['B8', 'B4', 'B3'], max: 0.3}, 'Min');

 // Export image
 Export.image.toDrive({
   image:mosaic,
   folder:"GEE",
   description:"SL_mosaic_2017_min",
   scale:10,
   crs: "EPSG:4326",
   maxPixels:2000000000 //( pass max value if needed)
 })
 
 
 /////////////////// SUM ///////////////////////


// Select time frame, filter using boundary and cloud masker
// Get the median values
var sr_collection = s2.filterDate('2017-01-01', '2017-12-31')
                  .filterBounds(bufferedPolys100)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 3))
                  .map(maskS2clouds)
                  .sum()

// Select bands with 10 meters resolution
var bands = ['B2', 'B3', 'B4', 'B8'];

// Create a mosaic of image collections
var mosaic = ee.ImageCollection([
  sr_collection.select(bands).clip(bufferedPolys100),
]).mosaic();

// Visualize
Map.addLayer(mosaic,  {bands: ['B8', 'B4', 'B3'], max: 0.3}, 'Sum');

 // Export image
 Export.image.toDrive({
   image:mosaic,
   folder:"GEE",
   description:"SL_mosaic_2017_sum",
   scale:10,
   crs: "EPSG:4326",
   maxPixels:2000000000 //( pass max value if needed)
 })
 
**/