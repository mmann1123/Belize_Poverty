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
os.chdir(r'C:\Users\mmann\Dropbox\Belize\Geofiles\Spatial Features')

#Read the shapefile
shp = gpd.GeoDataFrame.from_file("../ED_2018_IDB_Shapefiles/ED_2018.shp")

in_path = r'.'


#%% Generate FIPS code
#1 - district code based on last digit of administ_1
#2-3 - LOCALITY -> Area  anything w. rural is 12
#4-8 - ED_2018 in five digits

 
# deal with special conditions
shp['Area_clean'] = shp['Area']
shp.loc[shp.Area == 'Belize City','Area_clean'] = shp.loc[shp.Area == 'Belize City','CTV_2018']
shp['Area_clean'].map(lambda x: x.rstrip('City'))
shp.loc[shp.Area == 'Benque','Area_clean'] = 'Benque Viejo'
shp['Area_clean'].replace(['Corozal'],['Corozal Town'],inplace=True)
shp['Area_clean'].replace(['Dangriga Town'],['Dangriga'],inplace=True)
shp['Area_clean'].replace(['Orange Walk'],['Orange Walk Town'],inplace=True)
shp['Area_clean'].replace(['Belize City Northside'],['Belize City North Side'],inplace=True)
shp['Area_clean'].replace(['Belize City Southside'],['Belize City South Side'],inplace=True)
shp['Area_clean'].replace(['San_Pedro'],['San Pedro'],inplace=True)
shp['Area_clean'].replace(['Cayo Rural'],['Rural'],inplace=True)

# convert any rural to rural
shp.loc[shp.Urban_Rura == 'Rural', 'Area_clean'] = 'Rural'

# concatenate parts
shp['FIPS'] = shp['Administ_1'].str[-1] + shp['Area_clean'].replace( 
                          ['Corozal Town', 'Orange Walk Town', 'Belize City North Side', 
                          'Belize City South Side','San Pedro','Belmopan','Benque Viejo',
                          'San Ignacio','Santa Elena','Dangriga','Punta Gorda','Rural'], 
                          ['01','02','03', '04','05','06','07','08','09','10','11','12'] )+\
                          shp['ED_2018'].apply(lambda x: '{0:0>5}'.format(x))

shp.FIPS.fillna(0,inplace=True)
 

#%% merge values for  31200120

TF =  shp.FIPS != '31200120' 
shp['group'] = TF.mul(pd.Series(range(0,len(shp))), axis=0) # create unique group for all but 31200120
shp.loc[shp.FIPS == '31200120' ,'group'] =9999999
shp = shp[['group','FIPS','OBJECTID','geometry']]
shp = shp.dissolve(by='group', aggfunc='first')
shp.sort_values('OBJECTID', inplace=True)
shp.index = shp.OBJECTID
shp.drop(['OBJECTID'],axis=1,inplace=True)
 
shp.to_file("../ED_2018_IDB_Shapefiles/ED_2018_FIPS_dissolve.shp")
shp.to_file(u"R:\Engstrom_Research\GHANA\Belize\ED_2018_IDB/ED_2018_FIPS_mike_dissolve.shp")


#%% check that these match ryans FIPS 
#shp2 = gpd.GeoDataFrame.from_file(u"R:\Engstrom_Research\GHANA\Belize\ED_2018_IDB/ED_2018_FIPS.shp",  mode= 'r',encoding ='UTF-8'  )
#shp2_count = shp2.FIPS.value_counts().sort_values()
#print(shp_count.index.equals(shp_count.index))



#%%
# Save the images in one folder and create
# a dictionary to read the files


rasters = {}

# add files to dictionary
for entry in glob(r'./*/*.tif'):
    name = os.path.basename(entry).split('.')[0]
    rasters[name] = entry
    
    
# select stats
metrics = "sum mean std".split()

# drop geometry from shapefile to save space in output
shp_cols =shp.drop(['geometry'],axis=1)


# copy metrics
spfeas_stats = shp_cols.copy()
 
#%%

# calculate
for rast, path in rasters.items():
    print(rast)
    shp = shp.to_crs(rasterio.open(path).crs)
    
    stats = zs(shp, path, stats=metrics,all_touched=True,nodata=-9999)
    new_colnames = ["{}_{}".format(rast, metric) for metric in metrics]
    df = pd.DataFrame(stats)
    df.rename(columns=dict(zip(metrics, new_colnames)),inplace=True)
    spfeas_stats =spfeas_stats.join(df)

# Save
spfeas_stats.to_csv("./spfeas_stats_all.csv")



#%%
spfeas_stats.head()



#%%
