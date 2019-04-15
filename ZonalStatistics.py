# -*- coding: utf-8 -*-

"""
A script for calculating zonal stats using a shapefile
"""


import os
from rasterstats import zonal_stats as zs
import geopandas as gpd
import pandas as pd


#Read the shapefile
shp = gpd.GeoDataFrame.from_file("../zonal_stats/GN_Divisions.shp")


# Save the images in one folder and create
# a dictionary to read the files

dirs = {
  'fourier_sc31_mean': 'Sri_Lanka_fourier_bands/',
  'fourier_sc31_variance': 'Sri_Lanka_fourier_bands/',
  'fourier_sc51_mean': 'Sri_Lanka_fourier_bands/',
  'fourier_sc51_variance': 'Sri_Lanka_fourier_bands/',
  'fourier_sc71_mean': 'Sri_Lanka_fourier_bands/',
  'fourier_sc71_variance': 'Sri_Lanka_fourier_bands/'
}

# select stats
metrics = "sum mean std".split()

# drop geometry from shapefile to save space
shp_cols =shp.drop(['geometry'],axis=1)

# Read files
rasters = {}

for n, d in dirs.items():
        raster = (os.path.join(d, n+".tif"))
        rasters[n]= raster


# copy metrics
spfeas_stats = shp_cols.copy()

# calculate
for rast, path in rasters.items():

    stats = zs(shp, path, stats=metrics)
    new_colnames = ["{}_{}".format(rast, metric) for metric in metrics]
    df = pd.DataFrame(stats)
    df2 = df.rename(columns=dict(zip(metrics, new_colnames)))
    spfeas_stats =spfeas_stats.join(df2)

# Save
spfeas_stats.to_csv("fourier_stats_all.csv")