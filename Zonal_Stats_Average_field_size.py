# -*- coding: utf-8 -*-

"""
A script for calculating zonal stats using a shapefile
"""


import os
from rasterstats import zonal_stats as zs
import geopandas as gpd
import pandas as pd
import rasterio
from glob import glob
from numpy import NaN
os.chdir(r'C:\Users\mmann\Dropbox\Belize\Geofiles')

#Read the shapefile
shp = gpd.GeoDataFrame.from_file("./ED_2018_IDB_Shapefiles/ED_2018_FIPS_dissolve.shp")

bound = gpd.GeoDataFrame.from_file(r'./Field Boundaries/seg_mosaic.shp')

#%%
bound = bound.to_crs({'init': 'epsg:32616'})


#%% get union of fields and admin boundaries 

union = gpd.overlay(shp, bound, how='union')

#%% calculate area in meters 

union["area"] = union['geometry'].area 

#%% calculate the mean  parcel area by admin code 

union_stats = union.groupby([""]).agg({'area': ['min','mean','max']})

