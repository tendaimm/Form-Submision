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
        
        // Validate form
        if (!validateForm()) {
            const firstError = document.querySelector('.form-group.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Show loading indicator
        const loadingDiv = document.getElementById('loading');
        const resultsDiv = document.getElementById('results');
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
            "ID/Passport number": document.getElementById('idPassport').value.trim() || 'unknown',
            "submittedAt": new Date().toISOString()
        };

        try {
            console.log('Preparing search with data:', formData);
            
            // Construct query parameters from form data
            const params = new URLSearchParams();
            params.append('Name', formData.Name.replace(/\s+/g, ''));
            params.append('Location', formData.Location);
            params.append('Address', formData.Address);
            params.append('Nationality', formData.Nationality);
            params.append('Gender', formData.Gender);
            params.append('Age', formData.Age);
            params.append('ID/Passport number', formData["ID/Passport number"]);
            
            const searchUrl = `https://tmm98.app.n8n.cloud/webhook/search?${params.toString()}`;
            console.log('Making request to:', searchUrl);
            
            // Make the request
            const response = await fetch(searchUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Get the response as text
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            let result = { content: 'No results found' };
            
            try {
                // First try to parse as HTML to find iframe with srcdoc
                const parser = new DOMParser();
                const doc = parser.parseFromString(responseText, 'text/html');
                const iframe = doc.querySelector('iframe');
                
                if (iframe && iframe.hasAttribute('srcdoc')) {
                    // Extract content from srcdoc
                    const srcdoc = iframe.getAttribute('srcdoc');
                    // Clean up the content
                    result.cleanContent = srcdoc
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/\*\*/g, '')
                        .trim();
                } else {
                    // If no iframe with srcdoc, try to parse as JSON
                    try {
                        const jsonData = JSON.parse(responseText);
                        if (jsonData && typeof jsonData === 'object') {
                            result = { ...result, ...jsonData };
                        }
                    } catch (jsonError) {
                        console.log('Response is not JSON, using raw text');
                        result.cleanContent = responseText.trim();
                    }
                }
            } catch (parseError) {
                console.error('Error parsing response:', parseError);
                result.cleanContent = responseText.trim();
            }
            
            // Ensure we have content to display
            if (result.cleanContent) {
                result.content = result.cleanContent;
            }
            
            console.log('Processed result:', result);
            
            // Hide loading and show results
            loadingDiv.classList.add('hidden');
            displayResults(result, formData);
            
        } catch (error) {
            console.error('Error:', error);
            loadingDiv.classList.add('hidden');
            
            // Show error message
            const resultsContent = document.getElementById('resultsContent');
            resultsContent.innerHTML = `
                <div class="error-message">
                    <h3>Error</h3>
                    <p>An error occurred while processing your request. Please try again later.</p>
                    <p>${error.message}</p>
                    <button onclick="resetForm()" class="btn btn-new-search">Try Again</button>
                </div>
            `;
            resultsDiv.classList.remove('hidden');
            resultsDiv.scrollIntoView({ behavior: 'smooth' });
        }
    });

    function displayResults(data, formData) {
        console.log('Displaying results with data:', data);
        
        const resultsDiv = document.getElementById('results');
        const resultsContent = document.getElementById('resultsContent');
        
        if (!resultsDiv || !resultsContent) {
            console.error('Required elements not found in the DOM');
            return;
        }
        
        // Clear previous results
        resultsContent.innerHTML = '';
        console.log('Cleared previous results');
        
        // Create result container
        const resultContainer = document.createElement('div');
        resultContainer.className = 'result-container';
        
        // Add search query info
        const searchInfo = document.createElement('div');
        searchInfo.className = 'search-info';
        searchInfo.innerHTML = `
            <h3>Search Results for: ${formData.Name}</h3>
            <div class="search-meta">
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Reference ID:</strong> REF-${Date.now().toString().slice(-6)}</p>
            </div>
            <hr class="divider">
        `;
        
        // Add the search info to container
        resultContainer.appendChild(searchInfo);
        console.log('Added search info');
        
        // Create result content
        const resultContent = document.createElement('div');
        resultContent.className = 'result-content';
        
        // Get the content to display
        const displayText = data.cleanContent || data.content || 'No results found';
        console.log('Content to display:', displayText.substring(0, 100) + '...');
        
        // Split into sections (split by double newlines)
        const sections = displayText.split('\n\n').filter(section => section.trim() !== '');
        console.log('Found', sections.length, 'sections to display');
        
        if (sections.length > 0) {
            sections.forEach((section, index) => {
                const trimmedSection = section.trim();
                if (trimmedSection) {
                    // Check if this is a heading (starts with ** and ends with **)
                    if (trimmedSection.startsWith('**') && trimmedSection.endsWith('**')) {
                        const heading = document.createElement('h4');
                        heading.textContent = trimmedSection.replace(/\*\*/g, '');
                        heading.style.margin = index > 0 ? '1.5em 0 0.5em' : '0 0 0.5em';
                        heading.style.color = '#2c5f2d';
                        resultContent.appendChild(heading);
                        console.log('Added heading:', heading.textContent);
                    } else {
                        // Regular paragraph
                        const p = document.createElement('p');
                        p.textContent = trimmedSection;
                        p.style.marginBottom = '1em';
                        p.style.lineHeight = '1.6';
                        resultContent.appendChild(p);
                        console.log('Added paragraph:', p.textContent.substring(0, 50) + '...');
                    }
                }
            });
        } else {
            const p = document.createElement('p');
            p.textContent = 'No results found for this search.';
            p.style.marginBottom = '1em';
            p.style.lineHeight = '1.6';
            resultContent.appendChild(p);
            console.log('Added no results message');
        }
        
        // Add the content to container
        resultContainer.appendChild(resultContent);
        console.log('Added content to container');
        
        // Add action buttons
        const actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';
        actionButtons.style.marginTop = '2em';
        actionButtons.style.paddingTop = '1em';
        actionButtons.style.borderTop = '1px solid #eee';
        actionButtons.innerHTML = `
            <button onclick="window.print()" class="btn btn-print">Print Report</button>
            <button onclick="resetForm()" class="btn btn-new-search">New Search</button>
        `;
        
        resultContainer.appendChild(actionButtons);
        resultsContent.appendChild(resultContainer);
        
        // Show results section
        resultsDiv.classList.remove('hidden');
        console.log('Removed hidden class from results div');
        
        // Force reflow
        void resultsDiv.offsetHeight;
        
        // Scroll to results
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
        console.log('Scrolled to results');
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
