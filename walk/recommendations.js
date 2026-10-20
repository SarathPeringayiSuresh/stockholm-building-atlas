// Automatic starting-area recommendations within the bundled Stockholm coverage.
export const RECOMMENDATIONS = {
 mixed:{startId:'gamla',name:'Gamla stan & the islands',reason:'A little architecture, a little water, and green corners between the two.'},
 architecture:{startId:'gamla',name:'Gamla stan',reason:'Start among the old town’s churches, palaces and centuries of building history.'},
 nature:{startId:'djurgarden',name:'Djurgården & Östermalm',reason:'Start at Djurgårdsbron, close to island greenery, Nobelparken and the city’s parks.'},
 waterfront:{startId:'slussen',name:'Södermalm’s waterfront',reason:'Start at Slussen for waterside paths and viewpoints above the old town.'},
};
export function recommend(mood){return RECOMMENDATIONS[mood]||RECOMMENDATIONS.mixed;}
