// 800 miliseconds of fixation
var FIXATION_TIME = 800;
var FIXATION_TIME_RAND = 300;

// training mode (provdies feedback)
var TRAINING = false;

// overrides exposure time
var INDEFINITE_EXPOSURE = false;

// difficulty parameters for engagement checks
const ENGAGEMENT_DELTA = {
    mean: 0.7,
    std: 0.35,
    slope: 0.8
};

// secondary statistic to optimize
const SECONDARY_STAT = {
    mean: 'std',
    std: 'mean',
    slope: 'mean',
};

// staircase parameters
const STAIRCASE = {
    mean: {initialDelta: 0.25, stepSize: 0.025, minDelta: 0.00001, maxDelta: 0.95},
    std: {initialDelta: 0.15, stepSize: 0.0125, minDelta: 0.00001, maxDelta: 0.5},
    slope: {initialDelta: 0.4, stepSize: 0.025, minDelta: 0.00001, maxDelta: 1.0}
};

// whether to include adversarial trials
// (proprtion of trials generated as adversarial)
var ADVERSARIAL_RATIO = 0.5;


// audio feedback (per trial)
const SOUND_FEEDBACK = false;
var audioCorrect, audioIncorrect;
if (SOUND_FEEDBACK)
{
    audioCorrect = new Audio('sound_correct.wav');
    audioIncorrect = new Audio('sound_error.wav');
}

function BlockController(options)
{
    this.options = options;
    this.data = [];
    this.mode = options.mode || 'mean';  // 'mean' or 'std'
    this.initialDelta = options.initialDelta || STAIRCASE[this.mode].initialDelta;
    this.stepSize = options.stepSize || STAIRCASE[this.mode].stepSize;
    this.minDelta = options.minDelta || STAIRCASE[this.mode].minDelta;
    this.maxDelta = options.maxDelta || STAIRCASE[this.mode].maxDelta;
    this.classNum = options.classNum || 10;

    // how many trials so far
    this.trialCount = (options.trialCount || 0);
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

    // deal with adversarial trials
    this.adversarialTrials = [];
    this.advCount = TRAINING ? 0 : Math.floor(ADVERSARIAL_RATIO * this.trialCount);
    for (var i=0; i<this.trialCount; i++) {
        this.adversarialTrials.push(i<this.advCount ? 1 : 0);
    }

    // shuffle the position of adversarial trials
    shuffle(this.adversarialTrials);

    // ensure that first trial is not adversarial
    while (this.adversarialTrials[0] == 1) {
        this.adversarialTrials.shift();
        this.adversarialTrials.push(1);
    }

    // User-defined callback when a placeholder is clicked
    this.onSelect = options.onSelect || function(selectedIndex) {
        console.warn("No onSelect handler defined. Selected:", selectedIndex);
    };

    this.delta = this.initialDelta;
    this.deltaAdversarial = this.initialDelta;

    this.reversals = 0;
    this.lastDirection = null;

    this.stimPair = new StimulusPair(this.classNum);
    this.generateTrial();

    // add a callback to listen to keyboard event
    (function(_this, _options) {
    d3.select(document)
        .on('keydown', function() {
             if (d3.event.keyCode == 32 || d3.event.keyCode === 13)
             {
                 // enter, advance to next trial
                 var result = _this.recordSelection();
                 if (result === null) {
                     // no selection, do nothing
                 }
                 else {
                     var done = _this.nextTrial(result);
                     if (done)
                     {
                         console.log('block complete');
                         if (_options.onBlockEnd) {
                             _options.onBlockEnd();
                         }
                     }
                 }
             }
             else {
                 if (d3.event.keyCode == 37 || d3.event.keyCode == 65) {
                     // select left
                     _this.select('left');
                }
                else if (d3.event.keyCode == 39 || d3.event.keyCode == 68) {
                    // select right
                    _this.select('right');
                }
             }
        });
    })(this, options)
}

BlockController.prototype.generateTrial = function()
{
    var generationTime = Date.now();
    var actualDelta, actualSecondaryDelta;

    var currentIndex = this.data.length;
    var isEngagementTrial = false;
    var isAdversarial = false;

    if (this.engagementIndices.length > 0 && this.engagementIndices[0] === currentIndex) {
        isEngagementTrial = true;
        this.engagementIndices.shift(); // remove it so it's not reused
    }
    else {
        // look up whether this trial is adversarial
        isAdversarial = this.adversarialTrials[this.data.length];
    }

    var delta;
    if (isEngagementTrial || this.data.length == 0) {
        delta = ENGAGEMENT_DELTA[this.mode];
    }
    else if (isAdversarial) {
        delta = this.deltaAdversarial;
    }
    else {
        delta = this.delta;
    }
    var primary= this.mode;
    var secondary = SECONDARY_STAT[this.mode];

    this.stimPair.optimizeEnter(primary, secondary, delta, isAdversarial);
    if (this.stimPair.stim1[primary] > this.stimPair.stim2[primary]) {
        this.correct = 1;
    }
    else {
        this.correct = 2;
    }
    actualDelta = Math.abs(this.stimPair.stim1[primary]-this.stimPair.stim2[primary]);
    actualSecondaryDelta = Math.abs(this.stimPair.stim1[secondary]-this.stimPair.stim2[secondary]);

    this.curTrial = {
        classNum: this.classNum,
        mode: this.mode,
        requestedDelta: delta,
        delta: actualDelta,
        deltaSecondary: actualSecondaryDelta,
        correct: undefined,
        trialNum: this.data.length+1,
        adversarial: isAdversarial ? 1 : 0,
        generationTime: Date.now() - generationTime,
        isEngagement: isEngagementTrial,
        fixationTime: FIXATION_TIME,

        // include statistics and raw data
        mean1: this.stimPair.stim1.mean,
        mean2: this.stimPair.stim2.mean,
        std1: this.stimPair.stim1.std,
        std2: this.stimPair.stim2.std,
        slope1: this.stimPair.stim1.slope,
        slope2: this.stimPair.stim2.slope,
        intercept1: this.stimPair.stim1.intercept,
        intercept2: this.stimPair.stim2.intercept,

        // record adversarial
        adv1: isAdversarial ? this.stimPair.stim1['adv_' + this.mode] : 0.0,
        adv2: isAdversarial ? this.stimPair.stim2['adv_' + this.mode] : 0.0,

        data1: this.stimPair.stim1.data,
        data2: this.stimPair.stim2.data,
    };

    if (FIXATION_TIME)
    {
        // show cross
        this.showFixationCross(true);

        var optTime = this.stimPair.optTime;

        if (isNaN(optTime)) {
            optTime = 0;
        }

        // account for optimization time as part of fixation time
        // fixation time = base + random 0-300ms to prevent anticipation
        // subtract optimization time from this
        var fixationTime =
            Math.floor(.5 + FIXATION_TIME + Math.random()*FIXATION_TIME_RAND) - optTime;

        if (fixationTime <= 0)
        {
            fixationTime = 0;
            this.curTrial.fixationTime = optTime;
        }
        else {
            this.curTrial.fixationTime = fixationTime + optTime;
        }

        (function(_this) {
            setTimeout(function() {
                _this.showFixationCross(false);
                _this.showTrial();
            }, fixationTime);
        })(this);
    }
    else {
        this.showTrial();
    }
};

BlockController.prototype.showFixationCross = function(show)
{
    // show cross
    d3.select("#fixationCross").style('visibility', show ? 'visible' : 'hidden');
}

BlockController.prototype.getEngagementResults = function() {
    return this.engagementResults;
};

BlockController.prototype.nextTrial = function(isCorrect)
{
    if (!isCorrect && TRAINING)
    {
        if (SOUND_FEEDBACK) {
            audioIncorrect.play();
        }
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

        let correctSide = this.correct;
        // 1 => left, 2 => right
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

    const isAdversarial = this.curTrial.adversarial;
    const oldDelta = isAdversarial ? this.deltaAdversarial : this.delta;
    var newDelta;

    let direction;
    if (isCorrect)
    {
        // one down
        newDelta = Math.max(this.minDelta, oldDelta - this.stepSize);
        direction = 'down';
    } else
    {
        // two up
        newDelta = Math.min(this.maxDelta, oldDelta + 2 * this.stepSize);
        direction = 'up';
    }
    if (isAdversarial) {
        this.deltaAdversarial = newDelta;
    }
    else {
        this.delta = newDelta;
    }

    if (this.lastDirection && direction !== this.lastDirection) {
        this.reversals++;
    }
    this.lastDirection = direction;


    // play sound
    if (SOUND_FEEDBACK) {
        if (isCorrect) audioCorrect.play(); else audioIncorrect.play();
    }

    if (this.trialCount > 0 && this.trialsShown >= (this.trialCount + this.engagementCount))
    {
        return true; // block is complete
    }
    else {
        (function(_this)
        {
            if (FIXATION_TIME) {
                _this.showFixationCross(true);
            }

            // minimial timeout just to allow the screen to update
            setTimeout(function()
            {
                _this.generateTrial();
            }, 10);
        })(this)
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

BlockController.prototype.select = function(which)
{
    const stim1Group = d3.select("#stimulusGroup1");
    const stim2Group = d3.select("#stimulusGroup2");

    if (which == 'left' || which == 1)
    {
        stim1Group.select('rect.selector')
            .style('stroke', 'red')
            .classed('activeSelector', true);
        stim2Group.select('rect.selector')
            .style('stroke', null)
            .classed('activeSelector', false);
        this.selected = 1;
        d3.select("#enterPrompt").style('visibility', 'visible');

    }
    else if (which == 'right' || which == 2)
    {
        stim1Group.select('rect.selector')
            .style('stroke', null)
            .classed('activeSelector', false);
        stim2Group.select('rect.selector')
            .style('stroke', 'red')
            .classed('activeSelector', true);
        this.selected = 2;
        d3.select("#enterPrompt").style('visibility', 'visible');
    }
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
                _this.select('left');
            });
        _stim2Group.select("rect.selector")
            .on('mousedown', function() {
                _this.select('right');
            });

        if (_duration > 0 && !INDEFINITE_EXPOSURE)
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
        /*
        if (isCorrect) {
            console.log('Correct!');
        }
        else {
            console.log('Incorrect');
        }
        */
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
    this.breakEveryKBlocks = options.breakInterval ?? 0; // default every 0 blocks
    this.breakMessage = options.breakMessage ?? "Take a short break!";

    // engagement checks
    this.totalEngagement = { correct: 0, total: 0 };

}


ExperimentControl.prototype.setBreakInterval = function(breakInterval) {
    this.breakEveryKBlocks = breakInterval
}

ExperimentControl.prototype.start = function() {
    var CROSS_SIZE = 20;
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

ExperimentControl.prototype.showBreakModal = function(remainingBlocks, ) {
    const modal = document.getElementById("breakModal");
    const message = document.getElementById("breakMessage");
    const button = document.getElementById("continueButton");

    /*
    message.innerHTML =
        //this.breakMessage +
        "<br>You have <b>" +
        remainingBlocks +
        "</b> blocks remaining.";
    */

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

ExperimentControl.prototype.storeBlockResponses = function(index)
{
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

function shuffle(array) {
	var i, j;
	for (i = array.length - 1; i > 0; i--) {
		j = Math.floor(Math.random() * (i + 1));
		var temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
	return array;   // returns the same reference for convenience
}
