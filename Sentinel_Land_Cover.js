
/*

function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

// Map the function over one year of data and take the median.
// Load Sentinel-2 TOA reflectance data.
var dataset = ee.ImageCollection('COPERNICUS/S2')
                  .filterDate('2017-01-01', '2017-12-30')
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                  .map(maskS2clouds);

var rgbVis = {
  min: 0.0,
  max: 0.3,
  bands: ['B4', 'B3', 'B2'],
};

Map.addLayer(dataset.median(), rgbVis, 'RGB');




var landcover3 = ee.Image('users/mmann1123/SL_land_cover_class5_NDVI');

Map.addLayer(landcover3.randomVisualizer(), {}, 'LC5');



var landcover4 = ee.Image('users/mmann1123/SL_land_cover_class4');

Map.addLayer(landcover4.randomVisualizer(), {}, 'LC4');

*/
///////////////////////////////////////////////////////////////////////////

 

// create merged feature colection 
var combined = agriculture2.merge(forest).merge(water).merge(other).merge(urban).merge(otherwet).merge(brightsoil).merge(other_bright_green)
 
 
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

// calculate ndvi 
var addNDVI = function(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
};


///////////////////////////////////////////
 
// create regression tree classification for belize
 
 
// Load Sentinel-2 TOA reflectance data.
var s2 = ee.ImageCollection('COPERNICUS/S2');

// Function to mask clouds using the Sentinel-2 QA band.
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = ee.Number(2).pow(10).int();
  var cirrusBitMask = ee.Number(2).pow(11).int();

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
             qa.bitwiseAnd(cirrusBitMask).eq(0));

  // Return the masked and scaled data.
  return image.updateMask(mask).divide(10000).copyProperties(image,["system:time_start"]);
}

// NDVI collection


// Select bands with 10 meters resolution required for cloud mask and final_band calc
var bands = [ 'B4', 'B8','QA60'];

// Select bands with 10 meters resolution
var final_bands = ['NDVI'];

// choose statistics to reduce collection by
var reducer = ee.Reducer.median()
                .combine(ee.Reducer.percentile([5,95]), null, true)
                .combine(ee.Reducer.stdDev() , null, true)                

                
// Select time frame, filter using boundary and cloud masker
// Get the median values
var NDVI_collection = s2.filterDate('2017-01-01', '2017-12-31')
                  .filterBounds(bufferedPolys100)
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 3))
                  .select(bands)
                  .map(clipbounds)
                  .map(addNDVI)
                  .map(maskS2clouds)
                  .select(final_bands)
                  .reduce(reducer)
                  .float()   //cast sum and sd from double to float



// Use monthly  composites

// Map the function over one year of data and take the median.
var collection = s2.filterDate('2017-01-01', '2017-12-31')
                  .filterBounds(bufferedPolys100)  // draw polygon for each area of interest for sampling
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                  .map(clipbounds)
                  .map(maskS2clouds)
                  .select(["B2",'B3','B4','B5','B6','B7','B8','B8A','B11','B12']);

var months = ee.List.sequence(1,24, 3).map(function(month){   //3 month steps for each 
    return collection.filter(ee.Filter.calendarRange(month,ee.Number(month).add(2),'month')).median()  // add(2) because iterating by 3 months keeping month #s correct remove add(2) if just monthly
})
print(months) // check that there are 13 bands for each month

//create on image from all these bands (stack)
var combineBands = function(image,result){  //image passed to result (which is the empty container)
  return ee.Image(result).addBands(image)
}

// empty stack to hold images
var empty = ee.Image().select()
// accumulate into an empty stack
var composite = ee.Image(months.iterate(combineBands,empty))  //ee.image to cast to image type
 

var HH = ee.Image('users/mmann1123/HH_RL_box3x3_2017');
var HV = ee.Image('users/mmann1123/HV_RL_box3x3_2017');




// merge image colections monthly with NDVI stats
 
var composite = composite.addBands(NDVI_collection).addBands(HH).addBands(HV)
print(composite, 'composite') 
 
// Overlay the points on the imagery to get training.
var training = composite.sampleRegions({
  collection: combined,
  properties: ['class'],
  scale: 20
}).randomColumn();

 
// Testing training split
print(training,'training')

var validation = training.filter(ee.Filter.lt('random',0.20))  // split to training testing
var training = training.filter(ee.Filter.gte('random',0.80))  // split to training testing

// see outputs
//print(training.size(),'size')
//print(training.reduceColumns(ee.Reducer.frequencyHistogram(), ["class"]))


// train classifier
var classifier = ee.Classifier.randomForest(20).train(training,"class",composite.bandNames()) //20 trees specify bands used
print(classifier.confusionMatrix().accuracy(),'insample accuracy') // not very useful every pixel is homogenous

// hold out validation
var holdout = validation.classify(classifier).errorMatrix('class','classification')
print(holdout.accuracy(),'outofsample accuracy')


// visualize classification to map 
var result = composite.classify(classifier)
Map.addLayer(result.randomVisualizer(),{},'classification')

// find specturally distant places
var classifier = ee.Classifier.minimumDistance('cosine').train(training,"class",composite.bandNames()) //20 trees specify bands used
print(classifier.confusionMatrix(),'confusion matrix') 

//var distance = composite.classify(classifier.setOutputMode('REGRESSION'))
//Map.addLayer(distance)

var result_smmoth =  result.reduceNeighborhood(ee.Reducer.mode(), ee.Kernel.rectangle(5,5)) 
Map.addLayer(result_smmoth.randomVisualizer(),{},'smooth classification')

// Export image 
Export.image.toDrive({
   image:result,
   region:bel_geom,
   folder:"GEE",
   description:"SL_land_cover_class6_SAR",
   scale:20,
   crs: "EPSG:4326",
   skipEmptyTiles: true,
   maxPixels:1e13 //( pass max value if needed)
 })


// Export image
Export.image.toDrive({
   image:result_smmoth,
   region:bel_geom,
   folder:"GEE",
   description:"SL_land_cover_class6_SAR_5x5",
   scale:20,
   crs: "EPSG:4326",
   skipEmptyTiles: true,
   maxPixels:1e13 //( pass max value if needed)
 })



/*
///////////////////////////////

// Make the training dataset.
var training = input.sample({
  region: bel_geom,
  scale: 30,
  numPixels: 5000
});

// Instantiate the clusterer and train it.
var clusterer = ee.Clusterer.wekaKMeans(15).train(training);

// Cluster the input using the trained clusterer.
var result = input.cluster(clusterer);

// Display the clusters with random colors.
Map.addLayer(result.randomVisualizer(), {}, 'clusters');
*/


// check which month is empty
/*Map.addLayer(ee.Image(months.get(0)), {bands: ['B3', 'B2', 'B1'], min: 0, max: 0.3});
Map.addLayer(ee.Image(months.get(1)), {bands: ['B3', 'B2', 'B1'], min: 0, max: 0.3});
Map.addLayer(ee.Image(months.get(2)), {bands: ['B3', 'B2', 'B1'], min: 0, max: 0.3});
Map.addLayer(ee.Image(months.get(3)), {bands: ['B3', 'B2', 'B1'], min: 0, max: 0.3});
Map.addLayer(ee.Image(months.get(4)), {bands: ['B3', 'B2', 'B1'], min: 0, max: 0.3});
Map.addLayer(ee.Image(months.get(5)), {bands: ['B3', 'B2', 'B1'], min: 0, max: 0.3});
*/

 