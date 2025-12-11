// Unified configuration for all D3 visualizations
// This ensures consistent styling across discrete, continuous, and forward examples

const VisualizationConfig = {
    // Layout - Full width to match Distill's l-body column
    FULL_WIDTH: 730,  // Distill l-body column width
    MARGIN: { top: 20, right: 30, bottom: 60, left: 60 },

    // Typography - Unified font sizes
    FONT_SIZES: {
        AXIS_TICK: "13px",
        AXIS_LABEL: "14px",
        LABEL: "13px",
        ANNOTATION: "12px"
    },

    // Colors - Unified color scheme (minimal palette, no opacity)
    COLORS: {

        PROBABILITY_LINE: "rgba(0, 0, 0, 1)",
        POSSIBILITY_LINE: "rgba(255, 127, 80, 1)",
        CORAL_BACKGROUND: "rgba(255, 127, 80, 0.3)",
        BLUE_BACKGROUND: "rgba(37, 138, 188, 0.2)",
        BLUE_PRIMARY: "rgba(37, 138, 188, 1)",  // Darker blue for interval and "A" label
        POSSIBILITY_OUTPUT_LINE: "rgba(49, 139, 0, 1)",

        STROKE: "rgb(0, 0, 0)",
        TEXT: "rgb(0, 0, 0)",

        ANIMATION_POINT: "rgb(0, 100, 255)",
        SLIDER_COLOR: "rgba(0, 155, 132, 1)",  // Turquoise for slider fills
    },

    // Slider configuration - noUiSlider styling
    SLIDER_HEIGHT: 20,

    // Animation
    TRANSITION_DURATION: 50,  // milliseconds

    // Helper function to get width minus margins
    getPlotWidth() {
        return this.FULL_WIDTH - this.MARGIN.left - this.MARGIN.right;
    },
};
