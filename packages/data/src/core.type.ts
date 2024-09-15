import { a } from '@aws-amplify/backend';


//*****************************/
//  OpenSearch Compatible set
//  of geo spacial generics
//*****************************/
    export const  LatLon =  a
        .customType({
            lat: a.float(),
            lon: a.float(),
        });

    export const GeoSpatial = a
        .customType({
            loc: a.ref("LatLon")
        });