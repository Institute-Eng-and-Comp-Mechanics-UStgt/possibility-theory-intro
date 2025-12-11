// vis.js - D3.js visualization for Possibility & Necessity Intervals

document.addEventListener('DOMContentLoaded', function () {
    // --- Configuration ---
    const chartContainerId = "#discrete-chart";
    const controlsAreaId = "#controls-area";

    const margin = VisualizationConfig.MARGIN;
    const width = VisualizationConfig.getPlotWidth();
    const height = 450 - margin.top - margin.bottom;

    const initialProbabilities = [0.1, 0.25, 0.15];
    const weatherModelLabels = ['Weather Model 1', 'Weather Model 2', 'Weather Model 3'];
    const categories = ['Rain', 'No Rain'];
    const barColors = {
        Rain: VisualizationConfig.COLORS.BLUE_BACKGROUND,
        'No Rain': VisualizationConfig.COLORS.CORAL_BACKGROUND
    };

    // --- Dimensions and Styling for Labels ---
    const barLabelFontSize = VisualizationConfig.FONT_SIZES.ANNOTATION;
    const axisTickFontSize = VisualizationConfig.FONT_SIZES.AXIS_TICK;
    const axisTitleFontSize = VisualizationConfig.FONT_SIZES.AXIS_LABEL;
    const yAxisLabelText = "\\text{P}, \\Pi, \\text{N}";
    const yAxisLabelFoWidth = 100;
    const yAxisLabelFoHeight = 25;
    const transitionDuration = VisualizationConfig.TRANSITION_DURATION;

    // Store slider elements and value displays
    const sliders = [];
    const valueDisplays = [];

    // --- Helper: Calculation Logic ---
    function getBounds(probabilities) { // Renamed for JS convention
        if (!probabilities || probabilities.length === 0) {
            return { N1: 0.0, Pi1: 1.0, N2: 0.0, Pi2: 1.0 };
        }
        const maxProbs = Math.max(...probabilities);
        const minProbs = Math.min(...probabilities);
        const complementaryProbabilities = probabilities.map(p => 1 - p);
        const maxCompProbs = Math.max(...complementaryProbabilities);
        const minCompProbs = Math.min(...complementaryProbabilities);

        let N1, Pi1, N2, Pi2; // Simplified variable names
        if (maxProbs > maxCompProbs) {
            Pi1 = 1.0; N1 = minProbs;
            Pi2 = maxCompProbs; N2 = 0.0;
        } else {
            Pi1 = maxProbs; N1 = 0.0;
            Pi2 = 1.0; N2 = minCompProbs;
        }
        return { N1, Pi1, N2, Pi2 };
    }

    // --- D3 Setup ---
    const svg = d3.select(chartContainerId).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand()
        .domain(categories)
        .range([0, width])
        .padding(0.4);

    const yScale = d3.scaleLinear().domain([0, 1]).range([height, 0]);

    // X-Axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .style("font-size", axisTickFontSize)
        .style("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif");

    // Y-Axis
    svg.append("g")
        .call(d3.axisLeft(yScale).ticks(10).tickFormat(d3.format(".1f")))
        .selectAll("text")
        .style("font-size", axisTickFontSize)
        .style("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif");

    // Y-Axis Label (KaTeX rendered)
    svg.append("foreignObject")
        .attr("width", yAxisLabelFoWidth)
        .attr("height", yAxisLabelFoHeight)
        .attr("transform", `rotate(-90) translate(${-height / 2 - yAxisLabelFoWidth / 2}, ${-margin.left + yAxisLabelFoHeight - 10})`) // Adjusted -5 to -10 for more leftward shift
        .style("pointer-events", "none")
        .append("xhtml:div")
            .attr("class", "katex-label-container")
            .style("font-size", axisTitleFontSize)
            .html(katex.renderToString(yAxisLabelText, { throwOnError: false, displayMode: false }));

    const barsGroup = svg.append("g").attr("class", "bars");
    const linesGroup = svg.append("g").attr("class", "lines");

    // Calculate initial bounds to prevent jump on load
    const initialBounds = getBounds(initialProbabilities);

    // Render initial bars with correct values
    const initialBarRenderData = [
        { category: categories[0], N: initialBounds.N1, Pi: initialBounds.Pi1, color: barColors['Rain'] },
        { category: categories[1], N: initialBounds.N2, Pi: initialBounds.Pi2, color: barColors['No Rain'] }
    ];

    barsGroup.selectAll("rect.bar-display")
        .data(initialBarRenderData, d => d.category)
        .enter().append("rect").attr("class", "bar-display")
            .attr("x", d => xScale(d.category))
            .attr("width", xScale.bandwidth())
            .attr("y", d => yScale(d.Pi))
            .attr("height", d => Math.max(0, yScale(d.N) - yScale(d.Pi)))
            .attr("fill", d => d.color)
            .attr("stroke", VisualizationConfig.COLORS.STROKE)
            .attr("stroke-width", 0.5);

    // Render initial labels
    const initialBarLabelsData = [
        { id: "pi-rain-label", barCat: categories[0], val: initialBounds.Pi1, text: `Π(${categories[0]})` },
        { id: "n-rain-label", barCat: categories[0], val: initialBounds.N1, text: `N(${categories[0]})` },
        { id: "pi-no-rain-label", barCat: categories[1], val: initialBounds.Pi2, text: `Π(${categories[1]})` },
        { id: "n-no-rain-label", barCat: categories[1], val: initialBounds.N2, text: `N(${categories[1]})` }
    ];

    barsGroup.selectAll("text.bar-dynamic-label")
        .data(initialBarLabelsData, d => d.id)
        .enter().append("text")
            .attr("class", "bar-dynamic-label")
            .style("pointer-events", "none")
            .style("text-anchor", "middle")
            .style("font-size", barLabelFontSize)
            .style("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif")
            .style("fill", VisualizationConfig.COLORS.TEXT)
            .attr("x", d => xScale(d.barCat) + xScale.bandwidth() / 2)
            .attr("y", d => yScale(d.val) - 5)
            .text(d => d.text);

    // Render initial probability lines
    const initialLineData = [];
    const probLineWidth = xScale.bandwidth() * 0.8;
    const probLineOffset = (xScale.bandwidth() - probLineWidth) / 2;
    initialProbabilities.forEach((pVal, i) => {
        initialLineData.push({ category: categories[0], yVal: pVal, id: `p-line-event-${i}` });
        initialLineData.push({ category: categories[1], yVal: 1 - pVal, id: `p-line-comp-${i}` });
    });

    linesGroup.selectAll("line.prob-line")
        .data(initialLineData, d => d.id)
        .enter().append("line").attr("class", "prob-line")
            .attr("x1", d => xScale(d.category) + probLineOffset)
            .attr("x2", d => xScale(d.category) + probLineWidth + probLineOffset)
            .attr("y1", d => yScale(d.yVal))
            .attr("y2", d => yScale(d.yVal))
            .attr("stroke", VisualizationConfig.COLORS.STROKE)
            .attr("stroke-width", 2.5);

    // --- Chart Update Function ---
    function updateChart() {
        const currentProbabilities = sliders.map(slider => parseFloat(slider.noUiSlider.get()));

        const bounds = getBounds(currentProbabilities);
        const barRenderData = [
            { category: categories[0], N: bounds.N1, Pi: bounds.Pi1, color: barColors['Rain'] },
            { category: categories[1], N: bounds.N2, Pi: bounds.Pi2, color: barColors['No Rain'] }
        ];

        barsGroup.selectAll("rect.bar-display")
            .data(barRenderData, d => d.category)
            .join(
                enter => enter.append("rect").attr("class", "bar-display")
                    .attr("x", d => xScale(d.category))
                    .attr("width", xScale.bandwidth())
                    .attr("y", d => yScale(d.Pi))
                    .attr("height", d => Math.max(0, yScale(d.N) - yScale(d.Pi)))
                    .attr("fill", d => d.color)
                    .attr("stroke", VisualizationConfig.COLORS.STROKE)
                    .attr("stroke-width", 0.5),
                update => update
                    .transition().duration(transitionDuration)
                    .attr("y", d => yScale(d.Pi))
                    .attr("height", d => Math.max(0, yScale(d.N) - yScale(d.Pi)))
            );

        const barLabelsData = [
            { id: "pi-rain-label", barCat: categories[0], val: bounds.Pi1, text: `Π(${categories[0]})` },
            { id: "n-rain-label", barCat: categories[0], val: bounds.N1, text: `N(${categories[0]})` },
            { id: "pi-no-rain-label", barCat: categories[1], val: bounds.Pi2, text: `Π(${categories[1]})` },
            { id: "n-no-rain-label", barCat: categories[1], val: bounds.N2, text: `N(${categories[1]})` }
        ];

        barsGroup.selectAll("text.bar-dynamic-label")
            .data(barLabelsData, d => d.id)
            .join(
                enter => enter.append("text")
                    .attr("class", "bar-dynamic-label")
                    .style("pointer-events", "none")
                    .style("text-anchor", "middle")
                    .style("font-size", barLabelFontSize)
                    .style("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif")
                    .style("fill", VisualizationConfig.COLORS.TEXT)
                    .attr("x", d => xScale(d.barCat) + xScale.bandwidth() / 2)
                    .attr("y", d => yScale(d.val) - 5)
                    .text(d => d.text),
                update => update
                    .transition().duration(transitionDuration)
                    .attr("y", d => yScale(d.val) - 5)
            );

        const individualLineData = [];
        const probLineWidth = xScale.bandwidth() * 0.8;
        const probLineOffset = (xScale.bandwidth() - probLineWidth) / 2;
        currentProbabilities.forEach((pVal, i) => {
            individualLineData.push({ category: categories[0], yVal: pVal, id: `p-line-event-${i}` });
            individualLineData.push({ category: categories[1], yVal: 1 - pVal, id: `p-line-comp-${i}` });
        });

        linesGroup.selectAll("line.prob-line")
            .data(individualLineData, d => d.id)
            .join(
                enter => enter.append("line").attr("class", "prob-line")
                    .attr("x1", d => xScale(d.category) + probLineOffset)
                    .attr("x2", d => xScale(d.category) + probLineWidth + probLineOffset)
                    .attr("y1", d => yScale(d.yVal))
                    .attr("y2", d => yScale(d.yVal))
                    .attr("stroke", VisualizationConfig.COLORS.STROKE)
                    .attr("stroke-width", 2.5),
                update => update
                    .transition().duration(transitionDuration)
                    .attr("y1", d => yScale(d.yVal))
                    .attr("y2", d => yScale(d.yVal)),
                exit => exit.remove()
            );
    }

    // --- Create Sliders using noUiSlider ---
    const controlsArea = d3.select(controlsAreaId);

    weatherModelLabels.forEach((label, i) => {
        const sliderContainer = controlsArea.append("div")
            .style("margin-bottom", "15px")
            .style("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif");

        sliderContainer.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("margin-bottom", "5px")
            .html(`<span style="font-size: ${VisualizationConfig.FONT_SIZES.AXIS_LABEL}; margin-right: 10px; min-width: 150px;">${label}:</span><span style="font-size: ${VisualizationConfig.FONT_SIZES.LABEL}; margin-right: 10px;">P(Rain) = </span><span class="value-display" style="font-size: ${VisualizationConfig.FONT_SIZES.LABEL}; font-weight: bold; min-width: 40px;">${initialProbabilities[i].toFixed(2)}</span>`);

        const sliderDiv = sliderContainer.append("div")
            .attr("class", `probability-slider-${i}`)
            .style("width", "100%")
            .node();

        noUiSlider.create(sliderDiv, {
            start: [initialProbabilities[i]],
            connect: [true, false],
            range: { 'min': 0, 'max': 1 },
            step: 0.01,
            tooltips: false,
            format: { to: v => v.toFixed(2), from: v => Number(v) }
        });

        // Style the slider connect bar
        const connectBar = sliderDiv.querySelector('.noUi-connect');
        if (connectBar) {
            connectBar.style.background = VisualizationConfig.COLORS.SLIDER_COLOR;
        }

        sliders.push(sliderDiv);
        valueDisplays.push(sliderContainer.select('.value-display').node());

        // Update value display and chart on slider change
        sliderDiv.noUiSlider.on('update', function (values) {
            valueDisplays[i].textContent = values[0];
            updateChart();
        });
    });

    updateChart(); // Initial render of the chart
}); 