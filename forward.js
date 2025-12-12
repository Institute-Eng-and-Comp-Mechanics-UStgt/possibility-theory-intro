document.addEventListener('DOMContentLoaded', function () {
    // --- CONFIGURATION CONSTANTS ---
    const X_BASE_MIN = 1; // Base X range for generating y-values and transformed x-values
    const X_BASE_MAX = 5;
    const X_LEFT_PLOT_MIN = 1;    // Display range for the left plot's x-axis
    const X_LEFT_PLOT_MAX = 5;
    const X_RIGHT_PLOT_MIN = -0.5;   // Display range for the right plot's x-axis
    const X_RIGHT_PLOT_MAX = 2;      // Display range for the right plot's x-axis

    const CHART_CONTAINER_ID = "#forward-chart";
    const NUM_ANIMATION_POINTS = 51;

    // Mathematical Parameters
    const GAUSSIAN_MEAN_POSSIBILITY_FUNC = 3; // Mean for the possibilityFunction (original curve)
    const GAUSSIAN_STD_DEV = 0.5;
    const TRANSFORM_CENTER_X = 2.5;         // Center for the transformation
    const NUM_POINTS_LINE = 101;

    // Colors
    const POSSIBILITY_LINE_COLOR = VisualizationConfig.COLORS.POSSIBILITY_LINE;
    const TEXT_COLOR = VisualizationConfig.COLORS.TEXT;
    const ANIMATION_POINT_COLOR = VisualizationConfig.COLORS.ANIMATION_POINT;
    const POSSIBILITY_OUTPUT_LINE_COLOR = VisualizationConfig.COLORS.POSSIBILITY_OUTPUT_LINE;

    // Layout Dimensions
    const MARGIN = VisualizationConfig.MARGIN;
    const TOTAL_WIDTH = VisualizationConfig.FULL_WIDTH;
    const ELEMENT_SPACING = 40;
    const SINGLE_PLOT_WIDTH = (TOTAL_WIDTH - MARGIN.left - MARGIN.right - ELEMENT_SPACING) / 2;
    const PLOT_HEIGHT = 120;
    const SLIDER_HEIGHT = VisualizationConfig.SLIDER_HEIGHT;
    const SLIDER_TAG_HEIGHT = 20;
    const VERTICAL_SPACING = 10;

    const TOTAL_SVG_WIDTH = TOTAL_WIDTH;
    const TOTAL_SVG_HEIGHT = MARGIN.top + PLOT_HEIGHT + ELEMENT_SPACING + SLIDER_HEIGHT + VERTICAL_SPACING + SLIDER_TAG_HEIGHT + MARGIN.bottom;

    // --- Mathematical Helper Functions ---
    function gaussianCdf(x, mean, stdDev) {
        const z = (x - mean) / (stdDev * Math.SQRT2);
        const absZ = Math.abs(z);
        const t = 1.0 / (1.0 + 0.3275911 * absZ);
        const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
        const polynomial_term = t * (a1 + t * (a2 + t * (a3 + t * (a4 + t * a5))));
        const exp_term = Math.exp(-absZ * absZ);
        let erf_value = 1.0 - polynomial_term * exp_term;
        if (z < 0) {
            erf_value = -erf_value;
        }
        return 0.5 * (1.0 + erf_value);
    }

    function possibilityFunction(x) {
        const cdfVal = gaussianCdf(x, GAUSSIAN_MEAN_POSSIBILITY_FUNC, GAUSSIAN_STD_DEV);
        return Math.min(2 * cdfVal, 2 * (1 - cdfVal));
    }

    function generateFunctionData(func, xMin, xMax, numPoints) {
        const data = [];
        const step = (xMax - xMin) / (numPoints - 1);
        for (let i = 0; i < numPoints; i++) {
            const xVal = xMin + i * step;
            data.push({ x: xVal, y: func(xVal) });
        }
        return data;
    }
    
    const animationPointsData = [];
    const xBaseStep = (X_BASE_MAX - X_BASE_MIN) / (NUM_ANIMATION_POINTS -1);
    for (let i = 0; i < NUM_ANIMATION_POINTS; i++) {
        const baseX = X_BASE_MIN + i * xBaseStep;
        const yValue = possibilityFunction(baseX);
        animationPointsData.push({
            id: i,
            baseX: baseX,
            yValue: yValue,
            xOnLeftPlot: baseX,
            xOnRightPlot: Math.sqrt(Math.abs(baseX - TRANSFORM_CENTER_X))
        });
    }

    // --- D3 Main Setup ---
    const overallSVG = d3.select(CHART_CONTAINER_ID).append("svg")
        .attr("width", TOTAL_SVG_WIDTH)
        .attr("height", TOTAL_SVG_HEIGHT);

    const xScaleLeftPlot = d3.scaleLinear()
        .domain([X_LEFT_PLOT_MIN, X_LEFT_PLOT_MAX])
        .range([0, SINGLE_PLOT_WIDTH]);

    const xScaleRightPlot = d3.scaleLinear()
        .domain([X_RIGHT_PLOT_MIN, X_RIGHT_PLOT_MAX])
        .range([0, SINGLE_PLOT_WIDTH]);

    const yScale = d3.scaleLinear()
        .domain([0, 1])
        .range([PLOT_HEIGHT, 0]);

    // --- Left Plot (Start for animation, contains possibility curve) ---
    const leftPlotGroup = overallSVG.append("g")
        .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    leftPlotGroup.append("g").attr("class", "axis x-axis-left-plot")
        .attr("transform", `translate(0,${PLOT_HEIGHT})`)
        .call(d3.axisBottom(xScaleLeftPlot).ticks(4))
        .style("color", TEXT_COLOR);

    leftPlotGroup.append("g").attr("class", "axis y-axis-left-plot")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".1f")))
        .style("color", TEXT_COLOR);
    
    const lineGeneratorLeftPlot = d3.line()
        .x(d => xScaleLeftPlot(d.x))
        .y(d => yScale(d.y));

    leftPlotGroup.append("path")
        .datum(generateFunctionData(possibilityFunction, X_LEFT_PLOT_MIN, X_LEFT_PLOT_MAX, NUM_POINTS_LINE))
        .attr("class", "line-left-plot")
        .style("fill", "none")
        .style("stroke", POSSIBILITY_LINE_COLOR)
        .style("stroke-width", "2px")
        .attr("d", lineGeneratorLeftPlot);

    leftPlotGroup.append("text")
        .attr("x", xScaleLeftPlot(2))
        .attr("y", yScale(0.8))
        .attr("fill", POSSIBILITY_LINE_COLOR)
        .style("font-size", VisualizationConfig.FONT_SIZES.AXIS_LABEL)
        .text("π\u2093");
    
    // --- Right Plot (Target for animation) ---
    const rightPlotGroupXTranslation = MARGIN.left + SINGLE_PLOT_WIDTH + MARGIN.right + ELEMENT_SPACING;
    const rightPlotGroup = overallSVG.append("g")
        .attr("transform", `translate(${rightPlotGroupXTranslation},${MARGIN.top})`);

    rightPlotGroup.append("g").attr("class", "axis x-axis-right-plot")
        .attr("transform", `translate(0,${PLOT_HEIGHT})`)
        .call(d3.axisBottom(xScaleRightPlot).ticks(Math.ceil(X_RIGHT_PLOT_MAX - X_RIGHT_PLOT_MIN)))
        .style("color", TEXT_COLOR);

    rightPlotGroup.append("g").attr("class", "axis y-axis-right-plot")
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".1f")))
        .style("color", TEXT_COLOR);
    
    const dynamicLineOnRightPlot = rightPlotGroup.append("path")
        .attr("class", "dynamic-line-right")
        .style("fill", "none")
        .style("stroke", POSSIBILITY_OUTPUT_LINE_COLOR)
        .style("stroke-width", 2)
        .style("opacity", 0);

    const piYLabel = rightPlotGroup.append("text")
        .attr("x", xScaleRightPlot(1.3))
        .attr("y", yScale(0.8))
        .attr("fill", POSSIBILITY_OUTPUT_LINE_COLOR)
        .style("font-size", VisualizationConfig.FONT_SIZES.AXIS_LABEL)
        .style("opacity", 0)
        .text("π\u1D67");

    // --- Moving Animation Points (Single set, globally positioned) ---
    const movingPoints = overallSVG.selectAll(".anim-point")
        .data(animationPointsData, d => d.id)
        .enter().append("circle")
        .attr("class", "anim-point")
        .attr("r", 3)
        .attr("fill", ANIMATION_POINT_COLOR)
        .style("opacity", 0);

    // --- Slider UI (Below Plots) ---
    const sliderYOffset = MARGIN.top + PLOT_HEIGHT + ELEMENT_SPACING;
    const sliderWidth = TOTAL_SVG_WIDTH - MARGIN.left - MARGIN.right;

    const sliderFo = overallSVG.append("foreignObject")
        .attr("x", MARGIN.left)
        .attr("y", sliderYOffset)
        .attr("width", sliderWidth)
        .attr("height", SLIDER_HEIGHT)
        .style("overflow", "visible");

    const sliderDiv = sliderFo.append("xhtml:div")
        .attr("id", "forward-slider-fo")
        .style("width", "100%");

    // --- Slider Tag UI ---
    const sliderTagYOffset = sliderYOffset + SLIDER_HEIGHT + VERTICAL_SPACING;
    const sliderTagFo = overallSVG.append("foreignObject")
        .attr("x", MARGIN.left)
        .attr("y", sliderTagYOffset)
        .attr("width", sliderWidth)
        .attr("height", SLIDER_TAG_HEIGHT)
        .style("overflow", "visible");

    const sliderTagTextElement = sliderTagFo.append("xhtml:div")
        .style("width", "100%")
        .style("height", "100%")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "center")
        .append("xhtml:p")
        .attr("id", "slider-tag-text")
        .style("margin", "0")
        .style("font-size", VisualizationConfig.FONT_SIZES.ANNOTATION)
        .style("color", TEXT_COLOR)
        .text("");

    const sliderElement = sliderDiv.node();
    if (sliderElement) {
        noUiSlider.create(sliderElement, {
            start: [0],
            connect: [true, false],
            range: { 'min': 0, 'max': 100 },
            step: 0.1,
            tooltips: false,
            format: { to: v => v.toFixed(1), from: v => Number(v) }
        });

        // Style the slider connect bar
        const connectBar = sliderElement.querySelector('.noUi-connect');
        if (connectBar) {
            connectBar.style.background = VisualizationConfig.COLORS.SLIDER_COLOR;
        }

        const lineGeneratorForDynamicLine = d3.line()
            .x(d => xScaleRightPlot(d.xOnRightPlot))
            .y(d => yScale(d.yValue));

        const qualifyingPointsForLine = animationPointsData
            .filter(pt => pt.baseX > TRANSFORM_CENTER_X)
            .sort((a,b) => a.xOnRightPlot - b.xOnRightPlot);

        sliderElement.noUiSlider.on('update', function (values) {
            const sliderValue = parseFloat(values[0]);
            let newTagText = "";

            if (sliderValue === 0) {
                newTagText = "";
            } else if (sliderValue > 0 && sliderValue <= 25) {
                newTagText = "Sampling";
            } else if (sliderValue > 25 && sliderValue <= 75) {
                newTagText = "Forward calculation";
            } else if (sliderValue > 75 && sliderValue <= 90) {
                newTagText = "Evaluating supremum";
            } else {
                newTagText = "Done";
            }
            sliderTagTextElement.text(newTagText);

            movingPoints.each(function(d, i) {
                const point = d3.select(this);
                let currentGlobalCx, currentGlobalCy, individualPointOpacity = 0;

                if (sliderValue === 0) {
                    individualPointOpacity = 0;
                    currentGlobalCx = MARGIN.left + xScaleLeftPlot(d.xOnLeftPlot);
                    currentGlobalCy = MARGIN.top + yScale(d.yValue);
                    dynamicLineOnRightPlot.style("opacity", 0);
                    piYLabel.style("opacity", 0);
                } else if (sliderValue > 0 && sliderValue <= 25) {
                    const pointsToShow = Math.floor(sliderValue / (25 / NUM_ANIMATION_POINTS));
                    if (i < pointsToShow) individualPointOpacity = 1;
                    currentGlobalCx = MARGIN.left + xScaleLeftPlot(d.xOnLeftPlot);
                    currentGlobalCy = MARGIN.top + yScale(d.yValue);
                    dynamicLineOnRightPlot.style("opacity", 0);
                    piYLabel.style("opacity", 0);
                } else if (sliderValue > 25 && sliderValue <= 75) {
                    individualPointOpacity = 1;
                    const transitionProgress = (sliderValue - 25) / (75 - 25);
                    const startXGlobal = MARGIN.left + xScaleLeftPlot(d.xOnLeftPlot);
                    const endXGlobal = rightPlotGroupXTranslation + xScaleRightPlot(d.xOnRightPlot);
                    currentGlobalCx = startXGlobal + (endXGlobal - startXGlobal) * transitionProgress;
                    currentGlobalCy = MARGIN.top + yScale(d.yValue);
                    dynamicLineOnRightPlot.style("opacity", 0);
                    piYLabel.style("opacity", 0);
                } else if (sliderValue > 75 && sliderValue <= 90) {
                    individualPointOpacity = 1;
                    currentGlobalCx = rightPlotGroupXTranslation + xScaleRightPlot(d.xOnRightPlot);
                    currentGlobalCy = MARGIN.top + yScale(d.yValue);
                    
                    const lineProgress = (sliderValue - 75) / (90 - 75);
                    const numPointsInSegment = Math.round(lineProgress * qualifyingPointsForLine.length);
                    let currentLineData = qualifyingPointsForLine.slice(0, numPointsInSegment);

                    if (currentLineData.length > 0) { 
                        currentLineData = [{ xOnRightPlot: 0.13, yValue: 0 }, ...currentLineData];
                    }

                    if (currentLineData.length >= 2) {
                        dynamicLineOnRightPlot
                            .attr("d", lineGeneratorForDynamicLine(currentLineData))
                            .style("opacity", 1);
                        piYLabel.style("opacity", 0);
                    } else {
                        dynamicLineOnRightPlot.style("opacity", 0);
                        piYLabel.style("opacity", 0);
                    }
                } else {
                    currentGlobalCx = rightPlotGroupXTranslation + xScaleRightPlot(d.xOnRightPlot);
                    currentGlobalCy = MARGIN.top + yScale(d.yValue);
                    
                    if (qualifyingPointsForLine.length > 0) {
                         const fullLineData = [{ xOnRightPlot: 0.13, yValue: 0 }, ...qualifyingPointsForLine];
                         dynamicLineOnRightPlot
                            .attr("d", lineGeneratorForDynamicLine(fullLineData))
                            .style("opacity", 1);
                        piYLabel.style("opacity", 1);
                    } else {
                        dynamicLineOnRightPlot.style("opacity", 0);
                        piYLabel.style("opacity", 0);
                    }

                    let pointsFadeOpacity = 1 - (sliderValue - 90) / (100 - 90);
                    individualPointOpacity = Math.max(0, pointsFadeOpacity);
                }
                point.attr("cx", currentGlobalCx).attr("cy", currentGlobalCy).style("opacity", individualPointOpacity);
            });
        });
    } else {
        console.error("Slider element #forward-slider-fo not found inside foreignObject.");
    }
});
