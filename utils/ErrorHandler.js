/**
 * Error Handler Module
 * Handles error formatting and display functionality
 */

export class ErrorHandler {
    constructor(explorer) {
        this.explorer = explorer;
    }
    
    formatInspectorError(exceptionInfo) {
        if (!exceptionInfo) {
            return 'Unknown error';
        }
        
        // Handle different types of exception info
        if (typeof exceptionInfo === 'string') {
            return exceptionInfo;
        }
        
        if (exceptionInfo.description) {
            return exceptionInfo.description;
        }
        
        if (exceptionInfo.value) {
            return String(exceptionInfo.value);
        }
        
        if (exceptionInfo.message) {
            return exceptionInfo.message;
        }
        
        // Fallback for complex error objects
        try {
            return JSON.stringify(exceptionInfo);
        } catch (e) {
            return 'Error occurred but could not be formatted';
        }
    }
    
    showError(message) {
        if (this.explorer && this.explorer.showError) {
            this.explorer.showError(message);
        } else {
            console.error('Error:', message);
        }
    }
    
    showSuccess(message) {
        if (this.explorer && this.explorer.showSuccess) {
            this.explorer.showSuccess(message);
        } else {
            console.log('Success:', message);
        }
    }
    
    hideError() {
        // Implementation can be added if needed
        console.log('Hide error called');
    }
    
    hideSuccess() {
        // Implementation can be added if needed
        console.log('Hide success called');
    }
    
    /**
     * Handle and format various types of errors
     */
    handleError(error, context = '') {
        let message = this.formatInspectorError(error);
        
        if (context) {
            message = `${context}: ${message}`;
        }
        
        this.showError(message);
        console.error('JavaScript Explorer Error:', { error, context, message });
    }
    
    /**
     * Create a safe error message for display
     */
    createSafeErrorMessage(error) {
        try {
            if (error && error.message) {
                return error.message;
            }
            
            if (typeof error === 'string') {
                return error;
            }
            
            return 'An unexpected error occurred';
        } catch (e) {
            return 'Error formatting failed';
        }
    }
}