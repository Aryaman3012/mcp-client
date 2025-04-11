/**
 * Base abstract class for all agents
 */
export class BaseAgent {
    name;
    constructor(name) {
        this.name = name;
    }
    getName() {
        return this.name;
    }
    /**
     * Utility method to create a successful response
     */
    createSuccessResponse(output, data) {
        return {
            success: true,
            output,
            data
        };
    }
    /**
     * Utility method to create an error response
     */
    createErrorResponse(error) {
        return {
            success: false,
            error
        };
    }
}
//# sourceMappingURL=Agent.js.map