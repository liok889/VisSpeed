
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
    this.data = [];
    for (var i=0; i<this.classNum; i++) {
        var r = Math.random() * (MAX_D-MIN_D) + MIN_D;
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

    var PADDING = 7;

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
        .attr('fill', '#69b3a2')
        .attr('stroke', 'black')
        .attr('stroke-width', 1);

    areaPath.exit().remove();
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

VisSpeedStim.prototype.computeStats = function()
{
    this.mean = 0;
    this.std = 0;
    for (var i=0, len=this.data.length; i<len; i++ ) {
        this.mean += this.data[i];
    }
    this.mean /= this.data.length;

    for (var i=0, len=this.data.length; i<len; i++ ) {
        this.std += Math.pow(this.data[i] - this.mean, 2);
    }
    this.std = Math.sqrt(this.std/(this.data.length-1));
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
        if (this.statistic=='mean') {
            if (this.stim1.mean > this.stim2.mean && this.stim1.g) {
                rect = this.stim1.g.select('rect.selector');
            }
            else if (this.stim2.g) {
                rect = this.stim2.g.select('rect.selector');
            }
        }
        else {
            if (this.stim1.std > this.stim2.std && this.stim1.g) {
                rect = this.stim1.g.select('rect.selector');
            }
            else if (this.stim2.g) {
                rect = this.stim2.g.select('rect.selector');
            }
        }
    }
    if (rect) {
        rect
            .style('stroke', 'red')
            .style('stroke-width', '6px');
    }
}
StimulusPair.prototype.optimize = function(deltaMean, deltaStd)
{
    var T_INIT = 1;
    var T_END = 0.0001;     // end temperature
    var ALPHA = 0.9;      // cooling rate
    var ITER_COUNT = 5500;  // number of iterations per temp
    var K = 2;

    var t = T_INIT;

    this.stim1 = new VisSpeedStim(this.classNum);
    this.stim2 = new VisSpeedStim(this.classNum);

    var s1 = this.stim1;
    var s2 = this.stim2;

    var solution = [s1, s2];
    var solutionDiff, _solutionDiff;

    if (deltaMean !== undefined)
    {
        this.statistic = 'mean';
        solutionDiff = Math.abs(Math.abs(s1.mean - s2.mean)-deltaMean);
        _solutionDiff = Math.abs(s1.std-s2.std);
    } else {
        this.statistic = 'std';
        solutionDiff = Math.abs(Math.abs(s1.std - s2.std)-deltaStd);
        _solutionDiff = Math.abs(s1.mean-s2.mean);
    }
    var cost = Number.MAX_VALUE;

    while (t>=T_END)
    {
        var avgDiff = 0;
        for (var iter=0; iter<ITER_COUNT; iter++)
        {

            // select stimulus to perturb
            var index = Math.random() > 0.5 ? 1 : 0;
            solution[index].perturb();

            var diff, tolerance, _diff;

            // test solution
            if (deltaMean !== undefined)
            {
                // test the mean difference between the two solutions
                var d = Math.abs(s1.mean - s2.mean);
                avgDiff += d;
                diff = Math.abs(d - deltaMean);
                _diff = Math.abs(s1.std-s2.std);
                tolernace = MEAN_TOLERANCE;
            }
            else {
                var d = Math.abs(s1.std - s2.std)
                avgDiff += d;
                diff = Math.abs(d - deltaStd);
                _diff = Math.abs(s1.mean-s2.mean);
                tolerance = STD_TOLERANCE;
            }

            var better = false;
            if (false && solutionDiff <= tolerance)
            {
                // current solution is satisfactory
                if (diff <= tolerance)
                {
                    // so is new solution
                    // see if it's worth adopting the new solution
                    cost = _diff - _solutionDiff;

                    // adopt new solution if cost on seconday measure is better
                    better = cost < 0 ? true : false;
                }
            }
            else {
                cost = diff - solutionDiff +
                    // 50 percent influence of other dimension
                    (_diff - _solutionDiff) * .5;

                if (cost <= 0) {
                    // new solution is less costly
                    better = true;
                }
                // current solution is not satisfactory
                /*
                if (diff < solutionDiff) {
                    better = true;
                }
                else {
                    cost =
                        diff - solutionDiff +
                        // 50 percent influence of other dimension
                        (_diff - _solutionDiff) * .5;
                }
                */
            }

            var e = 1/(1+Math.exp(K*cost/t));
            if (better  || Math.random() < e )
            {
                // take the new solution
                solutionDiff = diff;
                _solutionDiff = _diff;
            }
            else {
                solution[index].revert();
            }

        }
        //console.log('t: ' + t + ', solDiff: ' + (solutionDiff) + ', 2nd: ' + _solutionDiff);
        t *= ALPHA;
    }
}
