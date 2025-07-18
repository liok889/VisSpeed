
var EASY_MEAN = 0.45;
var MEDIUM_MEAN = 0.3;

var EASY_STD = 0.3;
var MEDIUM_STD = 0.15;

var W = 175;
var H = 80;
var GAP = 100;
var PAD=25;

function plotExample(statistic, visType, easy, dontRefresh)
{
    var REFRESH_RATE = 2200;

    var refresh = !dontRefresh;
    if (statistic == 'mean') {
        d3.select('#statistic').html('<b>higher values on average</b>');
    }
    else {
        d3.select('#statistic').html('<b>more variations in its values</b>');

    }
    var svg = d3.select('svg');
    svg.selectAll("*").remove();
    var parent = svg.append('g')
        .attr('transform', 'translate(' + PAD + ',' + PAD + ')');

    var g1 = parent.append('g');
    var g2 = parent.append('g')
        .attr('transform', 'translate(' + (W+GAP) + ',0)');

    var pair = new StimulusPair(15);
    if (statistic == 'mean') {
        pair.optimize(easy ? EASY_MEAN : MEDIUM_MEAN, undefined);
    }
    else {
        pair.optimize(undefined, easy ? EASY_STD : MEDIUM_STD);
    }

    pair.plotPair(
        g1,
        g2,
        W ,H,
        visType || VisType.VIS_BARS
    );
    pair.highlightHigher();

    if (refresh) {
        setTimeout(function() {
            plotExample(statistic, visType, easy, !refresh)
        }, REFRESH_RATE);
    }
}
