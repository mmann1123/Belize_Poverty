
// create good quality NDVI time series from MODIS NDVI

var modis = ee.ImageCollection("MODIS/006/MOD13Q1")

var start_date = '2017-01-01';
var end_date = '2017-12-31';

var modis_filtered = modis.filterDate(start_date,end_date) ;

print(modis_filtered,'daily')

// get quality bits
var getQABits = function(image, start, end) {
    // Compute the bits we need to extract.
    var pattern = 0;
    //var start = 0;
    //var end = 1;
    var newName = 'product_state';
    for (var i = start; i <= end; i++) {
       pattern += Math.pow(2, i);
    }
    // Return a single band image of the extracted QA bits, giving the band a new name.
    return image.select([0], [newName])
                  .bitwiseAnd(pattern)
                  .rightShift(start);
};

// A function to mask out cloudy pixels.
var maskClouds = function(image) {
    // Select the QA band.
    var QA = image.select('DetailedQA');
    // Get the internal_cloud_algorithm_flag bit.
    var internalCloud = getQABits(QA, 0, 1);
    // get the internal land flag bit
    var land = getQABits(QA, 11, 13);
    // Return an image masking out cloudy areas.
    return image.updateMask(internalCloud.eq(0)).updateMask(land.eq(1));  // 0 no clounds, 1 land
};

var modis_filtered_cm = modis_filtered.map(maskClouds);

var getndvi = function(image){
  var keepProperties = ['system:time_start', 'system:time_end'];
  return image.normalizedDifference(['sur_refl_b02', 'sur_refl_b01']).rename('NDVI').copyProperties(image,keepProperties);
}

var modis_ndvi = ee.ImageCollection(modis_filtered_cm.map(getndvi));

print(modis_ndvi, 'ndvi')
 
Map.addLayer(modis_ndvi.select('NDVI').mean(),{min: 0.2, max: 1})


/////////////////////// Belize  ///////////////////////

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
 
// clip to buffer
var clipbounds = function(image) {
  return image.clip(bufferedPolys100);
};

// Select bands with 10 meters resolution
var final_bands = ['NDVI'];

// choose statistics to reduce collection by
var reducer = ee.Reducer.median()
                .combine(ee.Reducer.minMax(), null, true)
                .combine(ee.Reducer.mean(), null, true)
                .combine(ee.Reducer.percentile([5,25,75,95]), null, true)
                .combine(ee.Reducer.sum(), null, true)
                .combine(ee.Reducer.stdDev() , null, true)                


// Select time frame, filter using boundary and cloud masker
// Get the median values
var modis_collection = modis_ndvi.filterBounds(bufferedPolys100)
                      .map(clipbounds)
                      .select(final_bands)
                      .reduce(reducer)
                      .float()   //cast sum and sd from double to float
 
print(modis_collection)

var visParams = {bands: ['NDVI_median'], min: 0.3, max: 1,  palette: ['00FFFF', '0000FF']};
Map.addLayer(modis_collection, visParams, 'NDVI');


 // Export image
Export.image.toDrive({
   image:modis_collection,
   region:bel_geom,  //requires handdrawn poly around belize
   folder:"GEE",
   description:"MDS_mosaic_2017_NDVI_Stats",
   scale:10,
   crs: "EPSG:4326",
   skipEmptyTiles: true,
   maxPixels:9000000000 //( pass max value if needed)
 })
 
 