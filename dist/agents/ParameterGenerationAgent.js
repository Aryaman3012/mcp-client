import { BaseAgent } from './Agent.js';
export class ParameterGenerationAgent extends BaseAgent {
    constructor() {
        super('ParameterGenerationAgent');
    }
    async process(request) {
        try {
            // Extract tool details from context
            const toolDetails = request.context?.toolDetails;
            if (!toolDetails) {
                return this.createErrorResponse('No tool details provided in the request context');
            }
            const { toolName, toolArgs } = toolDetails;
            if (!toolName || !toolArgs) {
                return this.createErrorResponse('Incomplete tool details provided');
            }
            // Extract parameters from the command based on the tool's argument schema
            const parameters = this.extractParameters(request.command, toolArgs);
            // Validate parameters against the tool's argument schema
            const validationResult = this.validateParameters(parameters, toolArgs);
            if (!validationResult.valid) {
                return this.createErrorResponse(`Parameter validation failed: ${validationResult.error}`);
            }
            // Return success with the generated parameters
            return this.createSuccessResponse(`Generated parameters for tool ${toolName}`, {
                parameters
            });
        }
        catch (error) {
            return this.createErrorResponse(`Error generating parameters: ${error.message}`);
        }
    }
    /**
     * Extract parameters from the command based on the tool's argument schema
     */
    extractParameters(command, toolArgs) {
        const parameters = {};
        // This is a simple implementation - in a real system, you would use NLP or LLM
        // to better extract parameters from the command
        for (const arg of toolArgs) {
            // Try to extract a value for each argument
            const { name, type } = arg;
            // Simple pattern matching, searching for "name=value" or "name: value" patterns
            const patterns = [
                new RegExp(`${name}\\s*=\\s*"([^"]+)"`, 'i'),
                new RegExp(`${name}\\s*=\\s*'([^']+)'`, 'i'),
                new RegExp(`${name}\\s*=\\s*(\\S+)`, 'i'),
                new RegExp(`${name}\\s*:\\s*"([^"]+)"`, 'i'),
                new RegExp(`${name}\\s*:\\s*'([^']+)'`, 'i'),
                new RegExp(`${name}\\s*:\\s*(\\S+)`, 'i')
            ];
            for (const pattern of patterns) {
                const match = command.match(pattern);
                if (match) {
                    parameters[name] = this.convertValue(match[1], type);
                    break;
                }
            }
            // If not found, try to extract by position or context
            if (parameters[name] === undefined) {
                // This would be more sophisticated in a real implementation
                // For now, we'll just look for values that seem to match the expected type
                if (type === 'string') {
                    // Look for quoted strings
                    const stringMatch = command.match(/"([^"]+)"|'([^']+)'/);
                    if (stringMatch) {
                        parameters[name] = stringMatch[1] || stringMatch[2];
                    }
                }
                else if (type === 'number') {
                    // Look for numbers
                    const numberMatch = command.match(/\b(\d+(\.\d+)?)\b/);
                    if (numberMatch) {
                        parameters[name] = parseFloat(numberMatch[1]);
                    }
                }
                else if (type === 'boolean') {
                    // Look for boolean indicators
                    if (/\b(true|yes|on|enable)\b/i.test(command)) {
                        parameters[name] = true;
                    }
                    else if (/\b(false|no|off|disable)\b/i.test(command)) {
                        parameters[name] = false;
                    }
                }
            }
        }
        return parameters;
    }
    /**
     * Convert a string value to the appropriate type
     */
    convertValue(value, type) {
        switch (type) {
            case 'string':
                return value;
            case 'number':
                return Number(value);
            case 'boolean':
                return value.toLowerCase() === 'true' ||
                    value.toLowerCase() === 'yes' ||
                    value.toLowerCase() === '1';
            default:
                return value;
        }
    }
    /**
     * Validate parameters against the tool's argument schema
     */
    validateParameters(parameters, toolArgs) {
        for (const arg of toolArgs) {
            const { name, required, type } = arg;
            // Check required parameters
            if (required && parameters[name] === undefined) {
                return {
                    valid: false,
                    error: `Missing required parameter: ${name}`
                };
            }
            // Check parameter types
            if (parameters[name] !== undefined) {
                const paramType = typeof parameters[name];
                if ((type === 'string' && paramType !== 'string') ||
                    (type === 'number' && paramType !== 'number') ||
                    (type === 'boolean' && paramType !== 'boolean')) {
                    return {
                        valid: false,
                        error: `Invalid type for parameter ${name}. Expected ${type}, got ${paramType}`
                    };
                }
            }
        }
        return { valid: true };
    }
}
//# sourceMappingURL=ParameterGenerationAgent.js.map