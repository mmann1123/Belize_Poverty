
 

// create good quality NDVI time series from MODIS NDVI

var modis = ee.ImageCollection("MODIS/006/MOD13Q1")

var start_date = '2012-01-01';
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
   region:bel_geom,
   folder:"GEE",
   description:"MDS_mosaic_2012-2017_NDVI_Stats",
   scale:250,
   crs: "EPSG:4326",
   skipEmptyTiles: true,
   maxPixels:9000000000 //( pass max value if needed)
 })
 

////////////////////////////////////////////////////
//  MASK OUT ALL NON AGRICULTURAL AREAS 


// VIEW CROP MASK OPTIONS
var mod_lc = ee.Image("MODIS/006/MCD12Q1/2017_01_01").select('LC_Type1');
 
print(mod_lc) 
var cover_palette = [ '05450a','086a10','54a708','78d203','009900','c6b044','dcd159','dade48',
'fbff13','b6ff05','27ff87','c24f44','a5a5a5','ff6d4c','69fff8','f9ffa4','1c0dff'];

Map.addLayer(mod_lc, {min: 0, max: 17, palette: cover_palette },  'Land Cover classification2');
        
        
var crop = mod_lc.updateMask(mod_lc.eq(8).or(mod_lc.eq(9)).or(mod_lc.eq(10)).or(mod_lc.eq(12)) ); // mask it
Map.addLayer(crop,{},'Crops');
// RETAINING 10 GRASSLAND 12 CROP 9 SAVANA 8 WOODY SAVANA
                    


// MASK CROPS FROM TIME SERIES COLLECTION

// mask function
var mask_crop = function(image){
  return image.updateMask(mod_lc.eq(8).or(mod_lc.eq(9)).or(mod_lc.eq(10)).or(mod_lc.eq(12)) ); 
}

// Select time frame, filter using boundary and cloud masker
// Get the median values
var modis_collection_MASK = modis_ndvi.filterBounds(bufferedPolys100)
                      .map(clipbounds)
                      .map(mask_crop)
                      .select(final_bands)
                      .reduce(reducer)
                      .float()   //cast sum and sd from double to float


var visParams = {bands: ['NDVI_median'], min: 0.3, max: 1,  palette: ['00FFFF', '0000FF']};
Map.addLayer(modis_collection_MASK, visParams, 'NDVI Crops');

                       
 
print(modis_collection_MASK,'masked colection')

 // Export image
Export.image.toDrive({
   image:modis_collection_MASK,
   region:bel_geom,
   folder:"GEE",
   description:"MDS_cropmasked_mosaic_2012-2017_NDVI_Stats",
   scale:250,
   crs: "EPSG:4326",
   skipEmptyTiles: true,
   maxPixels:9000000000 //( pass max value if needed)
 })
 
