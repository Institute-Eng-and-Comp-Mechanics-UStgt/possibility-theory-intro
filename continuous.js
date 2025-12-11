document.addEventListener('DOMContentLoaded', function () {
    // --- CONFIGURATION CONSTANTS ---
    // Mathematical Parameters
    const GAUSSIAN_MEAN = 3;
    const GAUSSIAN_STD_DEV = 0.5;
    const X_MIN = 0; // Overall data generation min (can be wider than plot)
    const X_MAX = 6; // Overall data generation max (can be wider than plot)
    const NUM_POINTS = 101;
    const X_MIN_PLOT_DISPLAY = 1; // Actual x-axis start for plots and slider
    const X_MAX_PLOT_DISPLAY = 5; // Actual x-axis end for plots and slider

    // DOM Selectors
    const CHART_CONTAINER_ID = "#continuous-chart";

    // Colors
    const COLORS = {
        MAIN_PLOT_AREA: VisualizationConfig.COLORS.BLUE_BACKGROUND,
        MAIN_PLOT_LINE: VisualizationConfig.COLORS.PROBABILITY_LINE,
        DERIVED_PLOT_LINE: VisualizationConfig.COLORS.POSSIBILITY_LINE,
        INTERVAL_AND_LABEL: VisualizationConfig.COLORS.BLUE_PRIMARY,
        TEXT_COLOR: VisualizationConfig.COLORS.TEXT,
    };

    // Layout Dimensions
    const PLOT_HEIGHT = 120;
    const TABLE_HEIGHT = 90;
    const SLIDER_HEIGHT = VisualizationConfig.SLIDER_HEIGHT;
    const ELEMENT_SPACING = 30;
    const X_AXIS_TEXT_ZONE_HEIGHT = 40;
    const MARGIN = VisualizationConfig.MARGIN;

    // Derived Layout Calculations
    const PLOT_WIDTH = VisualizationConfig.getPlotWidth();
    const Y_OFFSET_FIRST_PLOT = MARGIN.top;
    const Y_OFFSET_TABLE = Y_OFFSET_FIRST_PLOT + PLOT_HEIGHT + X_AXIS_TEXT_ZONE_HEIGHT + ELEMENT_SPACING;
    const Y_OFFSET_SLIDER = Y_OFFSET_TABLE + TABLE_HEIGHT + ELEMENT_SPACING;
    const Y_OFFSET_SECOND_PLOT = Y_OFFSET_SLIDER + SLIDER_HEIGHT + ELEMENT_SPACING;
    const TOTAL_SVG_HEIGHT = Y_OFFSET_SECOND_PLOT + PLOT_HEIGHT + X_AXIS_TEXT_ZONE_HEIGHT + MARGIN.bottom;

    // --- Mathematical Helper Functions ---
    function gaussianPdf(x, mean, stdDev) {
        return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    }

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
    
    function mainFunction(x) { // Gaussian PDF for the top plot
        return gaussianPdf(x, GAUSSIAN_MEAN, GAUSSIAN_STD_DEV);
    }

    function derivedFunction(x) { // min(2*cdf, 2*(1-cdf)) for the bottom plot
        const cdfVal = gaussianCdf(x, GAUSSIAN_MEAN, GAUSSIAN_STD_DEV);
        return Math.min(2 * cdfVal, 2 * (1 - cdfVal));
    }

    function generateFunctionData(func, xMin = X_MIN, xMax = X_MAX, numPoints = NUM_POINTS) {
        const data = [];
        const step = (xMax - xMin) / (numPoints - 1);
        for (let i = 0; i < numPoints; i++) {
            const xVal = xMin + i * step;
            data.push({ x: xVal, y: func(xVal) });
        }
        return data;
    }

    // --- D3 Helper Function for Annotations ---
    function createPlotAnnotationElements(group, baseClass, pointColor, textContent, pointRadius = 4, labelFontSize = VisualizationConfig.FONT_SIZES.ANNOTATION) {
        const marker = group.append("circle")
            .attr("class", `${baseClass}-marker`)
            .attr("r", pointRadius)
            .attr("fill", pointColor)
            .style("opacity", 0);
        const label = group.append("text")
            .attr("class", `${baseClass}-marker-label`)
            .style("font-size", labelFontSize)
            .style("opacity", 0)
            .text(textContent);
        return { marker, label };
    }

    // --- D3 Main Setup ---
    const overallSVG = d3.select(CHART_CONTAINER_ID).append("svg")
        .attr("width", PLOT_WIDTH + MARGIN.left + MARGIN.right)
        .attr("height", TOTAL_SVG_HEIGHT);

    const xScale = d3.scaleLinear().domain([X_MIN_PLOT_DISPLAY, X_MAX_PLOT_DISPLAY]).range([0, PLOT_WIDTH]);

    // --- First Plot (Top, Gaussian) ---
    const firstPlotGroup = overallSVG.append("g")
        .attr("transform", `translate(${MARGIN.left},${Y_OFFSET_FIRST_PLOT})`);

    const yScaleFirstPlot = d3.scaleLinear().domain([0, 1.1]).range([PLOT_HEIGHT, 0]);

    firstPlotGroup.append("g").attr("class", "axis x-axis-first-plot")
        .attr("transform", `translate(0,${PLOT_HEIGHT})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .style("color", COLORS.TEXT_COLOR);
    
    firstPlotGroup.append("text").attr("class", "x-axis-label-first-plot")
        .attr("transform", `translate(${PLOT_WIDTH/2}, ${PLOT_HEIGHT + X_AXIS_TEXT_ZONE_HEIGHT - 10})`)
        .style("text-anchor", "middle").style("font-size", VisualizationConfig.FONT_SIZES.AXIS_LABEL).style("fill", COLORS.TEXT_COLOR)
        .text("x");

    firstPlotGroup.append("g").attr("class", "axis y-axis-first-plot")
        .call(d3.axisLeft(yScaleFirstPlot).ticks(5).tickFormat(d3.format(".1f")))
        .style("color", COLORS.TEXT_COLOR);
    
    firstPlotGroup.append("text").attr("class", "y-axis-label-first-plot")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - MARGIN.left + 15).attr("x", 0 - (PLOT_HEIGHT / 2))
        .attr("dy", "-0.5em").style("text-anchor", "middle").style("font-size", VisualizationConfig.FONT_SIZES.AXIS_LABEL).style("fill", COLORS.TEXT_COLOR)
        .text("probability density");

    const areaGeneratorFirstPlot = d3.area()
        .x(d => xScale(d.x)).y0(yScaleFirstPlot(0)).y1(d => yScaleFirstPlot(d.y));
    const integralAreaPathFirstPlot = firstPlotGroup.append("path")
        .attr("class", "integral-area-first-plot").style("fill", COLORS.MAIN_PLOT_AREA);
    const lineGeneratorFirstPlot = d3.line()
        .x(d => xScale(d.x)).y(d => yScaleFirstPlot(d.y));
    firstPlotGroup.append("path").datum(generateFunctionData(mainFunction, X_MIN_PLOT_DISPLAY, X_MAX_PLOT_DISPLAY)) // Use plot display range for path data
        .attr("class", "line-first-plot").style("fill", "none")
        .style("stroke", COLORS.MAIN_PLOT_LINE).style("stroke-width", "2px")
        .attr("d", lineGeneratorFirstPlot);

    const xAxisIntervalHighlightFirstPlot = firstPlotGroup.append("line")
        .attr("class", "x-axis-interval-highlight-first-plot")
        .style("stroke", COLORS.INTERVAL_AND_LABEL)
        .style("stroke-width", 3);

    const intervalLabelFirstPlot = firstPlotGroup.append("text")
        .attr("class", "interval-label-first-plot")
        .style("text-anchor", "middle")
        .style("font-size", VisualizationConfig.FONT_SIZES.LABEL)
        .style("fill", COLORS.INTERVAL_AND_LABEL)
        .style("opacity", 0)
        .text("A");

    // --- Info Table (Middle, before Slider) ---
    const tableFo = overallSVG.append("foreignObject")
        .attr("x", MARGIN.left)
        .attr("y", Y_OFFSET_TABLE)
        .attr("width", PLOT_WIDTH)
        .attr("height", TABLE_HEIGHT)
        .style("overflow", "visible");

    const tableDiv = tableFo.append("xhtml:div")
        .style("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif")
        .style("font-size", "14px")
        .style("text-align", "center")
        .style("color", COLORS.TEXT_COLOR);

    const table = tableDiv.append("xhtml:table")
        .style("width", "100%")
        .style("border-collapse", "collapse");

    const a = table.append("xhtml:thead").append("xhtml:tr");
    a.append("xhtml:th").style("border", "1px solid " + COLORS.TEXT_COLOR).style("padding", "5px").style("width", "33.33%").style("background-color", VisualizationConfig.COLORS.CORAL_BACKGROUND).html("N(A)");
    a.append("xhtml:th").style("border", "1px solid " + COLORS.TEXT_COLOR).style("padding", "5px").style("width", "33.33%").style("background-color", VisualizationConfig.COLORS.BLUE_BACKGROUND).html("P(A)");
    a.append("xhtml:th").style("border", "1px solid " + COLORS.TEXT_COLOR).style("padding", "5px").style("width", "33.33%").style("background-color", VisualizationConfig.COLORS.CORAL_BACKGROUND).html("&Pi;(A)");

    const b = table.append("xhtml:tbody").append("xhtml:tr");
    const nValueCell = b.append("xhtml:td").style("border", "1px solid " + COLORS.TEXT_COLOR).style("padding", "5px").style("width", "33.33%").style("text-align", "center").style("background-color", VisualizationConfig.COLORS.CORAL_BACKGROUND).text("-");
    const pValueCell = b.append("xhtml:td").style("border", "1px solid " + COLORS.TEXT_COLOR).style("padding", "5px").style("width", "33.33%").style("text-align", "center").style("background-color", VisualizationConfig.COLORS.BLUE_BACKGROUND).text("-");
    const piValueCell = b.append("xhtml:td").style("border", "1px solid " + COLORS.TEXT_COLOR).style("padding", "5px").style("width", "33.33%").style("text-align", "center").style("background-color", VisualizationConfig.COLORS.CORAL_BACKGROUND).text("-");

    // --- Slider UI (Middle) ---
    const fo = overallSVG.append("foreignObject")
        .attr("x", MARGIN.left).attr("y", Y_OFFSET_SLIDER)
        .attr("width", PLOT_WIDTH).attr("height", SLIDER_HEIGHT)
        .style("overflow", "visible");
    const foDiv = fo.append("xhtml:div")
        .style("padding-top", "0px")
        .style("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;")
        .style("font-size", "14px");
    const sliderFoDiv = foDiv.append("xhtml:div").attr("id", "integral-slider-fo");

    // --- Second Plot (Bottom, Derived) ---
    const secondPlotGroup = overallSVG.append("g")
        .attr("transform", `translate(${MARGIN.left},${Y_OFFSET_SECOND_PLOT})`);
    const yScaleSecondPlot = d3.scaleLinear().domain([0, 1.1]).range([PLOT_HEIGHT, 0]);

    secondPlotGroup.append("g").attr("class", "axis x-axis-second-plot")
        .attr("transform", `translate(0,${PLOT_HEIGHT})`)
        .call(d3.axisBottom(xScale).ticks(5))
        .style("color", COLORS.TEXT_COLOR);
    
    secondPlotGroup.append("text").attr("class", "x-axis-label-second-plot")
        .attr("transform", `translate(${PLOT_WIDTH/2}, ${PLOT_HEIGHT + X_AXIS_TEXT_ZONE_HEIGHT - 10})`)
        .style("text-anchor", "middle").style("font-size", VisualizationConfig.FONT_SIZES.AXIS_LABEL).style("fill", COLORS.TEXT_COLOR)
        .text("x");

    secondPlotGroup.append("g").attr("class", "axis y-axis-second-plot")
        .call(d3.axisLeft(yScaleSecondPlot).ticks(5).tickFormat(d3.format(".1f")))
        .style("color", COLORS.TEXT_COLOR);
    secondPlotGroup.append("text").attr("class", "y-axis-label-second-plot")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - MARGIN.left + 15).attr("x", 0 - (PLOT_HEIGHT / 2))
        .attr("dy", "-0.5em").style("text-anchor", "middle").style("font-size", VisualizationConfig.FONT_SIZES.AXIS_LABEL).style("fill", COLORS.TEXT_COLOR)
        .text("possibility");

    const { marker: piMarker, label: piMarkerLabel } = createPlotAnnotationElements(secondPlotGroup, "pi", COLORS.TEXT_COLOR, "Π");
    const { marker: nMarker, label: nMarkerLabel } = createPlotAnnotationElements(secondPlotGroup, "n", COLORS.TEXT_COLOR, "1 - N");
    
    const leftIntervalLineSecondPlot = secondPlotGroup.append("line")
        .attr("class", "left-interval-line-second-plot").style("stroke", COLORS.TEXT_COLOR)
        .style("stroke-width", 1.5).style("stroke-dasharray", "4,2");
    const rightIntervalLineSecondPlot = secondPlotGroup.append("line")
        .attr("class", "right-interval-line-second-plot").style("stroke", COLORS.TEXT_COLOR)
        .style("stroke-width", 1.5).style("stroke-dasharray", "4,2");
    const xAxisIntervalHighlightSecondPlot = secondPlotGroup.append("line")
        .attr("class", "x-axis-interval-highlight-second-plot").style("stroke", COLORS.INTERVAL_AND_LABEL)
        .style("stroke-width", 3);

    const intervalLabelSecondPlot = secondPlotGroup.append("text")
        .attr("class", "interval-label-second-plot")
        .style("text-anchor", "middle")
        .style("font-size", VisualizationConfig.FONT_SIZES.LABEL)
        .style("fill", COLORS.INTERVAL_AND_LABEL)
        .style("opacity", 0)
        .text("A");

    const lineGeneratorSecondPlot = d3.line()
        .x(d => xScale(d.x)).y(d => yScaleSecondPlot(d.y));

    secondPlotGroup.append("path").datum(generateFunctionData(derivedFunction, X_MIN_PLOT_DISPLAY, X_MAX_PLOT_DISPLAY)) // Use plot display range for path data
        .attr("class", "line-second-plot").style("fill", "none")
        .style("stroke", COLORS.DERIVED_PLOT_LINE).style("stroke-width", "2px")
        .attr("d", lineGeneratorSecondPlot);
    
    // --- Slider Event Logic ---
    const integralSliderElementFo = sliderFoDiv.node();
    if (integralSliderElementFo) {
        noUiSlider.create(integralSliderElementFo, {
            start: [2.7, 3.8], connect: true, range: { 'min': X_MIN_PLOT_DISPLAY, 'max': X_MAX_PLOT_DISPLAY }, step: 0.01,
            tooltips: false, format: { to: v => v.toFixed(2), from: v => Number(v) }
        });

        const connectBar = integralSliderElementFo.querySelector('.noUi-connect');
        if (connectBar) {
            connectBar.style.background = VisualizationConfig.COLORS.SLIDER_COLOR;
        }

        integralSliderElementFo.noUiSlider.on('update', function (values) {
            const [xStart, xEnd] = values.map(Number);

            // --- Update First Plot (Top) ---
            const cdfStartGaussian = gaussianCdf(xStart, GAUSSIAN_MEAN, GAUSSIAN_STD_DEV);
            const cdfEndGaussian = gaussianCdf(xEnd, GAUSSIAN_MEAN, GAUSSIAN_STD_DEV);
            const probValue = cdfEndGaussian - cdfStartGaussian;
            let areaDataFirstPlot = [{ x: xStart, y: mainFunction(xStart) }];
            generateFunctionData(mainFunction, xStart, xEnd, 50).forEach(p => areaDataFirstPlot.push(p));
            areaDataFirstPlot.push({ x: xEnd, y: mainFunction(xEnd) });
            areaDataFirstPlot = areaDataFirstPlot.filter(p => p.x >= xStart && p.x <= xEnd).sort((a,b) => a.x - b.x);
            integralAreaPathFirstPlot.datum(areaDataFirstPlot).attr("d", areaGeneratorFirstPlot);

            const xMid = (xStart + xEnd) / 2;
            xAxisIntervalHighlightFirstPlot
                .attr("x1", xScale(xStart))
                .attr("y1", yScaleFirstPlot(0))
                .attr("x2", xScale(xEnd))
                .attr("y2", yScaleFirstPlot(0))
                .style("opacity", 1);
            intervalLabelFirstPlot
                .attr("x", xScale(xMid))
                .attr("y", yScaleFirstPlot(0) - 8) 
                .style("opacity", 1);

            // --- Calculate Second Plot Values (N, Pi) ---
            const valAtXStartDerived = derivedFunction(xStart);
            const valAtXEndDerived = derivedFunction(xEnd);
            let piValue, nValue, xPi, yPi, xN, yN; 

            if (xStart <= GAUSSIAN_MEAN && GAUSSIAN_MEAN <= xEnd) {
                piValue = 1.0;
                nValue = 1.0 - Math.max(valAtXStartDerived, valAtXEndDerived);
                xPi = GAUSSIAN_MEAN; yPi = 1.0;
                if (valAtXStartDerived >= valAtXEndDerived) { xN = xStart; yN = valAtXStartDerived; } 
                else { xN = xEnd; yN = valAtXEndDerived; }
            } else if (xEnd < GAUSSIAN_MEAN) {
                piValue = valAtXEndDerived; nValue = 0.0;
                xPi = xEnd; yPi = valAtXEndDerived;
            } else { // xStart > GAUSSIAN_MEAN
                piValue = valAtXStartDerived; nValue = 0.0;
                xPi = xStart; yPi = valAtXStartDerived;
            }

            if (nValueCell) nValueCell.text(nValue.toPrecision(2));
            if (pValueCell) pValueCell.text(probValue.toPrecision(2)); 
            if (piValueCell) piValueCell.text(piValue.toPrecision(2));
            
            piMarker.attr("cx", xScale(xPi)).attr("cy", yScaleSecondPlot(yPi)).style("opacity", 1);
            piMarkerLabel.attr("x", xScale(xPi) + 6).attr("y", yScaleSecondPlot(yPi) + 4).style("opacity", 1).attr("text-anchor", "start");

            if (nValue > 0) {
                nMarker.attr("cx", xScale(xN)).attr("cy", yScaleSecondPlot(yN)).style("opacity", 1);
                nMarkerLabel.attr("y", yScaleSecondPlot(yN) + 4).style("opacity", 1);
                if (xN < GAUSSIAN_MEAN) {
                    nMarkerLabel.attr("x", xScale(xN) - 6).attr("text-anchor", "end");
                } else {
                    nMarkerLabel.attr("x", xScale(xN) + 6).attr("text-anchor", "start");
                }
            } else {
                nMarker.style("opacity", 0);
                nMarkerLabel.style("opacity", 0);
            }

            leftIntervalLineSecondPlot.attr("x1", xScale(xStart)).attr("y1", yScaleSecondPlot(0))
                .attr("x2", xScale(xStart)).attr("y2", yScaleSecondPlot(valAtXStartDerived));
            rightIntervalLineSecondPlot.attr("x1", xScale(xEnd)).attr("y1", yScaleSecondPlot(0))
                .attr("x2", xScale(xEnd)).attr("y2", yScaleSecondPlot(valAtXEndDerived));
            xAxisIntervalHighlightSecondPlot.attr("x1", xScale(xStart)).attr("y1", yScaleSecondPlot(0))
                .attr("x2", xScale(xEnd)).attr("y2", yScaleSecondPlot(0))
                .style("opacity", 1); 
            intervalLabelSecondPlot
                .attr("x", xScale(xMid))
                .attr("y", yScaleSecondPlot(0) - 8)
                .style("opacity", 1);
        });
    } else {
        console.error("Slider element #integral-slider-fo not found inside foreignObject.");
    }
}); 