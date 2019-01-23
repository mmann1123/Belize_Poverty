# -*- coding: utf-8 -*-
"""
Spyder Editor

This is a temporary script file.
"""

import osmnx as ox
import os
import geopandas as gp

os.chdir(r'C:\Users\mmann\Google Drive\Consulting_CUER\IADB Belize\Data')

#%%  Download road network
belize_st = ox.graph_from_place("Belize",
                                network_type= 'drive',
                                retain_all=True)

# save to shapefile
ox.save_graph_shapefile(belize_st,
                        filename='Belize_street.shp')

# plot
ox.plot_graph(belize_st)

# get network statistics 
ox.stats.basic_stats(belize_st,
                     area=22970000000)  # area of belize in m2




#%%  Calculate road statistics by polygon regions 

# Read in boundary file
bl = gp.read_file( r'./Boundaries/ED_2018_IDB/ED_2018.shp')
bl = bl.to_crs({'init': 'epsg:4326'})  # has to be in lat lon to compare to OSM roads 
ax = bl.plot(figsize=(10, 10), alpha=0.5, edgecolor='k')

bl_l1 = gp.read_file( r'./Boundaries/gadm36_BLZ_1.shp')   # works with this view to compare
ax = bl_l1.plot(figsize=(10, 10), alpha=0.5, edgecolor='k')


#project to UTM so boundary area can be calculated in m^2 for stats function 
bl_UTM = bl.to_crs({'init': 'epsg:32616'})  # UTM 16N
#ax = bl.plot(figsize=(10, 10), alpha=0.5, edgecolor='k')


 
#%%

for index, row in bl.iterrows():

    # calc area in m^2    
    poly_area = bl_UTM.loc[index,'geometry'].area
    print("Polygon area at index {0} is: {1:.3f}".format(index, poly_area))
    
    # get shapely format geometry for each row
    bound = bl.loc[index, 'geometry']
    
    try:
        # download osm data for each polygon
        st_graph = ox.graph_from_polygon(bound,
                              network_type = 'drive',
                              retain_all = True)
        #view it
        #ox.plot_graph(st_graph)
    
        # calculate geometry 
        stats = ox.stats.basic_stats(G = st_graph, 
                                     area = poly_area)
        
        bl.loc[index,'street_length_total'] = stats['street_length_total']
        bl.loc[index,'street_length_avg'] = stats['street_length_avg']
        bl.loc[index,'intersection_density_km'] = stats['intersection_density_km']
        bl.loc[index,'street_density_km'] = stats['street_density_km']
        bl.loc[index,'intersection_count'] = stats['intersection_count']                                 
        bl.loc[index,'circuity_avg'] = stats['circuity_avg']                                 
    except:
        print('no roads found')
        

print(bl)                                 

# Export         
bl.to_file(r'.\Transport_stats_by_ed\ED_2018_transport.shp')
 
bl.to_file(filename = r'.\Transport_stats_by_ed\ED_2018_transport.geojson',   
           driver = 'GeoJSON')

bl1 = bl.drop(['geometry'], axis=1)
bl1.to_csv( r'.\Transport_stats_by_ed\ED_2018_transport.csv')