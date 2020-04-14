# -*- coding: utf-8 -*-
"""
Created on Tue Apr 14 15:36:33 2020

@author: mmann
"""



import os
import geopandas as gpd
import pandas as pd
import rasterio
from glob import glob
from numpy import NaN
import numpy as np
os.chdir(r'E:\Dropbox\Belize\Writeup\Map Templates')

#Read the shapefile
shp = gpd.GeoDataFrame.from_file("./CensusEDPreds.shp")
shp = shp[['FIPS','fips_1','X','geometry']]

#New models
models = pd.read_csv('./CensusEDPreds_GroupCV.csv', index_col=0)

# exponentiate income columns
models[['Ridge_Preds','ENet_Preds','RF_Preds','XGB_Preds','Preds_Combined']].apply(np.exp,axis=1, inplace=True)

# merge in models
shp = shp.astype({'FIPS': 'int64'})
shp = shp.merge(models, left_on='FIPS', right_on='fips', how='left' )

#%%

shp.to_file("censusEDPreds_GroupCV.shp")
