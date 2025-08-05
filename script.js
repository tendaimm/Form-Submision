
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('adverseMediaForm');
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const resultsContent = document.getElementById('resultsContent');
    
    // Form validation rules
    const validators = {
        name: {
            required: true,
            minLength: 2,
            pattern: /^[a-zA-Z\s'-]+$/,
            message: 'Please enter a valid name (letters, spaces, hyphens, and apostrophes only)'
        },
        location: {
            required: true,
            minLength: 2,
            message: 'Please enter a valid location'
        },
        address: {
            required: true,
            minLength: 10,
            message: 'Please enter a complete address (minimum 10 characters)'
        },
        nationality: {
            required: true,
            message: 'Please select your nationality'
        },
        gender: {
            required: true,
            message: 'Please select your gender'
        },
        age: {
            required: true,
            min: 1,
            max: 120,
            message: 'Please enter a valid age (1-120)'
        },
        idPassport: {
            required: true,
            minLength: 6,
            pattern: /^[A-Z0-9]+$/i,
            message: 'Please enter a valid ID/Passport number (alphanumeric, minimum 6 characters)'
        }
    };

    // Real-time validation
    Object.keys(validators).forEach(fieldName => {
        const field = document.getElementById(fieldName);
        const errorElement = document.getElementById(fieldName + 'Error');
        
        field.addEventListener('blur', () => validateField(fieldName));
        field.addEventListener('input', () => clearError(fieldName));
    });

    function validateField(fieldName) {
        const field = document.getElementById(fieldName);
        const errorElement = document.getElementById(fieldName + 'Error');
        const formGroup = field.closest('.form-group');
        const validator = validators[fieldName];
        const value = field.value.trim();

        // Clear previous states
        formGroup.classList.remove('success', 'error');
        errorElement.textContent = '';

        // Required field check
        if (validator.required && !value) {
            showError(formGroup, errorElement, 'This field is required');
            return false;
        }

        // Skip other validations if field is empty and not required
        if (!value && !validator.required) {
            return true;
        }

        // MinLength validation
        if (validator.minLength && value.length < validator.minLength) {
            showError(formGroup, errorElement, `Minimum ${validator.minLength} characters required`);
            return false;
        }

        // MaxLength validation
        if (validator.maxLength && value.length > validator.maxLength) {
            showError(formGroup, errorElement, `Maximum ${validator.maxLength} characters allowed`);
            return false;
        }

        // Pattern validation
        if (validator.pattern && !validator.pattern.test(value)) {
            showError(formGroup, errorElement, validator.message);
            return false;
        }

        // Number range validation
        if (fieldName === 'age') {
            const numValue = parseInt(value);
            if (numValue < validator.min || numValue > validator.max) {
                showError(formGroup, errorElement, validator.message);
                return false;
            }
        }

        // Success state
        formGroup.classList.add('success');
        return true;
    }

    function showError(formGroup, errorElement, message) {
        formGroup.classList.add('error');
        errorElement.textContent = message;
    }

    function clearError(fieldName) {
        const formGroup = document.getElementById(fieldName).closest('.form-group');
        const errorElement = document.getElementById(fieldName + 'Error');
        
        formGroup.classList.remove('error');
        errorElement.textContent = '';
    }

    function validateForm() {
        let isValid = true;
        
        Object.keys(validators).forEach(fieldName => {
            if (!validateField(fieldName)) {
                isValid = false;
            }
        });
        
        return isValid;
    }

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            // Scroll to first error
            const firstError = document.querySelector('.form-group.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Show loading state
        form.style.display = 'none';
        loadingDiv.classList.remove('hidden');
        resultsDiv.classList.add('hidden');

        // Prepare form data
        const formData = {
            name: document.getElementById('name').value.trim(),
            location: document.getElementById('location').value.trim(),
            address: document.getElementById('address').value.trim(),
            nationality: document.getElementById('nationality').value,
            gender: document.getElementById('gender').value,
            age: parseInt(document.getElementById('age').value),
            idPassport: document.getElementById('idPassport').value.trim(),
            timestamp: new Date().toISOString(),
            source: 'Green4Digital Adverse Media Search Form'
        };

        try {
            // Submit to n8n webhook
            const response = await fetch('https://tmm98.app.n8n.cloud/webhook/fe70b591-ea9d-4007-98bb-7c2a5e8c789f', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle different response types
            let result;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            } else {
                const textResponse = await response.text();
                try {
                    result = JSON.parse(textResponse);
                } catch (e) {
                    result = { message: textResponse };
                }
            }
            
            // Hide loading and show results
            loadingDiv.classList.add('hidden');
            displayResults(result, formData);
            
        } catch (error) {
            console.error('Error submitting form:', error);
            
            // Hide loading
            loadingDiv.classList.add('hidden');
            
            // Show error message
            resultsContent.innerHTML = `
                <div class="results-card" style="border-color: #e74c3c; background-color: #fff5f5;">
                    <h4 style="color: #e74c3c;">Submission Error</h4>
                    <p>There was an error processing your request. Please try again later.</p>
                    <p><small>Error: ${error.message}</small></p>
                    <button onclick="resetForm()" class="submit-btn" style="margin-top: 15px; width: auto; padding: 10px 20px;">
                        Try Again
                    </button>
                </div>
            `;
            resultsDiv.classList.remove('hidden');
        }
    });

    function displayResults(data, originalFormData) {
        let resultsHtml = '';
        
        // Display submitted information
        resultsHtml += `
            <div class="results-card">
                <h4>Submitted Information</h4>
                <p><strong>Name:</strong> ${originalFormData.name}</p>
                <p><strong>Location:</strong> ${originalFormData.location}</p>
                <p><strong>Address:</strong> ${originalFormData.address}</p>
                <p><strong>Nationality:</strong> ${originalFormData.nationality}</p>
                <p><strong>Gender:</strong> ${originalFormData.gender}</p>
                <p><strong>Age:</strong> ${originalFormData.age}</p>
                <p><strong>ID/Passport:</strong> ${originalFormData.idPassport}</p>
                <p><strong>Submitted:</strong> ${new Date(originalFormData.timestamp).toLocaleString()}</p>
            </div>
        `;

        // Display search results if available
        if (data && typeof data === 'object') {
            if (data.results && Array.isArray(data.results) && data.results.length > 0) {
                resultsHtml += `
                    <div class="results-card">
                        <h4>Adverse Media Search Results</h4>
                `;
                
                data.results.forEach((result, index) => {
                    resultsHtml += `
                        <div style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #2c5f2d;">
                            <p><strong>Result ${index + 1}:</strong></p>
                            <p>${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}</p>
                        </div>
                    `;
                });
                
                resultsHtml += `</div>`;
            } else {
                resultsHtml += `
                    <div class="results-card">
                        <h4>Search Results</h4>
                        <div class="no-results">
                            <p>No adverse media findings for the submitted information.</p>
                            <p>This is a clean result.</p>
                        </div>
                    </div>
                `;
            }

            // Display any additional data from n8n response
            if (data.message || data.status || data.reference) {
                resultsHtml += `
                    <div class="results-card">
                        <h4>Processing Information</h4>
                        ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
                        ${data.status ? `<p><strong>Status:</strong> ${data.status}</p>` : ''}
                        ${data.reference ? `<p><strong>Reference ID:</strong> ${data.reference}</p>` : ''}
                    </div>
                `;
            }
        } else {
            resultsHtml += `
                <div class="results-card">
                    <h4>Processing Complete</h4>
                    <p>Your adverse media search request has been submitted successfully.</p>
                    <p>The search results will be processed and reviewed by our compliance team.</p>
                </div>
            `;
        }

        // Add action buttons
        resultsHtml += `
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="resetForm()" class="submit-btn" style="width: auto; padding: 10px 20px; margin-right: 10px;">
                    New Search
                </button>
                <button onclick="window.print()" class="submit-btn" style="width: auto; padding: 10px 20px; background: #6c757d;">
                    Print Results
                </button>
            </div>
        `;

        resultsContent.innerHTML = resultsHtml;
        resultsDiv.classList.remove('hidden');
    }

    // Global function to reset form
    window.resetForm = function() {
        form.reset();
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('success', 'error');
        });
        document.querySelectorAll('.error-message').forEach(error => {
            error.textContent = '';
        });
        
        form.style.display = 'block';
        loadingDiv.classList.add('hidden');
        resultsDiv.classList.add('hidden');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
});
