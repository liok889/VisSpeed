// 800 miliseconds of fixation
var FIXATION_TIME = 800;
var TRAINING = false;

const ENGAGEMENT_MEAN_DELTA = 0.7;
const ENGAGEMENT_STD_DELTA = 0.3;

function BlockController(options)
{
    this.options = options;
    this.data = [];
    this.mode = options.mode || 'mean';  // 'mean' or 'std'
    this.stepSize = options.stepSize || 0.02;
    this.minDelta = options.minDelta || 0.001;
    this.maxDelta = options.maxDelta || 1.0;
    this.initialDelta = options.initialDelta || 0.3;
    this.classNum = options.classNum || 10;

    // how many trials so far
    this.trialCount = options.trialCount || 0;
    this.trialsShown = 0;

    this.width = options.width || 100;
    this.height = options.height || 50;

    // deal with engagement checks
    this.engagementCount = options.engagementCount || 0;
    this.engagementIndices = [];
    if (this.engagementCount > 0 && this.trialCount > 0) {
        while (this.engagementIndices.length < this.engagementCount) {
            let idx = Math.floor(Math.random() * this.trialCount);
            if (!this.engagementIndices.includes(idx)) {
                this.engagementIndices.push(idx);
            }
        }
        this.engagementIndices.sort((a, b) => a - b);
    }
    this.engagementResults = { correct: 0, total: 0 };


    // User-defined callback when a placeholder is clicked
    this.onSelect = options.onSelect || function(selectedIndex) {
        console.warn("No onSelect handler defined. Selected:", selectedIndex);
    };

    this.delta = this.initialDelta;
    this.reversals = 0;
    this.lastDirection = null;

    this.stimPair = new StimulusPair(this.classNum);
    this.generateTrial();

    // add a callback to listen to keyboard event
    (function(object, _options) {
    d3.select(document)
        .on('keydown', function() {
             if (d3.event.keyCode === 13)
             {
                 // enter, advance to next trial
                 var result = object.recordSelection();
                 if (result === null) {
                     // no selection, do nothing
                 }
                 else {
                     var done = object.nextTrial(result);
                     if (done)
                     {
                         console.log('block complete');
                         if (_options.onBlockEnd) {
                             _options.onBlockEnd();
                         }
                     }
                 }
             }
        })
    })(this, options)
}

BlockController.prototype.generateTrial = function()
{
    var generationTime = Date.now();
    var delta, actualDelta, actualSecondaryDelta;

    var currentIndex = this.data.length;
    var isEngagementTrial = false;
    if (this.engagementIndices.length > 0 && this.engagementIndices[0] === currentIndex) {
        isEngagementTrial = true;
        this.engagementIndices.shift(); // remove it so it's not reused
    }

    // mode
    if (this.mode == 'mean')
    {
        delta = isEngagementTrial ? ENGAGEMENT_MEAN_DELTA : this.delta;
        this.stimPair.optimize(delta, undefined);
        if (this.stimPair.stim1.mean > this.stimPair.stim2.mean) {
            this.correct = 1;
        }
        else {
            this.correct = 2;
        }
        actualDelta = Math.abs(this.stimPair.stim1.mean-this.stimPair.stim2.mean);
        actualSecondaryDelta = Math.abs(this.stimPair.stim1.std-this.stimPair.stim2.std);

    }
    else {
        delta = isEngagementTrial ? ENGAGEMENT_STD_DELTA : this.delta;
        this.stimPair.optimize(undefined, delta);
        if (this.stimPair.stim1.std > this.stimPair.stim2.std) {
            this.correct = 1;
        }
        else {
            this.correct = 2;
        }
        actualDelta = Math.abs(this.stimPair.stim1.std-this.stimPair.stim2.std);
        actualSecondaryDelta = Math.abs(this.stimPair.stim1.mean-this.stimPair.stim2.mean);
    }

    this.curTrial = {
        mode: this.mode,
        requestedDelta: delta,
        delta: actualDelta,
        deltaSecondary: actualSecondaryDelta,
        correct: undefined,
        trialNum: this.data.length+1,
        generationTime: Date.now() - generationTime,
        isEngagement: isEngagementTrial,
        fixationTime: FIXATION_TIME
    };

    if (FIXATION_TIME)
    {
        // show cross
        d3.select("#fixationCross").style('visibility', 'visible');

        (function(_this) {
            setTimeout(function() {
                _this.showTrial();
                d3.select("#fixationCross").style('visibility', 'hidden');
            }, FIXATION_TIME);
        })(this);
    }
    else {
        this.showTrial();
    }
};
BlockController.prototype.getEngagementResults = function() {
    return this.engagementResults;
};


BlockController.prototype.nextTrial = function(isCorrect)
{
    if (!isCorrect && TRAINING)
    {
        // remove active selectors
        d3.selectAll("rect.selector")
            .style('stroke', null)
            .classed('activeSelector', false);

        // re-reveal the stimuli
        if (this.timeout !== undefined) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
        d3.selectAll(".visGroup").style('visibility', 'visible');

        this.selected = undefined;

        let correctSide = this.correct; // 1 => left, 2 => right
        let selectorId = correctSide === 1 ? '#stimulusGroup1' : '#stimulusGroup2';
        let flashes = 0;
        let self = this;

        function flash(_flashes)
        {
            var FLASH_RATE = 120;
            d3.select(selectorId).select('rect.selector')
                .classed('correctSelector', _flashes % 2 === 0);
            _flashes++;
            if (_flashes < 8) { // 3 flashes = 6 toggles
                setTimeout(function() { flash(_flashes); }, FLASH_RATE);
            }
        }
        d3.select("#enterPrompt").style('visibility', 'hidden');

        flash(flashes);
        return false;
    }

    // clear the last trial
    this.clearTrial();

    if (this.onTrialEnd) {
        this.onTrialEnd();
    }

    const oldDelta = this.delta;
    let direction;

    if (isCorrect)
    {
        // one down
        this.delta = Math.max(this.minDelta, this.delta - this.stepSize);
        direction = 'down';
    } else
    {
        // three up
        this.delta = Math.min(this.maxDelta, this.delta + 3 * this.stepSize);
        direction = 'up';
    }

    if (this.lastDirection && direction !== this.lastDirection) {
        this.reversals++;
    }

    this.lastDirection = direction;
    if (this.trialCount > 0 && this.trialsShown >= (this.trialCount + this.engagementCount))
    {
        return true; // block is complete
    }
    else {
        this.generateTrial();
        return false;
    }
};

BlockController.prototype.getStimulusPair = function() {
    return this.stimPair;
};

BlockController.prototype.getCurrentDelta = function() {
    return this.delta;
};

BlockController.prototype.getReversalCount = function() {
    return this.reversals;
};

BlockController.prototype.clearTrial = function() {
    const stim1Group = d3.select("#stimulusGroup1");
    const stim2Group = d3.select("#stimulusGroup2");

    stim1Group.selectAll("*").remove();
    stim2Group.selectAll("*").remove();
}

BlockController.prototype.showTrial = function(options)
{
    this.trialsShown++;
    this.selected = undefined;

    if (!options) { options = this.options; }

    const duration = options?.exposureTime || 0;
    const visType = options?.visType || VisType.VIS_BARS;

    this.curTrial.exposureTime = duration;
    this.curTrial.visType = visType;

    const stim1Group = d3.select("#stimulusGroup1");
    const stim2Group = d3.select("#stimulusGroup2");

    stim1Group.selectAll("*").remove();
    stim2Group.selectAll("*").remove();

    this.stimPair.plotPair(
        stim1Group,
        stim2Group,
        this.width,
        this.height,
        visType
    );

    (function(_this, _options, _stim1Group, _stim2Group, _duration)
    {

        _stim1Group.select("rect.selector")
            .on('mousedown', function()
            {
                _stim1Group.select('rect.selector')
                    .style('stroke', 'red')
                    .classed('activeSelector', true);
                _stim2Group.select('rect.selector')
                    .style('stroke', null)
                    .classed('activeSelector', false);
                _this.selected = 1;

                d3.select("#enterPrompt").style('visibility', 'visible');
            });
        _stim2Group.select("rect.selector")
            .on('mousedown', function() {
                _stim1Group.select('rect.selector')
                    .style('stroke', null)
                    .classed('activeSelector', false);
                _stim2Group.select('rect.selector')
                    .style('stroke', 'red')
                    .classed('activeSelector', true);
                _this.selected = 2;

                d3.select("#enterPrompt").style('visibility', 'visible');
            });

        if (_duration > 0)
        {
            _this.timeout = setTimeout(() => {
                /*
                _this.maskStimulus(_stim1Group, 0);
                _this.maskStimulus(_stim2Group, 1);
                */
                _this.maskStimulus();

                if (typeof _options.onStimulusHidden === 'function') {
                    options.onStimulusHidden();
                }
                _this.timeout = undefined;
            }, _options.exposureTime);
        }

    })(this, options, stim1Group, stim2Group, duration);
    this.displayTime = Date.now();

};

BlockController.prototype.recordSelection = function()
{


    if (this.selected)
    {
        d3.select("#enterPrompt").style('visibility', 'hidden');

        // remove any timeout
        if (this.timeout !== undefined) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }

        var isCorrect = this.selected == this.correct;
        if (isCorrect) {
            console.log('Correct!');
        }
        else {
            console.log('Incorrect');
        }
        this.curTrial.correct = isCorrect ? 1 : 0;
        this.curTrial.selection = this.selected == 1 ? 'left' : 'right' ;
        this.curTrial.responseTime = Date.now() - this.displayTime;

        // see if this is engagement trial or actual
        if (this.curTrial.isEngagement)
        {
            if (isCorrect) this.engagementResults.correct++;
            this.engagementResults.total++;
        } else {
            this.data.push(this.curTrial);
        }

        this.selected = undefined;

        return isCorrect;

    }
    else {
        return null;
    }
}

BlockController.prototype.maskStimulus = function()
{
    const self = this;
    const stim1Group = d3.select("#stimulusGroup1");
    const stim2Group = d3.select("#stimulusGroup2");
    stim1Group.select(".visGroup").style('visibility', 'hidden');
    stim2Group.select(".visGroup").style('visibility', 'hidden');
};


// break every k blocks
var BREAK_EVERY = 0;

function ExperimentControl(blockConfigs, svg, w, h, gap, options = {}) {
    this.svg = svg;
    this.width = w;
    this.height = h;
    this.gap = gap;

    this.data = [];
    this.blockConfigs = blockConfigs;
    this.currentIndex = -1;
    this.currentBlock = null;

    // Callbacks
    this.onBlockStart = function(index, config) {};
    this.onBlockEnd = function(index, summary) {};
    this.onExperimentEnd = function() {};
    this.onTrialStart = function() {};
    this.onTrialEnd = function() {};

    // Break settings
    this.breakEveryKBlocks = options.breakInterval ?? BREAK_EVERY; // default every 2 blocks
    this.breakMessage = options.breakMessage ?? "Take a short break!";

    // engagement checks
    this.totalEngagement = { correct: 0, total: 0 };

}


ExperimentControl.prototype.setBreakInterval = function(breakInterval) {
    this.breakEveryKBlocks = breakInterval
}

ExperimentControl.prototype.start = function() {
    var CROSS_SIZE = 10;
    var CROSS_THICKNESS = 3;

    if (this.svg) {
        d3.select("#stimulusGroup1").remove();
        d3.select("#stimulusGroup2").remove();
        d3.select("#fixationCross").remove();

        var g1 = this.svg.append('g')
            .attr('id', 'stimulusGroup1')
            .attr('transform', 'translate(0,0)');

        var g2 = this.svg.append('g')
            .attr('id', 'stimulusGroup2')
            .attr('transform', 'translate(' + (this.width + this.gap) + ',0)');

        var gFix = this.svg.append('g')
            .style('visibility', 'hidden')
            .attr('id', 'fixationCross')
            .attr('transform', 'translate(' + (this.width + this.gap / 2) + ',' + (this.height / 2) + ')');

        gFix.append('line')
            .attr('y1', -CROSS_SIZE / 2).attr('y2', CROSS_SIZE / 2)
            .style('stroke', 'black').style('stroke-width', CROSS_THICKNESS);

        gFix.append('line')
            .attr('x1', -CROSS_SIZE / 2).attr('x2', CROSS_SIZE / 2)
            .style('stroke', 'black').style('stroke-width', CROSS_THICKNESS);
    }
    this.nextBlock();
};

ExperimentControl.prototype.setOnTrialEnd = function(func) {
    this.onTrialEnd = func;
}

ExperimentControl.prototype.nextBlock = function(returnFromBreak) {

    if (!returnFromBreak) {
        this.currentIndex++;
    }

    if (this.currentIndex >= this.blockConfigs.length) {
        this.onExperimentEnd();
        return true;
    }

    // Check if we need a break (but not before the first block)
    if (
        !returnFromBreak &&
        this.breakEveryKBlocks > 0 &&
        this.currentIndex > 0 &&
        this.currentIndex % this.breakEveryKBlocks === 0
    ) {
        const remaining = this.blockConfigs.length - this.currentIndex;
        this.showBreakModal(remaining);
        return false; // stop until user resumes
    }

    if (this.onBlockStart) {
        this.onBlockStart(this.currentIndex, this.blockConfigs[this.currentIndex]);
    }

    const config = this.blockConfigs[this.currentIndex];
    const self = this;

    this.currentBlock = new BlockController({
        width: this.width,
        height: this.height,
        ...config,
        onBlockEnd: function() {
            self.storeBlockResponses();
            var done = self.nextBlock();
        }
    });
    if (this.onTrialEnd) {
        this.currentBlock.onTrialEnd = this.onTrialEnd;
    }

    return false;
};

ExperimentControl.prototype.showBreakModal = function(remainingBlocks) {
    const modal = document.getElementById("breakModal");
    const message = document.getElementById("breakMessage");
    const button = document.getElementById("continueButton");

    message.innerHTML =
        this.breakMessage +
        "<br><br>You have <b>" +
        remainingBlocks +
        "</b> blocks remaining.";

    modal.style.display = "flex";

    button.onclick = () => {
        modal.style.display = "none";
        console.log('resuming blocks');
        this.nextBlock(true); // Resume the experiment
    };
};

ExperimentControl.prototype.calculateStimulusAccuracy = function()
{
    if (!this.data || this.data.length === 0) return 0;

    const correctCount = this.data.filter(trial => trial.correct === 1).length;
    return correctCount / this.data.length;
}

ExperimentControl.prototype.storeBlockResponses = function(index) {
    var blockData = this.currentBlock.data;
    for (var i = 0; i < blockData.length; i++) {
        blockData[i].blockNum = this.currentIndex + 1;
        this.data.push(blockData[i]);
    }

    // add up engagement results for this block
    var engagement = this.currentBlock.getEngagementResults();
    this.totalEngagement.correct += engagement.correct;
    this.totalEngagement.total += engagement.total;
}

ExperimentControl.prototype.getEngagementSummary = function()
{
    var eng = this.totalEngagement;

    return {
        totalChecks: eng.total,
        correct: eng.correct,
        accuracy: eng.total > 0
            ? this.totalEngagement.correct / this.totalEngagement.total
            : null
    };
}


ExperimentControl.prototype.getData = function() {
    return this.data;
}
