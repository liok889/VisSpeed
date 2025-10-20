
var MIN_D = 0;
var MAX_D = 1;
var PETRUB = Math.abs(MAX_D-MIN_D) / 50;

const VisType = Object.freeze({
    VIS_BARS: 'bar',
    VIS_LINES: 'line',
    VIS_AREA: 'area',
    VIS_DOTS: 'dot',
});

function VisSpeedStim(classNum)
{
    this.yScale = d3.scaleLinear().domain([0, 1]).range([0, 1]);
    this.classNum = classNum;
    this.random();
}

VisSpeedStim.prototype.random = function()
{
    var D_RANGE = MAX_D-MIN_D;

    this.data = [];
    for (var i=0; i<this.classNum; i++) {
        var r = Math.random() * D_RANGE + MIN_D;
        this.data.push(r);
    }
    this.findMinMax(true);
    this.computeStats();
}

VisSpeedStim.prototype.findMinMax = function(setScale)
{
    var minD = Number.MAX_VALUE;
    var maxD = -Number.MAX_VALUE;
    for (var i=0; i<this.data.length; i++) {
        var d = this.data[i];
        minD = Math.min(minD, d);
        maxD = Math.max(maxD, d);
    }
    this.minD = minD;
    this.maxD = maxD;
    if (setScale) {
        this.setYScale(minD, maxD);
    }
    return [this.minD, this.maxD];
}

VisSpeedStim.prototype.setYScale = function(minY, maxY)
{
    this.yScale.domain([minY, maxY]);
}

VisSpeedStim.prototype.render = function(g, w, h, visType)
{
    g.selectAll('*').remove();

    var PADDING = 10;

    // render a square that is slightly larger than the vis space
    g.append('rect')
        .attr('class', 'selector')
        .style('stroke', 'black')
        .style('fill', 'white')
        .attr('x', -PADDING)
        .attr('y', -PADDING)
        .attr('width', w+PADDING*2)
        .attr('height', h+PADDING*2);

    var gg = g.append('g')
        .attr('class', 'visGroup')
        .style('pointer-events', 'none');

    switch(visType)
    {
    case VisType.VIS_BARS:
        this.renderBars(gg, w, h);
        break;
    case VisType.VIS_LINES:
        this.renderLines(gg, w, h);
        break;
    case VisType.VIS_AREA:
        this.renderArea(gg, w, h);
        break;
    case VisType.VIS_DOTS:
        this.renderDots(gg, w, h);
        break;
    }
}
VisSpeedStim.prototype.renderLines = function(g, w, h)
{
    var xScale = d3.scaleLinear()
        .domain([0, this.data.length - 1])
        .range([0, w]);

    var yScale = d3.scaleLinear()
        .domain(this.yScale.domain())  // domain already set by setYScale
        .range([h, 0]);  // SVG y is inverted: 0 is top

    var lineGen = d3.line()
        .x((d, i) => xScale(i))
        .y((d) => yScale(d))
        .curve(d3.curveLinear);  // you can try d3.curveLinear, d3.curveBasis, etc.

    var path = g.selectAll('path.curve')
        .data([this.data]);  // single path for the whole dataset

    path.enter()
        .append('path')
        .attr('class', 'curve')
        .merge(path)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', 'black')
        .attr('stroke-width', 2);

    path.exit().remove();
}

VisSpeedStim.prototype.renderArea = function(g, w, h) {
    var xScale = d3.scaleLinear()
        .domain([0, this.data.length - 1])
        .range([0, w]);

    var yScale = d3.scaleLinear()
        .domain(this.yScale.domain())  // same domain as the original
        .range([h, 0]);  // SVG y axis inverted

    var areaGen = d3.area()
        .x((d, i) => xScale(i))
        .y0(h)  // baseline (bottom of chart)
        .y1((d) => yScale(d))
        .curve(d3.curveLinear);  // or curveLinear, curveBasis, etc.

    var areaPath = g.selectAll('path.area')
        .data([this.data]);

    areaPath.enter()
        .append('path')
        .attr('class', 'area')
        .merge(areaPath)
        .attr('d', areaGen)
        .attr('fill', '#0092d1')
        .attr('stroke', 'black')
        .attr('stroke-width', 1);

    areaPath.exit().remove();
    this.renderLines(g, w, h);
};

VisSpeedStim.prototype.renderBars = function(g, w, h, gapW)
{
    var MIN_GAP = 2;
    var MAX_TOTAL_GAP_RATIO = 0.05;

    var gapCount = Math.max(0, this.classNum - 1);
    var maxTotalGap = w * MAX_TOTAL_GAP_RATIO;

    // Compute adaptive gap width
    if (gapCount === 0) {
        gapW = 0;
    } else {
        var idealGap = maxTotalGap / gapCount;
        gapW = Math.max(MIN_GAP, idealGap);
    }

    // Compute bar width using total space left after gaps
    var barW = (w - (gapCount * gapW)) / this.classNum;

    var selection = g.selectAll('rect.bar').data(this.data);
    selection = selection.enter()
        .append('rect')
        .merge(selection);

    (function(_selection, _barW, _gapW, obj) {
        _selection
            .attr('class', 'bar')
            .attr('x', function(d, i) {
                return i*(_barW+_gapW);
            })
            .attr('y', function(d) {
                var y = h*obj.yScale(d);
                return h-y;
            })
            .attr('width', _barW)
            .attr('height', function(d) {
                return h*obj.yScale(d);
            })
    })(selection, barW, gapW, this);
}

VisSpeedStim.prototype.renderDots = function(g, w, h, gapW) {
    var MIN_GAP = 2;
    var MAX_TOTAL_GAP_RATIO = 0.05;

    var gapCount = Math.max(0, this.classNum - 1);
    var maxTotalGap = w * MAX_TOTAL_GAP_RATIO;

    // Compute adaptive gap width
    if (gapCount === 0) {
        gapW = 0;
    } else {
        var idealGap = maxTotalGap / gapCount;
        gapW = Math.max(MIN_GAP, idealGap);
    }

    // Compute x-position spacing
    var dotSpacing = (w - (gapCount * gapW)) / this.classNum;

    var selection = g.selectAll('circle.dot').data(this.data);
    selection = selection.enter()
        .append('circle')
        .merge(selection);

    (function(_selection, _dotSpacing, _gapW, obj) {
        _selection
            .attr('class', 'dot')
            .attr('cx', function(d, i) {
                return i * (_dotSpacing + _gapW) + _dotSpacing / 2; // center dots
            })
            .attr('cy', function(d) {
                var y = h * obj.yScale(d);
                return h - y; // flip for SVG coordinate system
            })
            .attr('r', function() {
                return Math.max(3, _dotSpacing * 0.4); // adaptive radius (or fixed 3px)
            });
    })(selection, dotSpacing, gapW, this);
}

VisSpeedStim.prototype.perturb = function()
{
    var done = false;
    while (!done) {
        // pick a random index to pertrub
        var index = Math.floor(Math.random() * this.classNum);
        var d = this.data[index];

        // random pertrubation value
        var r =PETRUB * ((Math.random() * 2)-1);
        var newD = d + r;
        if (newD >= MIN_D && newD <= MAX_D)
        {
            this.perturbedIndex = index;
            this.originalValue = d;
            this.originalMean = this.mean;
            this.originalStd = this.std;

            this.data[index] = newD;
            done = true;

            this.computeStats();
        }
    }
}

VisSpeedStim.prototype.revert = function()
{
    if (this.perturbedIndex !== undefined)
    {
        this.data[this.perturbedIndex] = this.originalValue;
        this.perturbedIndex = undefined;
        this.mean = this.originalMean;
        this.std = this.originalStd;
    }
}

// compute OLS slope/intercept, Pearson r, R^2
function computeLinearTrend(yArray) {
    const n = yArray.length;
    if (n < 2) return null;

    // x scaled 0..1
    const xs = Array.from({length: n}, (_, i) => n === 1 ? 0 : i / (n - 1));
    const ys = yArray;

    // means
    let meanX = 0, meanY = 0;
    for (let i = 0; i < n; i++) { meanX += xs[i]; meanY += ys[i]; }
    meanX /= n; meanY /= n;

    // covariance and variance
    let covXY = 0, varX = 0, varY = 0;
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        covXY += dx * dy;
        varX += dx * dx;
        varY += dy * dy;
    }

    const slope = varX === 0 ? 0 : covXY / varX;
    const intercept = meanY - slope * meanX;
    const r = (varX === 0 || varY === 0) ? 0 : covXY / Math.sqrt(varX * varY);
    const rsq = r * r;

    return {
        slope: slope,
        intercept: intercept,
        r: r,
        rsq: rsq
    };
}

VisSpeedStim.prototype.computeStats = function()
{
    var K_DEVIATIONS = 2;

    this.mean = 0;
    this.std = 0;
    for (var i=0, len=this.data.length; i<len; i++ ) {
        this.mean += this.data[i];
    }
    this.mean /= this.data.length;

    var maxMeanDev = -Number.MAX_VALUE;
    var avgMeanDev = 0;
    var deviations = [];

    for (var i=0, len=this.data.length; i<len; i++ )
    {
        var dev = Math.abs(this.data[i] - this.mean);
        maxMeanDev = Math.max(maxMeanDev, dev);
        avgMeanDev += dev;
        deviations.push(dev);
        this.std += Math.pow(dev, 2);
    }

    // standard deviation
    this.std = Math.sqrt(this.std/(this.data.length-1));

    // adverserial mean; based on the top k outliers
    // top k deviations
    avgMeanDev /= this.data.length;
    if (K_DEVIATIONS > 1)
    {
        deviations.sort((a, b) => b-a);
        var topK = deviations.slice(0, K_DEVIATIONS).reduce((a, b) => a + b, 0);
        this.adverserialMean = (topK / K_DEVIATIONS) / this.std;
    }
    else {
        this.adverserialMean = maxMeanDev / this.std;
    }

    // compute linear trend
    var trend = computeLinearTrend(this.data);
    this.slope = trend.slope;
    this.intercept = trend.intercept;

}

function StimulusPair(classNum)
{
    this.classNum = classNum;
    this.stim1 = new VisSpeedStim(classNum);
    this.stim2 = new VisSpeedStim(classNum);
}

var MEAN_TOLERANCE = 0;
var STD_TOLERANCE = 0;

StimulusPair.prototype.plotPair = function(g1, g2, w, h, visType)
{
    var minMax1 = this.stim1.findMinMax();
    var minMax2 = this.stim2.findMinMax();
    var minMax = [Math.min(minMax1[0], minMax2[0]), Math.max(minMax1[1], minMax2[1]) ];
    this.stim1.setYScale(minMax[0], minMax[1]);
    this.stim2.setYScale(minMax[0], minMax[1]);

    this.stim1.render(g1, w, h, visType);
    this.stim2.render(g2, w, h, visType);

    this.stim1.g = g1;
    this.stim2.g = g2;
}

StimulusPair.prototype.highlightHigher = function()
{
    var rect = null;
    if (this.statistic)
    {
        var statistic1 = this.stim1[this.statistic];
        var statistic2 = this.stim2[this.statistic];
        if (statistic1 > statistic2 && this.stim1.g)
        {
            rect = this.stim1.g.select('rect.selector');
        }
        else if (this.stim2.g) {
            rect = this.stim2.g.select('rect.selector');
        }
    }

    if (rect) {
        rect
            .style('stroke', 'red')
            .style('stroke-width', '6px');
    }
}

function testLimit(value, limit) {
    if (!limit) {
        return true;
    }
    else {
        if (limit[0] === null || value >= limit[0]) {
            if (limit[1] === null || value <= limit[1]) {
                return true;
            }
        }
        return false;
    }
}

var ADV=true;
var ADVERSERIAL_PENALTY = 0.5;

function advMeanCost(s1, s2)
{
    const ADVERSERIAL_MEAN_TARGET = Math.log2(2);
    var avgRatio;
    if (s1.mean > s2.mean)
    {
        // want the lesser main-statistic stimulus to carry the adverserial cue
        advRatio = s2.adverserialMean / s1.adverserialMean;
    }
    else {
        advRatio = s1.adverserialMean / s2.adverserialMean;
    }

    // want a target ratio of about log2(ratio)=1
    // i.e., ADVERSERIAL_MEAN_TARGET x
    return Math.abs(Math.log2(advRatio)-1);
}

var OBJECTIVE_FUNCS =
{
    general: function(s1, s2, stat1, stat2, delta, adverserial) {
        var diff  = Math.abs( Math.abs(s1[stat1]-s2[stat1]) - delta );
        var diff2 = stat2 ? Math.abs(s1[stat2]-s2[stat2]) : 0;

        // cost if diff in main stat + 50% of diff second stat
        var cost = diff + diff2 * 0.5;
        var adv = adverserial ? adverserial(s1, s2) : 0;
        return cost +  adv * ADVERSERIAL_PENALTY;
    }
}

StimulusPair.prototype.optimizeEnter = function(mainStat, secondStat, delta, adverserial)
{
    // keep track of optimization time
    var optStartTime = new Date();

    var objectiveFunc = function(s1, s2)
    {
        return OBJECTIVE_FUNCS.general(s1, s2, mainStat, secondStat, delta, mainStat=='mean' && ADV ? advMeanCost : null);
    }
    var hardLimitTest = mainStat == 'slope' ?
        function(s) {
            return testLimit(s[mainStat], [0, null]);
        }
        : function() { return true };


    this.optimize(
        // combined objective function
        objectiveFunc,

        // hard limit function, only for the slope statistic (the others are naturally limited)
        hardLimitTest
    );

    this.optTime = (new Date()) - optStartTime;

    // output diagnostics
    var solDiff = Math.abs(this.stim2[mainStat]-this.stim1[mainStat]);
    var secDiff = Math.abs(this.stim2[secondStat]-this.stim1[secondStat]);
    console.log(
        's1: ' + this.stim1[mainStat].toFixed(4) + ', ' +
        's2: ' + this.stim2[mainStat].toFixed(4) + ', ' +
        'diff: ' + solDiff.toFixed(4) + ', ' +
        'req: ' + delta.toFixed(4) + ', ' +
        'secD:' + secDiff.toFixed(4)
    );
    console.log('adverserialMean: ' + this.stim1.adverserialMean + ", " + this.stim2.adverserialMean);
}


StimulusPair.prototype.optimize = function(mainObj, hardConstraint, stat)
{
    var T_INIT = 1;
    var T_END = 0.0001;     // end temperature
    var ALPHA = 0.9;        // cooling rate
    var ITER_COUNT = 5500;  // number of iterations per temp
    var K = 2;

    var t = T_INIT;

    this.stim1 = null; this.stim2 = null;
    while (!this.stim1 || !this.stim2)
    {
        this.stim1 = new VisSpeedStim(this.classNum);
        if (!hardConstraint(this.stim1)) {
            this.stim1 = null;
        }

        this.stim2 = new VisSpeedStim(this.classNum);
        if (!hardConstraint(this.stim2)) {
            this.stim2 = null;
        }
    }

    var s1 = this.stim1;
    var s2 = this.stim2;

    var solution = [s1, s2];
    var solutionDiff = mainObj(s1, s2);

    while (t>=T_END)
    {
        var avgDiff = 0;
        for (var iter=0; iter<ITER_COUNT; iter++)
        {
            // randomly select stimulus to perturb
            var index = Math.random() > 0.5 ? 1 : 0;
            var perturbDone = false;

            // pertrub until we get a new acceptable solution
            while (!perturbDone)
            {
                solution[index].perturb();
                if (!hardConstraint(solution[index])) {
                    solution[index].revert();
                } else {
                    perturbDone = true;
                }
            }

            // compute objective function
            var diff = mainObj(s1, s2);
            var tolerance = 0;

            // test if new solution is better than old
            var better = false;
            var cost = diff - solutionDiff;

            if (cost <= 0) {
                // new solution is less costly
                better = true;
            }

            var e = 1/(1+Math.exp(K*cost/t));
            if (better  || Math.random() < e )
            {
                // take the new solution
                solutionDiff = diff;
            }
            else {
                solution[index].revert();
            }

        }
        // cool
        t *= ALPHA;
    }

    // randomly swap
    if (Math.random() > 0.5) {
        var t = this.stim1;
        this.stim1=this.stim2;
        this.stim2=t;
    }
}
