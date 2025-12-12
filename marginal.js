document.addEventListener('DOMContentLoaded', function () {
    // ============================================================================
    // CONFIGURATION CONSTANTS
    // ============================================================================

    // DOM Selector
    const CHART_CONTAINER_ID = "#marginal-chart";

    // Layout Dimensions
    const CENTER_PLOT_SIZE = 300;           // Square heatmap
    const SIDE_PLOT_WIDTH = 120;            // Left/right marginal plots
    const TOP_BOTTOM_HEIGHT = 120;          // Top/bottom marginal plots
    const PLOT_SPACING = 40;                // Gap between plots
    const SELECTOR_HEIGHT = 40;             // Copula toggle height
    const SELECTOR_SPACING = 20;            // Space below selector
    const FORWARD_PLOT_HEIGHT = 120;        // Forward propagation plot height
    const FORWARD_PLOT_SPACING = 40;        // Space above forward plot
    const MARGIN = VisualizationConfig.MARGIN;

    // Grid Resolution for 2D Heatmap
    const GRID_SIZE = 100;                  // 100x100 = 10000 cells

    // Drag Handle
    const HANDLE_RADIUS = 7;                // Visual size of handle
    const HANDLE_HITBOX_RADIUS = 15;        // Larger hitbox for easier clicking
    const MIN_SEPARATION = 0.0;             // Minimum distance between triangle points (0 allows singletons)

    // Colors
    const COLORS = {
        INPUT_MARGINAL: VisualizationConfig.COLORS.POSSIBILITY_LINE,        // Orange
        OUTPUT_MARGINAL: VisualizationConfig.COLORS.BLUE_PRIMARY,           // Blue (marginals)
        FORWARD_PROPAGATION: VisualizationConfig.COLORS.POSSIBILITY_OUTPUT_LINE, // Green (z = x+y)
        COMPARISON_OVERLAY: "rgba(128, 128, 128, 0.5)",                     // Light gray
        HANDLE_BASE: VisualizationConfig.COLORS.POSSIBILITY_LINE,           // Orange
        HANDLE_PEAK: VisualizationConfig.COLORS.POSSIBILITY_LINE,           // Orange
        HIGHLIGHT_POINTS: VisualizationConfig.COLORS.POSSIBILITY_OUTPUT_LINE, // Green
        AXIS_COLOR: VisualizationConfig.COLORS.STROKE,
        TEXT_COLOR: VisualizationConfig.COLORS.TEXT,
    };

    // Total SVG Dimensions
    const TOTAL_WIDTH = MARGIN.left + SIDE_PLOT_WIDTH + PLOT_SPACING +
                        CENTER_PLOT_SIZE + PLOT_SPACING + SIDE_PLOT_WIDTH + MARGIN.right;
    const TOTAL_HEIGHT = MARGIN.top + SELECTOR_HEIGHT + SELECTOR_SPACING +
                         TOP_BOTTOM_HEIGHT + PLOT_SPACING + CENTER_PLOT_SIZE +
                         PLOT_SPACING + TOP_BOTTOM_HEIGHT + FORWARD_PLOT_SPACING +
                         FORWARD_PLOT_HEIGHT + MARGIN.bottom;

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================

    const triangularDistributionState = {
        marginalX: {
            domain: [2, 4],
            leftBase: 2.3,
            peak: 3.0,
            rightBase: 3.7,
            numPoints: 101
        },
        marginalY: {
            domain: [3, 5],
            leftBase: 3.4,
            peak: 4.0,
            rightBase: 4.6,
            numPoints: 101
        }
    };

    const copulaState = {
        selected: 'independence', // 'independence' or 'unknown'
    };

    // ============================================================================
    // MATHEMATICAL HELPER FUNCTIONS
    // ============================================================================

    /**
     * Triangular possibility distribution
     * Returns 0 outside [leftBase, rightBase], linearly interpolates to peak (1)
     */
    function triangularPossibility(x, leftBase, peak, rightBase) {
        if (x <= leftBase || x >= rightBase) {
            return 0;
        } else if (x < peak) {
            // Linear interpolation from leftBase (0) to peak (1)
            return (x - leftBase) / (peak - leftBase);
        } else {
            // Linear interpolation from peak (1) to rightBase (0)
            return (rightBase - x) / (rightBase - peak);
        }
    }

    /**
     * Independence copula for n=2
     * J_independence(π1, π2) = 1 - (1 - min(π1, π2))²
     */
    function copulaIndependence(pi1, pi2) {
        const minVal = Math.min(pi1, pi2);
        return 1 - Math.pow(1 - minVal, 2);
    }

    /**
     * Unknown dependence copula for n=2
     * J_unknown(π1, π2) = min(1, 2 · min(π1, π2))
     */
    function copulaUnknown(pi1, pi2) {
        return Math.min(1, 2 * Math.min(pi1, pi2));
    }

    /**
     * Get the current copula function based on state
     */
    function getCurrentCopulaFunction() {
        return copulaState.selected === 'independence' ? copulaIndependence : copulaUnknown;
    }

    /**
     * Generate data for triangular distribution line
     */
    function generateTriangularData(config) {
        const data = [];
        const step = (config.domain[1] - config.domain[0]) / (config.numPoints - 1);
        for (let i = 0; i < config.numPoints; i++) {
            const x = config.domain[0] + i * step;
            const y = triangularPossibility(x, config.leftBase, config.peak, config.rightBase);
            data.push({ x, y });
        }
        return data;
    }

    /**
     * Compute 2D joint distribution on a grid using the selected copula
     */
    function computeJointDistribution() {
        const copulaFunc = getCurrentCopulaFunction();
        const gridData = [];

        const xConfig = triangularDistributionState.marginalX;
        const yConfig = triangularDistributionState.marginalY;

        const xValues = [];
        const yValues = [];

        // Generate grid points
        for (let i = 0; i < GRID_SIZE; i++) {
            const x = xConfig.domain[0] + (xConfig.domain[1] - xConfig.domain[0]) * i / (GRID_SIZE - 1);
            xValues.push(x);
        }

        for (let j = 0; j < GRID_SIZE; j++) {
            const y = yConfig.domain[0] + (yConfig.domain[1] - yConfig.domain[0]) * j / (GRID_SIZE - 1);
            yValues.push(y);
        }

        // Compute joint distribution at each grid point
        for (let j = 0; j < GRID_SIZE; j++) {
            for (let i = 0; i < GRID_SIZE; i++) {
                const x = xValues[i];
                const y = yValues[j];

                const piX = triangularPossibility(x, xConfig.leftBase, xConfig.peak, xConfig.rightBase);
                const piY = triangularPossibility(y, yConfig.leftBase, yConfig.peak, yConfig.rightBase);

                const jointValue = copulaFunc(piX, piY);

                gridData.push({ x, y, value: jointValue });
            }
        }

        return { gridData, xValues, yValues };
    }

    /**
     * Compute supremum (max) over Y dimension to get marginal X
     * π_X(x) = sup_y π_{X,Y}(x,y)
     */
    function computeSupremumMarginalX(jointData) {
        const marginalData = [];

        for (let i = 0; i < GRID_SIZE; i++) {
            const x = jointData.xValues[i];
            let maxValue = 0;

            // Find maximum over all y values for this x
            for (let j = 0; j < GRID_SIZE; j++) {
                const dataIdx = j * GRID_SIZE + i;
                maxValue = Math.max(maxValue, jointData.gridData[dataIdx].value);
            }

            marginalData.push({ x, y: maxValue });
        }

        return marginalData;
    }

    /**
     * Compute supremum (max) over X dimension to get marginal Y
     * π_Y(y) = sup_x π_{X,Y}(x,y)
     */
    function computeSupremumMarginalY(jointData) {
        const marginalData = [];

        for (let j = 0; j < GRID_SIZE; j++) {
            const y = jointData.yValues[j];
            let maxValue = 0;

            // Find maximum over all x values for this y
            for (let i = 0; i < GRID_SIZE; i++) {
                const dataIdx = j * GRID_SIZE + i;
                maxValue = Math.max(maxValue, jointData.gridData[dataIdx].value);
            }

            marginalData.push({ x: y, y: maxValue });
        }

        return marginalData;
    }

    /**
     * Compute forward propagation: z = x + y
     * For each possible z value, find the maximum possibility across all (x,y) pairs where x+y=z
     */
    function computeForwardPropagation(jointData) {
        const xConfig = triangularDistributionState.marginalX;
        const yConfig = triangularDistributionState.marginalY;

        // Z range: min(x) + min(y) to max(x) + max(y)
        const zMin = xConfig.domain[0] + yConfig.domain[0];
        const zMax = xConfig.domain[1] + yConfig.domain[1];

        // Use a Map to store z -> max possibility, allowing arbitrary precision
        const zPossibilities = new Map();
        const zMaxPointsMap = new Map();

        // For each point in the joint distribution, compute z = x + y
        // and track the maximum possibility for that z value
        for (let i = 0; i < GRID_SIZE; i++) {
            for (let j = 0; j < GRID_SIZE; j++) {
                const dataIdx = j * GRID_SIZE + i;
                const x = jointData.xValues[i];
                const y = jointData.yValues[j];
                const z = x + y;
                const possibility = jointData.gridData[dataIdx].value;

                // Round z to avoid floating point precision issues
                const zKey = Math.round(z * 1000) / 1000;

                const currentMax = zPossibilities.get(zKey) || 0;

                // If this point has higher possibility than current max, replace
                if (possibility > currentMax) {
                    zPossibilities.set(zKey, possibility);
                    zMaxPointsMap.set(zKey, [{ x, y, possibility }]);
                }
                // If this point equals the max, add it to the list (there might be ties)
                else if (Math.abs(possibility - currentMax) < 0.0001 && possibility > 0.01) {
                    const points = zMaxPointsMap.get(zKey) || [];
                    points.push({ x, y, possibility });
                    zMaxPointsMap.set(zKey, points);
                }
            }
        }

        // Convert to sorted array format for D3
        const forwardData = Array.from(zPossibilities.entries())
            .map(([z, possibility]) => ({ x: z, y: possibility }))
            .sort((a, b) => a.x - b.x);

        return { forwardData, zMin, zMax, zMaxPoints: zMaxPointsMap };
    }

    // ============================================================================
    // D3 SETUP - SVG AND POSITIONING
    // ============================================================================

    const svg = d3.select(CHART_CONTAINER_ID).append("svg")
        .attr("width", TOTAL_WIDTH)
        .attr("height", TOTAL_HEIGHT);

    // Calculate plot positions (center plot is the anchor)
    const centerX = MARGIN.left + SIDE_PLOT_WIDTH + PLOT_SPACING;
    const centerY = MARGIN.top + SELECTOR_HEIGHT + SELECTOR_SPACING + TOP_BOTTOM_HEIGHT + PLOT_SPACING;

    const topX = centerX;
    const topY = MARGIN.top + SELECTOR_HEIGHT + SELECTOR_SPACING;

    const leftX = MARGIN.left;
    const leftY = centerY;

    const rightX = centerX + CENTER_PLOT_SIZE + PLOT_SPACING;
    const rightY = centerY;

    const bottomX = centerX;
    const bottomY = centerY + CENTER_PLOT_SIZE + PLOT_SPACING;

    const forwardX = centerX;
    const forwardY = bottomY + TOP_BOTTOM_HEIGHT + FORWARD_PLOT_SPACING;

    // ============================================================================
    // D3 SCALES
    // ============================================================================

    // Top plot (Marginal X Input) - Horizontal
    const xScaleTop = d3.scaleLinear()
        .domain(triangularDistributionState.marginalX.domain)
        .range([0, CENTER_PLOT_SIZE]);
    const yScaleTop = d3.scaleLinear()
        .domain([0, 1])
        .range([TOP_BOTTOM_HEIGHT, 0]);

    // Left plot (Marginal Y Input) - Vertical (flipped so down = higher values)
    const xScaleLeft = d3.scaleLinear()
        .domain([0, 1])
        .range([0, SIDE_PLOT_WIDTH]);
    const yScaleLeft = d3.scaleLinear()
        .domain(triangularDistributionState.marginalY.domain)
        .range([0, CENTER_PLOT_SIZE]);

    // Center plot (Joint 2D Heatmap) - flipped to match left axis
    const xScaleCenter = d3.scaleLinear()
        .domain(triangularDistributionState.marginalX.domain)
        .range([0, CENTER_PLOT_SIZE]);
    const yScaleCenter = d3.scaleLinear()
        .domain(triangularDistributionState.marginalY.domain)
        .range([0, CENTER_PLOT_SIZE]);

    // Right plot (Marginal Y Output) - Vertical (flipped to match left axis)
    const xScaleRight = d3.scaleLinear()
        .domain([0, 1])
        .range([0, SIDE_PLOT_WIDTH]);
    const yScaleRight = d3.scaleLinear()
        .domain(triangularDistributionState.marginalY.domain)
        .range([0, CENTER_PLOT_SIZE]);

    // Bottom plot (Marginal X Output) - Horizontal
    const xScaleBottom = d3.scaleLinear()
        .domain(triangularDistributionState.marginalX.domain)
        .range([0, CENTER_PLOT_SIZE]);
    const yScaleBottom = d3.scaleLinear()
        .domain([0, 1])
        .range([TOP_BOTTOM_HEIGHT, 0]);

    // Forward propagation plot (z = x + y)
    const xScaleForward = d3.scaleLinear()
        .domain([triangularDistributionState.marginalX.domain[0] + triangularDistributionState.marginalY.domain[0],
                 triangularDistributionState.marginalX.domain[1] + triangularDistributionState.marginalY.domain[1]])
        .range([0, CENTER_PLOT_SIZE]);
    const yScaleForward = d3.scaleLinear()
        .domain([0, 1])
        .range([FORWARD_PLOT_HEIGHT, 0]);

    // Viridis color scale for heatmap
    const colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain([0, 1]);

    // ============================================================================
    // D3 PLOT GROUPS
    // ============================================================================

    const topGroup = svg.append("g")
        .attr("transform", `translate(${topX}, ${topY})`);

    const leftGroup = svg.append("g")
        .attr("transform", `translate(${leftX}, ${leftY})`);

    const centerGroup = svg.append("g")
        .attr("transform", `translate(${centerX}, ${centerY})`);

    const rightGroup = svg.append("g")
        .attr("transform", `translate(${rightX}, ${rightY})`);

    const bottomGroup = svg.append("g")
        .attr("transform", `translate(${bottomX}, ${bottomY})`);

    const forwardGroup = svg.append("g")
        .attr("transform", `translate(${forwardX}, ${forwardY})`);

    // ============================================================================
    // COPULA SELECTOR
    // ============================================================================

    function createCopulaSelector() {
        const selectorY = MARGIN.top;
        const selectorX = centerX;

        const fo = svg.append('foreignObject')
            .attr('x', selectorX)
            .attr('y', selectorY)
            .attr('width', CENTER_PLOT_SIZE)
            .attr('height', SELECTOR_HEIGHT);

        const div = fo.append('xhtml:div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('gap', '12px')
            .style('font-size', VisualizationConfig.FONT_SIZES.LABEL)
            .style('height', '100%');

        div.append('xhtml:span')
            .text('Independence')
            .style('color', COLORS.TEXT_COLOR);

        const toggleContainer = div.append('xhtml:label')
            .style('position', 'relative')
            .style('display', 'inline-block')
            .style('width', '50px')
            .style('height', '24px')
            .style('cursor', 'pointer');

        const checkbox = toggleContainer.append('xhtml:input')
            .attr('type', 'checkbox')
            .style('opacity', 0)
            .style('width', 0)
            .style('height', 0);

        const slider = toggleContainer.append('xhtml:span')
            .style('position', 'absolute')
            .style('cursor', 'pointer')
            .style('top', 0)
            .style('left', 0)
            .style('right', 0)
            .style('bottom', 0)
            .style('background-color', VisualizationConfig.COLORS.SLIDER_COLOR)
            .style('border-radius', '24px')
            .style('transition', 'background-color 0.3s');

        const knob = slider.append('xhtml:span')
            .style('position', 'absolute')
            .style('content', '""')
            .style('height', '18px')
            .style('width', '18px')
            .style('left', '3px')
            .style('bottom', '3px')
            .style('background-color', 'white')
            .style('border-radius', '50%')
            .style('transition', 'transform 0.3s');

        div.append('xhtml:span')
            .text('Unknown Dependence')
            .style('color', COLORS.TEXT_COLOR);

        // Update slider appearance and trigger visualization update
        checkbox.on('change', function() {
            copulaState.selected = this.checked ? 'unknown' : 'independence';
            if (this.checked) {
                knob.style('transform', 'translateX(26px)');
            } else {
                knob.style('transform', 'translateX(0px)');
            }
            updateVisualization();
        });
    }

    // ============================================================================
    // AXES AND LABELS
    // ============================================================================

    function createAxes() {
        // Top plot axes
        topGroup.append("g")
            .attr("class", "x-axis-top")
            .attr("transform", `translate(0, ${TOP_BOTTOM_HEIGHT})`)
            .style("display", "none"); // Hide x-axis

        topGroup.append("g")
            .attr("class", "y-axis-top")
            .call(d3.axisLeft(yScaleTop).tickValues([0, 1]))
            .style("font-size", VisualizationConfig.FONT_SIZES.AXIS_TICK);

        // Left plot axes (vertical orientation, flipped)
        leftGroup.append("g")
            .attr("class", "x-axis-left")
            .attr("transform", `translate(0, 0)`)
            .call(d3.axisTop(xScaleLeft).tickValues([0, 1]))
            .style("font-size", VisualizationConfig.FONT_SIZES.AXIS_TICK);

        leftGroup.append("g")
            .attr("class", "y-axis-left")
            .style("display", "none"); // Hide y-axis

        // Center plot axes (flipped y-axis)
        centerGroup.append("g")
            .attr("class", "x-axis-center")
            .attr("transform", `translate(0, 0)`)
            .style("display", "none"); // Hide x-axis

        centerGroup.append("g")
            .attr("class", "y-axis-center")
            .attr("transform", `translate(0, 0)`)
            .style("display", "none"); // Hide y-axis

        centerGroup.append("text")
            .attr("class", "axis-label")
            .attr("x", CENTER_PLOT_SIZE / 2)
            .attr("y", CENTER_PLOT_SIZE + 35)
            .attr("text-anchor", "middle")
            .style("font-size", VisualizationConfig.FONT_SIZES.AXIS_LABEL)
            .text("x");

        centerGroup.append("text")
            .attr("class", "axis-label")
            .attr("x", -CENTER_PLOT_SIZE / 2)
            .attr("y", -45)
            .attr("text-anchor", "middle")
            .attr("transform", `rotate(-90, ${-CENTER_PLOT_SIZE / 2}, -45)`)
            .style("font-size", VisualizationConfig.FONT_SIZES.AXIS_LABEL)
            .text("y");

        // Right plot axes (flipped to match left)
        rightGroup.append("g")
            .attr("class", "x-axis-right")
            .attr("transform", `translate(0, 0)`)
            .call(d3.axisTop(xScaleRight).tickValues([0, 1]))
            .style("font-size", VisualizationConfig.FONT_SIZES.AXIS_TICK);

        rightGroup.append("g")
            .attr("class", "y-axis-right")
            .style("display", "none"); // Hide y-axis

        // Bottom plot axes
        bottomGroup.append("g")
            .attr("class", "x-axis-bottom")
            .attr("transform", `translate(0, ${TOP_BOTTOM_HEIGHT})`)
            .style("display", "none"); // Hide x-axis

        bottomGroup.append("g")
            .attr("class", "y-axis-bottom")
            .call(d3.axisLeft(yScaleBottom).tickValues([0, 1]))
            .style("font-size", VisualizationConfig.FONT_SIZES.AXIS_TICK);

        // Forward propagation plot axes
        forwardGroup.append("g")
            .attr("class", "x-axis-forward")
            .attr("transform", `translate(0, ${FORWARD_PLOT_HEIGHT})`)
            .call(d3.axisBottom(xScaleForward).ticks(5))
            .style("font-size", VisualizationConfig.FONT_SIZES.AXIS_TICK);

        forwardGroup.append("g")
            .attr("class", "y-axis-forward")
            .call(d3.axisLeft(yScaleForward).tickValues([0, 1]))
            .style("font-size", VisualizationConfig.FONT_SIZES.AXIS_TICK);

        forwardGroup.append("text")
            .attr("class", "axis-label")
            .attr("x", CENTER_PLOT_SIZE / 2)
            .attr("y", FORWARD_PLOT_HEIGHT + 35)
            .attr("text-anchor", "middle")
            .style("font-size", VisualizationConfig.FONT_SIZES.AXIS_LABEL)
            .text("z = x + y");
    }

    // ============================================================================
    // RENDERING FUNCTIONS
    // ============================================================================

    /**
     * Render triangular distribution as a line path
     */
    function renderTriangularLine(group, data, xScale, yScale, orientation = 'horizontal') {
        const lineGenerator = orientation === 'horizontal'
            ? d3.line().x(d => xScale(d.x)).y(d => yScale(d.y))
            : d3.line().x(d => xScale(d.y)).y(d => yScale(d.x)); // For vertical: x=possibility, y=domain value

        group.selectAll('path.triangular-line')
            .data([data])
            .join(
                enter => enter.append('path')
                    .attr('class', 'triangular-line')
                    .attr('d', lineGenerator)
                    .attr('fill', 'none')
                    .attr('stroke', COLORS.INPUT_MARGINAL)
                    .attr('stroke-width', 2),
                update => update
                    .transition()
                    .duration(VisualizationConfig.TRANSITION_DURATION)
                    .attr('d', lineGenerator)
            );
    }

    /**
     * Render output marginal with comparison overlay
     */
    function renderOutputMarginal(group, outputData, inputData, xScale, yScale, orientation = 'horizontal') {
        const lineGen = orientation === 'horizontal'
            ? d3.line().x(d => xScale(d.x)).y(d => yScale(d.y))
            : d3.line().x(d => xScale(d.y)).y(d => yScale(d.x)); // For vertical: x=possibility, y=domain value

        // Input comparison (light gray)
        group.selectAll('path.input-comparison')
            .data([inputData])
            .join(
                enter => enter.append('path')
                    .attr('class', 'input-comparison')
                    .attr('d', lineGen)
                    .attr('fill', 'none')
                    .attr('stroke', COLORS.COMPARISON_OVERLAY)
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '4,4'),
                update => update
                    .transition()
                    .duration(VisualizationConfig.TRANSITION_DURATION)
                    .attr('d', lineGen)
            );

        // Output marginal (green)
        group.selectAll('path.output-marginal')
            .data([outputData])
            .join(
                enter => enter.append('path')
                    .attr('class', 'output-marginal')
                    .attr('d', lineGen)
                    .attr('fill', 'none')
                    .attr('stroke', COLORS.OUTPUT_MARGINAL)
                    .attr('stroke-width', 2),
                update => update
                    .transition()
                    .duration(VisualizationConfig.TRANSITION_DURATION)
                    .attr('d', lineGen)
            );
    }

    /**
     * Render 2D heatmap
     */
    function renderHeatmap(jointData) {
        const cellWidth = CENTER_PLOT_SIZE / GRID_SIZE;
        const cellHeight = CENTER_PLOT_SIZE / GRID_SIZE;

        centerGroup.selectAll('rect.heatmap-cell')
            .data(jointData.gridData)
            .join(
                enter => enter.append('rect')
                    .attr('class', 'heatmap-cell')
                    .attr('x', d => xScaleCenter(d.x) - cellWidth / 2)
                    .attr('y', d => yScaleCenter(d.y) - cellHeight / 2)
                    .attr('width', cellWidth)
                    .attr('height', cellHeight)
                    .attr('fill', d => colorScale(d.value))
                    .attr('stroke', 'none'),
                update => update
                    .transition()
                    .duration(VisualizationConfig.TRANSITION_DURATION)
                    .attr('fill', d => colorScale(d.value))
            );
    }

    /**
     * Create draggable handles for triangular distribution
     */
    function createDraggableHandles(group, config, xScale, yScale, orientation = 'horizontal') {
        const handles = [
            { id: 'left', type: 'base', getX: () => config.leftBase, getY: () => 0 },
            { id: 'peak', type: 'peak', getX: () => config.peak, getY: () => 1 },
            { id: 'right', type: 'base', getX: () => config.rightBase, getY: () => 0 }
        ];

        const dragBehavior = d3.drag()
            .on('start', function() {
                d3.select(this).raise().attr('stroke-width', 3);
            })
            .on('drag', function(event, d) {
                if (orientation === 'horizontal') {
                    const newX = xScale.invert(event.x);
                    updateHandlePosition(d.id, newX, config);
                } else {
                    const newX = yScale.invert(event.y);
                    updateHandlePosition(d.id, newX, config);
                }
                updateVisualization();
            })
            .on('end', function() {
                d3.select(this).attr('stroke-width', 2);
            });

        const handleGroup = group.append('g').attr('class', 'handles');

        // Create invisible larger hitbox circles
        handleGroup.selectAll('circle.handle-hitbox')
            .data(handles)
            .join('circle')
            .attr('class', d => `handle-hitbox handle-hitbox-${d.id}`)
            .attr('r', HANDLE_HITBOX_RADIUS)
            .attr('fill', 'transparent')
            .attr('cursor', 'pointer')
            .call(dragBehavior);

        // Create visible smaller handle circles
        handleGroup.selectAll('circle.handle')
            .data(handles)
            .join('circle')
            .attr('class', d => `handle handle-${d.id}`)
            .attr('r', HANDLE_RADIUS)
            .attr('fill', d => d.type === 'peak' ? COLORS.HANDLE_PEAK : COLORS.HANDLE_BASE)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('pointer-events', 'none'); // Let hitbox handle events

        updateHandlePositions(handleGroup, handles, xScale, yScale, orientation);
    }

    /**
     * Update handle positions based on current state
     */
    function updateHandlePositions(handleGroup, handles, xScale, yScale, orientation) {
        // Update hitbox positions
        handleGroup.selectAll('circle.handle-hitbox')
            .data(handles)
            .attr('cx', d => orientation === 'horizontal' ? xScale(d.getX()) : xScale(d.getY()))
            .attr('cy', d => orientation === 'horizontal' ? yScale(d.getY()) : yScale(d.getX()));

        // Update visible handle positions
        handleGroup.selectAll('circle.handle')
            .data(handles)
            .attr('cx', d => orientation === 'horizontal' ? xScale(d.getX()) : xScale(d.getY()))
            .attr('cy', d => orientation === 'horizontal' ? yScale(d.getY()) : yScale(d.getX()));
    }

    /**
     * Update handle position with constraints
     */
    function updateHandlePosition(handleId, newX, config) {
        if (handleId === 'left') {
            config.leftBase = Math.max(config.domain[0], Math.min(config.peak - MIN_SEPARATION, newX));
        } else if (handleId === 'peak') {
            config.peak = Math.max(config.leftBase + MIN_SEPARATION,
                                  Math.min(config.rightBase - MIN_SEPARATION, newX));
        } else if (handleId === 'right') {
            config.rightBase = Math.max(config.peak + MIN_SEPARATION,
                                       Math.min(config.domain[1], newX));
        }
    }

    // ============================================================================
    // MASTER UPDATE FUNCTION
    // ============================================================================

    function updateVisualization() {
        // 1. Generate input triangular distribution data
        const inputDataX = generateTriangularData(triangularDistributionState.marginalX);
        const inputDataY = generateTriangularData(triangularDistributionState.marginalY);

        // 2. Compute joint distribution
        const jointData = computeJointDistribution();

        // 3. Compute output marginals via supremum
        const outputMarginalX = computeSupremumMarginalX(jointData);
        const outputMarginalY = computeSupremumMarginalY(jointData);

        // 4. Update top plot (input marginal X)
        renderTriangularLine(topGroup, inputDataX, xScaleTop, yScaleTop, 'horizontal');
        const topHandles = [
            { id: 'left', type: 'base', getX: () => triangularDistributionState.marginalX.leftBase, getY: () => 0 },
            { id: 'peak', type: 'peak', getX: () => triangularDistributionState.marginalX.peak, getY: () => 1 },
            { id: 'right', type: 'base', getX: () => triangularDistributionState.marginalX.rightBase, getY: () => 0 }
        ];
        updateHandlePositions(topGroup.select('g.handles'), topHandles, xScaleTop, yScaleTop, 'horizontal');

        // 5. Update left plot (input marginal Y)
        renderTriangularLine(leftGroup, inputDataY, xScaleLeft, yScaleLeft, 'vertical');
        const leftHandles = [
            { id: 'left', type: 'base', getX: () => triangularDistributionState.marginalY.leftBase, getY: () => 0 },
            { id: 'peak', type: 'peak', getX: () => triangularDistributionState.marginalY.peak, getY: () => 1 },
            { id: 'right', type: 'base', getX: () => triangularDistributionState.marginalY.rightBase, getY: () => 0 }
        ];
        updateHandlePositions(leftGroup.select('g.handles'), leftHandles, xScaleLeft, yScaleLeft, 'vertical');

        // 6. Update center heatmap
        renderHeatmap(jointData);

        // 7. Update right plot (output marginal Y)
        renderOutputMarginal(rightGroup, outputMarginalY, inputDataY, xScaleRight, yScaleRight, 'vertical');

        // 8. Update bottom plot (output marginal X)
        renderOutputMarginal(bottomGroup, outputMarginalX, inputDataX, xScaleBottom, yScaleBottom, 'horizontal');

        // 9. Compute and render forward propagation (z = x + y)
        const forwardResult = computeForwardPropagation(jointData);
        renderForwardPropagation(forwardResult.forwardData, forwardResult.zMaxPoints);
    }

    /**
     * Render forward propagation distribution
     */
    function renderForwardPropagation(forwardData, zMaxPoints) {
        const lineGen = d3.line()
            .x(d => xScaleForward(d.x))
            .y(d => yScaleForward(d.y));

        forwardGroup.selectAll('path.forward-line')
            .data([forwardData])
            .join(
                enter => enter.append('path')
                    .attr('class', 'forward-line')
                    .attr('d', lineGen)
                    .attr('fill', 'none')
                    .attr('stroke', COLORS.FORWARD_PROPAGATION)
                    .attr('stroke-width', 2),
                update => update
                    .transition()
                    .duration(VisualizationConfig.TRANSITION_DURATION)
                    .attr('d', lineGen)
            );

        // Collect only the max-contributing points from all z values
        const maxContributingPoints = [];
        zMaxPoints.forEach((points, z) => {
            points.forEach(point => {
                maxContributingPoints.push(point);
            });
        });

        // Render only the points that gave the maximum for each z
        renderHighlightPoints(maxContributingPoints);
    }

    /**
     * Render highlight points on the heatmap showing which (x,y) contribute to forward propagation
     */
    function renderHighlightPoints(points) {
        const cellWidth = CENTER_PLOT_SIZE / GRID_SIZE;
        const cellHeight = CENTER_PLOT_SIZE / GRID_SIZE;

        centerGroup.selectAll('rect.highlight-point')
            .data(points)
            .join(
                enter => enter.append('rect')
                    .attr('class', 'highlight-point')
                    .attr('x', d => xScaleCenter(d.x) - cellWidth / 2)
                    .attr('y', d => yScaleCenter(d.y) - cellHeight / 2)
                    .attr('width', cellWidth)
                    .attr('height', cellHeight)
                    .attr('fill', COLORS.HIGHLIGHT_POINTS)
                    .attr('stroke', 'none'),
                update => update
                    .attr('x', d => xScaleCenter(d.x) - cellWidth / 2)
                    .attr('y', d => yScaleCenter(d.y) - cellHeight / 2),
                exit => exit.remove()
            );
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function initialize() {
        // Create static elements
        createCopulaSelector();
        createAxes();

        // Create draggable handles
        createDraggableHandles(topGroup, triangularDistributionState.marginalX, xScaleTop, yScaleTop, 'horizontal');
        createDraggableHandles(leftGroup, triangularDistributionState.marginalY, xScaleLeft, yScaleLeft, 'vertical');

        // Initial render
        updateVisualization();
    }

    // Start the visualization
    initialize();
});
