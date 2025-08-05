
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
            "Name": document.getElementById('name').value.trim(),
            "Location": document.getElementById('location').value.trim(),
            "Address": document.getElementById('address').value.trim(),
            "Nationality": document.getElementById('nationality').value,
            "Gender": document.getElementById('gender').value,
            "Age": parseInt(document.getElementById('age').value),
            "ID/Passport number": document.getElementById('idPassport').value.trim(),
            "submittedAt": new Date().toISOString(),
            "formMode": "production"
        };

        try {
            console.log('Submitting form data:', formData);
            
            // Submit to n8n form endpoint
            const response = await fetch('https://tmm98.app.n8n.cloud/form/3b1449a0-4085-480b-885f-c5b4b48a193c', {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle different response types
            let submissionResult;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                submissionResult = await response.json();
            } else {
                const textResponse = await response.text();
                try {
                    submissionResult = JSON.parse(textResponse);
                } catch (e) {
                    submissionResult = { message: textResponse };
                }
            }
            
            console.log('Form submission result:', submissionResult);
            
            // Now fetch the search results from the webhook endpoint
            console.log('Fetching search results from webhook...');
            
            // Wait a moment for n8n to process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            try {
                console.log('Making webhook request with data:', formData);
                
                const webhookResponse = await fetch('https://tmm98.app.n8n.cloud/webhook/fe70b591-ea9d-4007-98bb-7c2a5e8c789f', {
                    method: 'POST',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
                
                console.log('Webhook response status:', webhookResponse.status);
                console.log('Webhook response ok:', webhookResponse.ok);
                
                if (webhookResponse.ok) {
                    let searchResults;
                    const contentType = webhookResponse.headers.get('content-type');
                    
                    if (contentType && contentType.includes('application/json')) {
                        searchResults = await webhookResponse.json();
                    } else {
                        const textResponse = await webhookResponse.text();
                        console.log('Webhook text response:', textResponse);
                        try {
                            searchResults = JSON.parse(textResponse);
                        } catch (e) {
                            searchResults = { message: textResponse, rawResponse: textResponse };
                        }
                    }
                    
                    console.log('Search results:', searchResults);
                    
                    // Check if this is just a workflow start confirmation
                    if (searchResults.message === "Workflow was started") {
                        // Show that the workflow is processing
                        loadingDiv.classList.add('hidden');
                        displayResults({
                            ...submissionResult,
                            workflowStarted: true,
                            searchStatus: 'processing'
                        }, formData);
                    } else {
                        // Combine submission result with actual search results
                        const combinedResult = {
                            ...submissionResult,
                            searchResults: searchResults,
                            hasSearchResults: true
                        };
                        
                        // Hide loading and show results
                        loadingDiv.classList.add('hidden');
                        displayResults(combinedResult, formData);
                    }
                } else {
                    console.warn('Webhook request failed with status:', webhookResponse.status);
                    const errorText = await webhookResponse.text();
                    console.warn('Webhook error response:', errorText);
                    
                    // Show submission result without search results
                    loadingDiv.classList.add('hidden');
                    displayResults({
                        ...submissionResult, 
                        searchError: `Search service returned error ${webhookResponse.status}: ${errorText || 'Unknown error'}`
                    }, formData);
                }
            } catch (webhookError) {
                console.error('Error fetching search results:', webhookError);
                console.error('Webhook error details:', {
                    message: webhookError.message,
                    stack: webhookError.stack,
                    name: webhookError.name
                });
                
                // Show submission result without search results
                loadingDiv.classList.add('hidden');
                displayResults({
                    ...submissionResult, 
                    searchError: `Search service connection failed: ${webhookError.message}`
                }, formData);
            }
            
        } catch (error) {
            console.error('Error submitting form:', error);
            
            // Hide loading
            loadingDiv.classList.add('hidden');
            
            let errorMessage = 'There was an error processing your request.';
            let technicalDetails = error.message;
            
            if (error.message === 'Failed to fetch') {
                errorMessage = 'Unable to connect to the processing server. This might be due to network restrictions or CORS policy.';
                technicalDetails = 'The browser blocked the request due to CORS policy or network connectivity issues.';
            }
            
            // Show error message
            resultsContent.innerHTML = `
                <div class="results-card" style="border-color: #e74c3c; background-color: #fff5f5;">
                    <h4 style="color: #e74c3c;">Submission Error</h4>
                    <p>${errorMessage}</p>
                    <p><small>Technical details: ${technicalDetails}</small></p>
                    <div style="margin-top: 15px; padding: 10px; background-color: #f8f9fa; border-radius: 5px; font-size: 12px;">
                        <strong>Troubleshooting:</strong>
                        <ul style="margin: 5px 0; padding-left: 20px;">
                            <li>Check your internet connection</li>
                            <li>Try refreshing the page and submitting again</li>
                            <li>The n8n webhook server might be temporarily unavailable</li>
                        </ul>
                    </div>
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
                <p><strong>Name:</strong> ${originalFormData.Name}</p>
                <p><strong>Location:</strong> ${originalFormData.Location}</p>
                <p><strong>Address:</strong> ${originalFormData.Address}</p>
                <p><strong>Nationality:</strong> ${originalFormData.Nationality}</p>
                <p><strong>Gender:</strong> ${originalFormData.Gender}</p>
                <p><strong>Age:</strong> ${originalFormData.Age}</p>
                <p><strong>ID/Passport:</strong> ${originalFormData["ID/Passport number"]}</p>
                <p><strong>Submitted:</strong> ${new Date(originalFormData.submittedAt).toLocaleString()}</p>
            </div>
        `;

        // Display search results if available
        if (data && typeof data === 'object') {
            if (data.hasSearchResults && data.searchResults) {
                const searchData = data.searchResults;
                
                if (searchData.results && Array.isArray(searchData.results) && searchData.results.length > 0) {
                    resultsHtml += `
                        <div class="results-card" style="border-color: #e74c3c; background-color: #fff5f5;">
                            <h4 style="color: #e74c3c;">⚠️ Adverse Media Found</h4>
                    `;
                    
                    searchData.results.forEach((result, index) => {
                        resultsHtml += `
                            <div style="margin-bottom: 15px; padding: 10px; border-left: 3px solid #e74c3c; background-color: white; border-radius: 5px;">
                                <p><strong>Finding ${index + 1}:</strong></p>
                                <p>${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}</p>
                            </div>
                        `;
                    });
                    
                    resultsHtml += `</div>`;
                } else {
                    resultsHtml += `
                        <div class="results-card" style="border-color: #27ae60; background-color: #f8fff9;">
                            <h4 style="color: #27ae60;">✅ Clean Search Result</h4>
                            <div class="no-results">
                                <p>No adverse media findings for the submitted information.</p>
                                <p>This individual has a clean media profile.</p>
                            </div>
                        </div>
                    `;
                }
                
                // Display search metadata
                if (searchData.searchDate || searchData.sources || searchData.totalChecked) {
                    resultsHtml += `
                        <div class="results-card">
                            <h4>Search Details</h4>
                            ${searchData.searchDate ? `<p><strong>Search Date:</strong> ${searchData.searchDate}</p>` : ''}
                            ${searchData.sources ? `<p><strong>Sources Checked:</strong> ${Array.isArray(searchData.sources) ? searchData.sources.join(', ') : searchData.sources}</p>` : ''}
                            ${searchData.totalChecked ? `<p><strong>Records Checked:</strong> ${searchData.totalChecked}</p>` : ''}
                        </div>
                    `;
                }
            } else if (data.workflowStarted && data.searchStatus === 'processing') {
                resultsHtml += `
                    <div class="results-card" style="border-color: #17a2b8; background-color: #f0f9ff;">
                        <h4 style="color: #0c5460;">🔄 Search In Progress</h4>
                        <p>Your adverse media search workflow has been successfully initiated.</p>
                        <p>The n8n workflow is now processing your request and searching through various data sources.</p>
                        <div style="margin: 15px 0; padding: 10px; background-color: #e7f3ff; border-radius: 5px;">
                            <p><strong>Next Steps:</strong></p>
                            <ul style="margin: 5px 0; padding-left: 20px;">
                                <li>The workflow will search multiple adverse media databases</li>
                                <li>Results will be compiled and analyzed automatically</li>
                                <li>You may need to check your n8n workflow output for final results</li>
                            </ul>
                        </div>
                        <p><em>Note: The n8n workflow is running in the background. Check your n8n dashboard for completion status and detailed results.</em></p>
                    </div>
                `;
            } else if (data.searchError) {
                resultsHtml += `
                    <div class="results-card" style="border-color: #ffc107; background-color: #fffbf0;">
                        <h4 style="color: #856404;">⚠️ Search Status</h4>
                        <p>Form submitted successfully, but search results are temporarily unavailable.</p>
                        <p><small>${data.searchError}</small></p>
                        <p><em>Please contact support if this issue persists.</em></p>
                    </div>
                `;
            } else {
                resultsHtml += `
                    <div class="results-card">
                        <h4>Search Results</h4>
                        <div class="no-results">
                            <p>Search completed. Processing results...</p>
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
