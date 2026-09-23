/**
 * Scratch++ Blockly Themes & Colors
 * Visual design matching Brack studio (scratch Dark theme, high contrast)
 */

export const TYPE_COLORS = {
    i32: '#3b82f6',
    i64: '#1d4ed8',
    f32: '#10b981',
    f64: '#047857',
    bool: '#f97316',
    v128: '#ec4899',
    ref: '#84cc16',
    texto: '#8b5cf6',
    buffer: '#6b7280',
    funcao: '#eab308',
    control: '#d97706',
    math: '#059669',
    functions: '#9333ea',
    memory: '#475569',
    graphics: '#06b6d4'
};

export function initScratchTheme(Blockly) {
    return Blockly.Theme.defineTheme('scratchppDarkTheme', {
        base: Blockly.Themes.Classic,
        blockStyles: {
            hat_blocks: { colourPrimary: "#FFAB19", colourSecondary: "#E69900", colourTertiary: "#CC8800" }
        },
        categoryStyles: {
            control_category: { colour: '#d97706' },
            math_category: { colour: '#059669' },
            variables_category: { colour: '#3b82f6' },
            functions_category: { colour: '#9333ea' },
            memory_category: { colour: '#475569' },
            text_category: { colour: '#8b5cf6' },
            graphics_category: { colour: '#06b6d4' }
        },
        componentStyles: {
            workspaceBackgroundColour: '#0c100e',
            toolboxBackgroundColour: '#141c18',
            toolboxForegroundColour: '#dcdde1',
            flyoutBackgroundColour: '#111714',
            flyoutOpacity: 0.96,
            scrollbarColour: '#283731',
            scrollbarOpacity: 0.6,
            insertionMarkerColour: '#55efc4',
            insertionMarkerOpacity: 0.85
        }
    });
}
