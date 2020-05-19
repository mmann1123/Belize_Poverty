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
shp = gpd.read_file("./CensusEDPreds.shp")
shp.crs.to_epsg()
shp = shp[['FIPS','fips_1','X','geometry']]

#New models
models = pd.read_csv('./CensusEDPreds_GroupCV_4_21_20.csv', index_col=0)
#%%
# exponentiate income columns
models[['Ridge_Preds','ENet_Preds','RF_Preds','XGB_Preds','Preds_Combined']] = \
        models[['Ridge_Preds','ENet_Preds','RF_Preds','XGB_Preds','Preds_Combined']].apply(np.exp,axis=1)
#%%
# merge in models
shp = shp.astype({'FIPS': 'int64'})
shp = shp.merge(models, left_on='FIPS', right_on='fips', how='left' )
shp.crs = "EPSG:32616"

shp.rename(columns={'Poor_Combined_RPR20': "RPR20", 'Poor_Combined_RPR15': "RPR15", 
                 'Poor_Combined_RPR10': "RPR10",'Poor_Combined_RPR05': "RPR05",
                 'Preds_Combined':"RPRComb"}, inplace=True, errors="raise")

shp.to_file("censusEDPreds_GroupCV.shp")

#%%
