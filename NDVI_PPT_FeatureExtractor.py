# -*- coding: utf-8 -*-
"""
Created on Fri Apr 12 13:32:35 2019

@author: mmann
"""

import os.path
import matplotlib.pyplot as plt
from math import ceil
import rasterio
from tsraster.calculate import calculateFeatures, features_to_array
import tsraster.prep as tr
from numpy import isnan
from glob import glob

os.chdir(r'G:\Belize\Precip')

path = r"./"

# example and output name
example = r'./precipitation_20120106.tif'
output = r'./PPT_Features.tif'
mask_out= r'../mask_belize.tif'

#%% Create mask using all rasters

with rasterio.open(example, ) as src:
        array1 = src.read()
        profile = src.profile

# loop over ndvi find all valid cells
for example in glob(r'./precipitation_*.tif'):
    with rasterio.open(example, ) as src:
        array = src.read()
        array = array + array1  # accumulate valid cells (missing is 0 right now)

# create binary mask 
array[array!=0]=1 # set binary mask
array[isnan(array)]=0 # set binary mask


# Write to tif, using the same profile as the source
with rasterio.open(mask_out, 'w', **profile) as dst:
    dst.write(array)

#%%


fc_parameters = {
    "mean": None,
    "maximum": None,
    "median":None,
    "minimum":None,
    "sum_values":None,
    "agg_linear_trend": [{"attr": 'slope', "chunk_len": 6, "f_agg": "min"},
                          {"attr": 'slope', "chunk_len": 6, "f_agg": "max"}],
    "last_location_of_maximum":None,
    "last_location_of_minimum":None,
    "longest_strike_above_mean":None,
    "longest_strike_below_mean":None,
    "count_above_mean":None,
    "count_below_mean":None,
    "mean_change":None,
    "number_cwt_peaks":[{"n": 6},{"n": 12}],
    "quantile":[{"q": 0.15},{"q": 0.05},{"q": 0.85},{"q": 0.95}],
    "ratio_beyond_r_sigma":[{"r": 2},{"r": 3}], #Ratio of values that are more than r*std(x) (so r sigma) away from the mean of x.
    "skewness":None 
}

ts_features = calculateFeatures(path, parameters=fc_parameters,
                                raster_mask = mask_out,
                                reset_df=True, tiff_output=True)


#%%

# first, get the original dimension/shape of image 
og_rasters = tr.image_to_array(path)
rows, cols, nums = og_rasters.shape


# convert df to matrix array
matrix_features = ts_features.values
num_of_layers = matrix_features.shape[1]


f2Array = matrix_features.reshape(rows, cols, num_of_layers)
print(f2Array.shape)

plt.subplots(1, 1,figsize=(10,10))
cols = 3

for i in range(0,f2Array.shape[2]):
    img = f2Array[:,:,i]
    i = i+1
    plt.subplot(ceil(f2Array.shape[2]/cols),cols,i)
    plt.imshow(img, cmap="Greys")
    plt.title(ts_features.columns[i-1])
    
    
    

with rasterio.open(example) as src:
    array = src.read()
    profile = src.profile


# Write to tif, using the same profile as the source
with rasterio.open(output, 'w', **profile) as dst:
    dst.write(array)






#---------------------------------------------------------------------

os.chdir(r'G:\Belize\NDVI')

path = r"./"

# example and output name
example = r'./NDVI_2016_10_15.tif'
output = r'./NDVI_Features.tif'
mask_out= r'../mask_belize.tif'

#%% Create mask using all rasters

with rasterio.open(example, ) as src:
        array1 = src.read()
        profile = src.profile

# loop over ndvi find all valid cells
for example in glob(r'./NDVI*.tif'):
    with rasterio.open(example, ) as src:
        array = src.read()
        array = array + array1  # accumulate valid cells (missing is 0 right now)

# create binary mask 
array[array!=0]=1 # set binary mask
array[isnan(array)]=0 # set binary mask


# Write to tif, using the same profile as the source
with rasterio.open(mask_out, 'w', **profile) as dst:
    dst.write(array)

#%%


fc_parameters = {
    "mean": None,
    "maximum": None,
    "median":None,
    "minimum":None,
    "sum_values":None,
    "agg_linear_trend": [{"attr": 'slope', "chunk_len": 6, "f_agg": "min"},
                          {"attr": 'slope', "chunk_len": 6, "f_agg": "max"}],
    "last_location_of_maximum":None,
    "last_location_of_minimum":None,
    "longest_strike_above_mean":None,
    "longest_strike_below_mean":None,
    "count_above_mean":None,
    "count_below_mean":None,
    "mean_change":None,
    "number_cwt_peaks":[{"n": 6},{"n": 12}],
    "quantile":[{"q": 0.15},{"q": 0.05},{"q": 0.85},{"q": 0.95}],
    "ratio_beyond_r_sigma":[{"r": 2},{"r": 3}], #Ratio of values that are more than r*std(x) (so r sigma) away from the mean of x.
    "skewness":None 
}

ts_features = calculateFeatures(path, parameters=fc_parameters,
                                raster_mask = mask_out,
                                reset_df=True, tiff_output=True)


#%%

# first, get the original dimension/shape of image 
og_rasters = tr.image_to_array(path)
rows, cols, nums = og_rasters.shape


# convert df to matrix array
matrix_features = ts_features.values
num_of_layers = matrix_features.shape[1]


f2Array = matrix_features.reshape(rows, cols, num_of_layers)
print(f2Array.shape)

plt.subplots(1, 1,figsize=(10,10))
cols = 3

for i in range(0,f2Array.shape[2]):
    img = f2Array[:,:,i]
    i = i+1
    plt.subplot(ceil(f2Array.shape[2]/cols),cols,i)
    plt.imshow(img, cmap="Greys")
    plt.title(ts_features.columns[i-1])
    
    
    

with rasterio.open(example) as src:
    array = src.read()
    profile = src.profile


# Write to tif, using the same profile as the source
with rasterio.open(output, 'w', **profile) as dst:
    dst.write(array)