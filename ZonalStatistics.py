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

os.chdir(r'C:\Users\mmann\Dropbox\Belize\Geofiles\Time Series Properties')

#Read the shapefile
shp = gpd.GeoDataFrame.from_file("../ED_2018_IDB_Shapefiles/ED_2018.shp")

in_path = r'.'


#%%
# Save the images in one folder and create
# a dictionary to read the files


rasters = {}

# add files to dictionary
for entry in glob(r'./*.tif'):
    name = os.path.basename(entry).split('.')[0]
    rasters[name] = entry
    
    
# select stats
metrics = "sum mean std".split()

# drop geometry from shapefile to save space in output
shp_cols =shp.drop(['geometry'],axis=1)

 
# copy metrics
spfeas_stats = shp_cols.copy()


# calculate
for rast, path in rasters.items():

    shp = shp.to_crs(rasterio.open(path).crs)
    
    stats = zs(shp, path, stats=metrics,)
    new_colnames = ["{}_{}".format(rast, metric) for metric in metrics]
    df = pd.DataFrame(stats)
    df2 = df.rename(columns=dict(zip(metrics, new_colnames)))
    spfeas_stats =spfeas_stats.join(df2)

# Save
spfeas_stats.to_csv("./stats_all.csv")