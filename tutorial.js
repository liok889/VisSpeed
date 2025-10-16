
var EASY_MEAN = 0.45;
var MEDIUM_MEAN = 0.3;

var EASY_STD = 0.3;
var MEDIUM_STD = 0.15;

var EASY_SLOPE = 0.7;
var MEDIUM_SLOPE = 0.35;

var W = 200;
var H = 100;
var GAP = 100;
var PAD=25;

var REFRESH_RATE = 1900;

function plotExample(statistic, visType, easy, dontRefresh)
{

    var refresh = !dontRefresh;
    if (statistic == 'mean') {
        d3.select('#statistic').html('<b>higher values on average</b>');
    }
    else if (statistic == 'std')
    {
        d3.select('#statistic').html('<b>more variations in its values</b>');
    }
    else if (statistic == 'slope')
    {
        d3.select('#statistic').html('<b>stronger increasing trend</b>');
    }

    var svg = d3.select('svg');
    svg.selectAll("*").remove();
    var parent = svg.append('g')
        .attr('transform', 'translate(' + PAD + ',' + PAD + ')');

    var g1 = parent.append('g');
    var g2 = parent.append('g')
        .attr('transform', 'translate(' + (W+GAP) + ',0)');

    var pair = new StimulusPair(15);
    var delta;
    var secondary = SECONDARY_STAT[statistic];
    if (statistic == 'mean') {
        delta = easy ? EASY_MEAN : MEDIUM_MEAN;
    }
    else if (statistic == 'std')
    {
        delta = easy ? EASY_STD : MEDIUM_STD;
    }
    else if (statistic == 'slope')
    {
        delta = easy ? EASY_SLOPE : MEDIUM_SLOPE;
    }
    pair.optimizeEnter(statistic, secondary, delta);

    var _visType = visType;
    if (!_visType) {
        var visList = [VisType.VIS_BARS, VisType.VIS_AREA, VisType.VIS_DOTS];
        var i = Math.floor(Math.random() * visList.length);
        _visType = visList[i];
    }

    pair.plotPair(
        g1,
        g2,
        W ,H,
        _visType || VisType.VIS_BARS
    );
    pair.highlightHigher();

    if (refresh) {
        setTimeout(function() {
            plotExample(statistic, visType, easy, !refresh)
        }, REFRESH_RATE);
    }
}
