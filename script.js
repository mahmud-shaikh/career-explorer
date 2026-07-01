// ============================================
// CAREER EXPLORER - JAVASCRIPT
// ============================================

// Global State
let allCareers = [];
let currentCareerIndex = 0;
let currentPage = 'home';
let bookmarkedCareers = JSON.parse(localStorage.getItem('bookmarkedCareers')) || [];
let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
let selectedCareersForComparison = [null, null];
let pendingStreamFilter = null;

// Initialize on Page Load
document.addEventListener('DOMContentLoaded', async () => {
    await loadCareersData();
    initializeTheme();
    setupEventListeners();
    renderHomePage();
    updateBookmarkBadge();
});

// ============================================
// DATA LOADING
// ============================================

async function loadCareersData() {
    try {
        const response = await fetch('careers.json');
        const data = await response.json();
        allCareers = data;
        console.log(`Loaded ${allCareers.length} careers`);
    } catch (error) {
        console.error('Error loading careers data:', error);
    }
}

// ============================================
// THEME MANAGEMENT
// ============================================

function initializeTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    const themeToggle = document.getElementById('themeToggle');
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        if (themeToggle) {
            themeToggle.textContent = '☀️';
            themeToggle.setAttribute('aria-pressed', 'true');
        }
    }
}

function toggleTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    if (themeToggle) {
        themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
        themeToggle.setAttribute('aria-pressed', isDarkMode ? 'true' : 'false');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            if (query.length > 0) {
                showSearchSuggestions(query);
            } else {
                hideSearchSuggestions();
            }
        });

        searchInput.addEventListener('keydown', (e) => {
            handleSearchKeydown(e);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                hideSearchSuggestions();
            }
        });
    }

    // Explore search
    const exploreSearch = document.getElementById('exploreSearch');
    if (exploreSearch) {
        exploreSearch.addEventListener('input', debounce(() => applyFilters(), 300));
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideSearchSuggestions();
            document.querySelectorAll('.compare-dropdown.active').forEach(dd => dd.classList.remove('active'));
        }
    });
}

// ============================================
// FUZZY SEARCH & AUTOCOMPLETE
// ============================================

function fuzzyMatch(searchTerm, targetString) {
    const lowerSearch = searchTerm.toLowerCase();
    const lowerTarget = targetString.toLowerCase();
    
    if (lowerTarget.includes(lowerSearch)) return true;
    
    let searchIndex = 0;
    for (let i = 0; i < lowerTarget.length; i++) {
        if (lowerTarget[i] === lowerSearch[searchIndex]) {
            searchIndex++;
            if (searchIndex === lowerSearch.length) return true;
        }
    }
    return false;
}

function searchCareers(query) {
    const lowercaseQuery = query.toLowerCase();
    
    return allCareers.filter(career => {
        return fuzzyMatch(query, career.name) ||
               fuzzyMatch(query, career.stream) ||
               fuzzyMatch(query, career.introduction);
    }).sort((a, b) => {
        // Prioritize exact matches and starts with
        const aNameMatch = a.name.toLowerCase().includes(lowercaseQuery);
        const bNameMatch = b.name.toLowerCase().includes(lowercaseQuery);
        
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        
        return 0;
    });
}

function showSearchSuggestions(query) {
    const results = searchCareers(query).slice(0, 8);
    const suggestionsDiv = document.getElementById('searchSuggestions');
    
    if (results.length === 0) {
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.classList.remove('active');
        return;
    }

    suggestionsDiv.innerHTML = results.map((career, index) => `
        <div class="suggestion-item ${index === 0 ? 'selected' : ''}" role="option" tabindex="0" aria-selected="${index === 0}" onclick="selectSuggestion('${career.id}')" onkeydown="if(event.key==='Enter' || event.key===' ') selectSuggestion('${career.id}')">
            <div class="suggestion-text">
                <div class="suggestion-main">${highlightMatch(career.name, query)}</div>
                <div class="suggestion-meta">${career.stream}</div>
            </div>
            <span class="suggestion-meta">→</span>
        </div>
    `).join('');

    suggestionsDiv.classList.add('active');
}

function hideSearchSuggestions() {
    const suggestionsDiv = document.getElementById('searchSuggestions');
    suggestionsDiv.innerHTML = '';
    suggestionsDiv.classList.remove('active');
}

function highlightMatch(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
}

function handleSearchKeydown(e) {
    const suggestions = document.querySelectorAll('.suggestion-item');
    const selected = document.querySelector('.suggestion-item.selected');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextItem = selected?.nextElementSibling || suggestions[0];
        updateSelectedSuggestion(nextItem);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevItem = selected?.previousElementSibling || suggestions[suggestions.length - 1];
        updateSelectedSuggestion(prevItem);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selected) {
            selected.click();
        } else if (suggestions.length > 0) {
            suggestions[0].click();
        }
    } else if (e.key === 'Escape') {
        hideSearchSuggestions();
    }
}

function updateSelectedSuggestion(item) {
    document.querySelectorAll('.suggestion-item').forEach(s => s.classList.remove('selected'));
    if (item) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
    }
}

function selectSuggestion(careerId) {
    const career = allCareers.find(c => c.id === careerId);
    if (career) {
        navigateToCareer(career);
    }
}

// ============================================
// PAGE NAVIGATION
// ============================================

function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show selected page
    const pageElement = document.getElementById(page + 'Page');
    if (pageElement) {
        pageElement.classList.add('active');
        currentPage = page;

        // Initialize page content
        if (page === 'explore') {
            renderExplorePage();
        } else if (page === 'bookmarks') {
            renderBookmarksPage();
        } else if (page === 'compare') {
            renderComparePage();
        } else if (page === 'home') {
            renderHomePage();
        }
    }

    // Scroll to top
    window.scrollTo(0, 0);
}

// ============================================
// HOME PAGE
// ============================================

function renderHomePage() {
    renderStreams();
    renderFeaturedCareers();
}

function renderStreams() {
    const grid = document.getElementById('streamsGrid');
    if (!grid) return;

    const streams = [
        { name: 'Agriculture', icon: '🌾', count: 23 },
        { name: 'Arts & Media', icon: '🎬', count: 70 },
        { name: 'Business', icon: '💼', count: 33 },
        { name: 'Education', icon: '📚', count: 21 },
        { name: 'Health', icon: '⚕️', count: 74 },
        { name: 'Engineering', icon: '⚙️', count: 41 },
        { name: 'IT', icon: '💻', count: 18 },
        { name: 'Science', icon: '🔬', count: 102 },
        { name: 'Management', icon: '📊', count: 12 },
        { name: 'Operations', icon: '🏨', count: 49 },
        { name: 'Admin & Law', icon: '⚖️', count: 38 },
        { name: 'Sports', icon: '🏅', count: 30 },
        { name: 'Tourism', icon: '✈️', count: 9 },
        { name: 'Transport', icon: '🚛', count: 11 }
    ];

    grid.innerHTML = streams.map(stream => `
        <div class="stream-card" role="button" tabindex="0" aria-label="Filter careers by ${stream.name}" onclick="filterByStream('${stream.name}')" onkeydown="if(event.key==='Enter' || event.key===' ') filterByStream('${stream.name}')">
            <div class="stream-icon">${stream.icon}</div>
            <div class="stream-name">${stream.name}</div>
            <div class="stream-count">${stream.count} careers</div>
        </div>
    `).join('');
}

function renderFeaturedCareers() {
    const grid = document.getElementById('featuredCareers');
    if (!grid) return;

    // Show top 12 careers
    const featured = allCareers.slice(0, 12);
    grid.innerHTML = featured.map(career => createCareerCard(career)).join('');
}

function createCareerCard(career) {
    const isBookmarked = bookmarkedCareers.includes(career.id);
    return `
        <div class="career-card" role="button" tabindex="0" aria-label="View ${career.name} details" onclick="navigateToCareerById('${career.id}')" onkeydown="if(event.key==='Enter' || event.key===' ') navigateToCareerById('${career.id}')">
            <div class="career-card-header">
                <div class="career-card-title">${career.name}</div>
                <div class="career-card-stream">${career.stream}</div>
            </div>
            <div class="career-card-body">
                <p class="career-card-description">${truncateText(career.introduction, 80)}</p>
                <div class="career-card-meta">
                    <span class="meta-item">💼 Entry: ${career.income?.entry || 'N/A'}</span>
                </div>
            </div>
            <div class="career-card-footer">
                <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); navigateToCareerById('${career.id}')">
                    View Details
                </button>
                <button class="btn btn-secondary btn-small" onclick="event.stopPropagation(); toggleBookmarkById('${career.id}')" title="Bookmark">
                    ${isBookmarked ? '🔖 Bookmarked' : '📌 Bookmark'}
                </button>
            </div>
        </div>
    `;
}

function truncateText(text, length) {
    return text.length > length ? text.substring(0, length) + '...' : text;
}

// ============================================
// EXPLORE PAGE
// ============================================

function renderExplorePage() {
    renderStreamFilters();
    applyFilters();
}

function renderStreamFilters() {
    const filterContainer = document.getElementById('streamFilter');
    if (!filterContainer) return;

    const streams = [
        'Agriculture and Allied Sciences',
        'Arts, Media, Marketing and Entertainment',
        'Business and Finance',
        'Education and Training',
        'Health and Wellness',
        'Engineering',
        'Information Technology',
        'Science and Research',
        'Management',
        'Operations, Logistics, and Hospitality',
        'Public Administration and Law',
        'Sports and Physical Education',
        'Tourism and Hospitality',
        'Transportation'
    ];

    filterContainer.innerHTML = streams.map((stream, index) => `
        <label class="filter-label">
            <input type="checkbox" value="${stream}" onchange="applyFilters()">
            <span>${stream}</span>
        </label>
    `).join('');
}

function applyFilters() {
    let filtered = [...allCareers];

    // Stream filter
    const checkedStreams = Array.from(document.querySelectorAll('#streamFilter input:checked'))
        .map(cb => cb.value);
    
    if (checkedStreams.length > 0) {
        filtered = filtered.filter(c => checkedStreams.includes(c.stream));
    }

    // Search filter
    const searchTerm = document.getElementById('exploreSearch')?.value || '';
    if (searchTerm) {
        filtered = filtered.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.stream.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    // Sort
    const sortBy = document.getElementById('sortFilter')?.value || 'name-asc';
    filtered = sortCareers(filtered, sortBy);

    // Render results
    renderCareersResults(filtered);
}

function sortCareers(careers, sortBy) {
    const sorted = [...careers];
    
    switch(sortBy) {
        case 'name-asc':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'name-desc':
            return sorted.sort((a, b) => b.name.localeCompare(a.name));
        case 'salary-high':
            return sorted.sort((a, b) => {
                const aVal = parseInt(b.income?.entry?.replace(/[^0-9]/g, '') || 0);
                const bVal = parseInt(a.income?.entry?.replace(/[^0-9]/g, '') || 0);
                return aVal - bVal;
            });
        case 'salary-low':
            return sorted.sort((a, b) => {
                const aVal = parseInt(a.income?.entry?.replace(/[^0-9]/g, '') || 0);
                const bVal = parseInt(b.income?.entry?.replace(/[^0-9]/g, '') || 0);
                return aVal - bVal;
            });
        default:
            return sorted;
    }
}

function resetFilters() {
    document.querySelectorAll('#streamFilter input:checked').forEach(cb => cb.checked = false);
    document.getElementById('exploreSearch').value = '';
    document.getElementById('sortFilter').value = 'name-asc';
    applyFilters();
}

function renderCareersResults(careers) {
    const resultsDiv = document.getElementById('careersResults');
    const noResultsDiv = document.getElementById('noResults');

    if (careers.length === 0) {
        resultsDiv.innerHTML = '';
        noResultsDiv.style.display = 'flex';
        return;
    }

    noResultsDiv.style.display = 'none';
    resultsDiv.innerHTML = careers.map(career => `
        <div class="career-list-item" role="button" tabindex="0" aria-label="View ${career.name} details" onclick="navigateToCareerById('${career.id}')" onkeydown="if(event.key==='Enter' || event.key===' ') navigateToCareerById('${career.id}')">
            <div class="career-list-info">
                <div class="career-list-title">${career.name}</div>
                <div class="career-list-stream">${career.stream}</div>
            </div>
            <div class="career-list-arrow">→</div>
        </div>
    `).join('');
}

function filterByStream(streamName) {
    const streamMapping = {
        'Agriculture': 'Agriculture and Allied Sciences',
        'Arts & Media': 'Arts, Media, Marketing and Entertainment',
        'Business': 'Business and Finance',
        'Education': 'Education and Training',
        'Health': 'Health and Wellness',
        'Engineering': 'Engineering',
        'IT': 'Information Technology',
        'Science': 'Science and Research',
        'Management': 'Management',
        'Operations': 'Operations, Logistics, and Hospitality',
        'Admin & Law': 'Public Administration and Law',
        'Sports': 'Sports and Physical Education',
        'Tourism': 'Tourism and Hospitality',
        'Transport': 'Transportation'
    };

    pendingStreamFilter = streamMapping[streamName] || streamName;
    navigateTo('explore');
}

function applyPendingStreamFilter() {
    if (!pendingStreamFilter) return;

    const checkbox = Array.from(document.querySelectorAll('#streamFilter input'))
        .find(cb => cb.value === pendingStreamFilter);
    if (checkbox) {
        checkbox.checked = true;
    }
    pendingStreamFilter = null;
}

function renderExplorePage() {
    renderStreamFilters();
    applyPendingStreamFilter();
    applyFilters();
}

// ============================================
// CAREER DETAIL PAGE
// ============================================

function navigateToCareerById(careerId) {
    const career = allCareers.find(c => c.id === careerId);
    if (!career) return;
    navigateToCareer(career);
}

function navigateToCareer(career) {
    currentCareerIndex = allCareers.findIndex(c => c.id === career.id);
    renderCareerDetail(career);
    navigateTo('career');
    addToRecentlyViewed(career.id);
}

function renderCareerDetail(career) {
    // Update breadcrumb
    document.getElementById('careerBreadcrumb').textContent = career.name;

    // Hero section
    document.getElementById('careerTitle').textContent = career.name;
    document.getElementById('careerStream').textContent = career.stream;
    document.getElementById('careerGrowth').textContent = `Growth: ${career.growth || 'High'}`;
    
    // Quick stats
    document.getElementById('entrySalary').textContent = career.income?.entry || 'N/A';
    document.getElementById('courseDuration').textContent = career.course_duration || 'N/A';
    document.getElementById('growthRate').textContent = career.growth || 'High';

    // Update bookmark button
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    if (bookmarkedCareers.includes(career.id)) {
        bookmarkBtn.classList.add('bookmarked');
    } else {
        bookmarkBtn.classList.remove('bookmarked');
    }

    // About tab
    document.getElementById('careerIntroduction').textContent = career.introduction;
    document.getElementById('careerSkills').innerHTML = (career.skills || [])
        .map(skill => `<span class="tag">${skill}</span>`).join('');
    document.getElementById('careerTraits').innerHTML = (career.traits || [])
        .map(trait => `<span class="tag">${trait}</span>`).join('');
    document.getElementById('careerExample').textContent = career.example || career.real_example || 'No example available';

    // Education tab
    renderEducationPathway(career);
    document.getElementById('courseDurationDetail').textContent = career.course_duration || 'N/A';
    
    const feesText = formatComparisonValue(career.course_fees) || 'N/A';
    document.getElementById('courseFees').textContent = feesText;

    document.getElementById('whereToStudy').innerHTML = (career.where_to_study || [])
        .map(institution => `<div class="info-card">${institution}</div>`).join('');

    document.getElementById('scholarships').innerHTML = (career.scholarships || [])
        .map(scholarship => `<div class="scholarship-item">${scholarship}</div>`).join('');

    // Income tab
    document.getElementById('incomeEntry').textContent = career.income?.entry || 'N/A';
    document.getElementById('incomeMid').textContent = career.income?.mid_career || 'N/A';
    document.getElementById('incomeSenior').textContent = career.income?.senior || 'N/A';
    document.getElementById('growthDetails').innerHTML = `
        <div class="info-card">
            <strong>Expected Growth:</strong> ${career.growth || 'Information not available'}
        </div>
    `;

    // Opportunities tab
    document.getElementById('whereToWork').innerHTML = (career.where_to_work || [])
        .map(workplace => `<div class="opportunity-item">${workplace}</div>`).join('');

    // Pathway tab
    renderFullPathway(career);

    // Related careers
    renderRelatedCareers(career);

    // Navigation buttons
    updateCareerNavigation();

    // Reset tabs
    switchTab('about');
}

function renderEducationPathway(career) {
    const pathway = career.educational_pathway || [];
    const pathwayDiv = document.getElementById('educationPathway');
    
    const pathwayHTML = pathway.map((step, index) => {
        let html = `<div class="pathway-step">${step}</div>`;
        if (index < pathway.length - 1) {
            html += '<div class="pathway-arrow">↓</div>';
        }
        return html;
    }).join('');

    pathwayDiv.innerHTML = `<div class="pathway-roadmap">${pathwayHTML}</div>`;
}

function renderFullPathway(career) {
    const pathway = career.educational_pathway || [];
    const pathwayDiv = document.getElementById('fullPathway');
    
    const pathwayHTML = pathway.map((step, index) => {
        return `
            <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="
                        width: 40px;
                        height: 40px;
                        background: var(--primary-color);
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                    ">${index + 1}</div>
                    <div style="flex: 1;">
                        <strong>${step}</strong>
                    </div>
                </div>
                ${index < pathway.length - 1 ? '<div style="width: 2px; height: 30px; background: var(--primary-color); margin-left: 19px; margin-top: 10px;"></div>' : ''}
            </div>
        `;
    }).join('');

    pathwayDiv.innerHTML = pathwayHTML;
}

function renderRelatedCareers(career) {
    const relatedDiv = document.getElementById('relatedCareers');
    const relatedCareerIds = career.related_careers || [];
    
    // Find related careers
    const related = allCareers.filter(c => 
        (relatedCareerIds.includes(c.name) || c.stream === career.stream) && 
        c.id !== career.id
    ).slice(0, 4);

    relatedDiv.innerHTML = related.map(c => createCareerCard(c)).join('');
}

function updateCareerNavigation() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    prevBtn.disabled = currentCareerIndex === 0;
    nextBtn.disabled = currentCareerIndex === allCareers.length - 1;
}

function navigatePrevious() {
    if (currentCareerIndex > 0) {
        navigateToCareer(allCareers[currentCareerIndex - 1]);
    }
}

function navigateNext() {
    if (currentCareerIndex < allCareers.length - 1) {
        navigateToCareer(allCareers[currentCareerIndex + 1]);
    }
}

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tabName, event = null) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) {
        tab.classList.add('active');
    }

    if (event) {
        event.target.classList.add('active');
    } else {
        const defaultButton = document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`);
        if (defaultButton) {
            defaultButton.classList.add('active');
        }
    }
}

// ============================================
// BOOKMARKS
// ============================================

function toggleBookmarkById(careerId) {
    const career = allCareers.find(c => c.id === careerId);
    if (!career) return;
    toggleBookmark(career);
}

function toggleBookmark(career = null) {
    const careerToBookmark = career || allCareers[currentCareerIndex];
    if (!careerToBookmark) return;

    if (bookmarkedCareers.includes(careerToBookmark.id)) {
        bookmarkedCareers = bookmarkedCareers.filter(id => id !== careerToBookmark.id);
    } else {
        bookmarkedCareers.push(careerToBookmark.id);
    }

    localStorage.setItem('bookmarkedCareers', JSON.stringify(bookmarkedCareers));
    updateBookmarkBadge();

    // Update button state
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    if (bookmarkBtn) {
        if (bookmarkedCareers.includes(careerToBookmark.id)) {
            bookmarkBtn.classList.add('bookmarked');
            bookmarkBtn.innerHTML = '🔖 Bookmarked';
        } else {
            bookmarkBtn.classList.remove('bookmarked');
            bookmarkBtn.innerHTML = '📌 Bookmark';
        }
    }
}

function updateBookmarkBadge() {
    const badge = document.getElementById('bookmarkBadge');
    if (badge) {
        badge.textContent = bookmarkedCareers.length;
    }
}

function renderBookmarksPage() {
    const listDiv = document.getElementById('bookmarksList');
    const noBookmarksDiv = document.getElementById('noBookmarks');

    if (bookmarkedCareers.length === 0) {
        listDiv.innerHTML = '';
        noBookmarksDiv.style.display = 'flex';
        return;
    }

    noBookmarksDiv.style.display = 'none';
    const bookmarkedCareersData = allCareers.filter(c => bookmarkedCareers.includes(c.id));
    listDiv.innerHTML = bookmarkedCareersData.map(career => `
        <div class="career-list-item" onclick="navigateToCareerById('${career.id}')">
            <div class="career-list-info">
                <div class="career-list-title">${career.name}</div>
                <div class="career-list-stream">${career.stream}</div>
            </div>
            <div class="career-list-arrow">→</div>
        </div>
    `).join('');
}

// ============================================
// RECENTLY VIEWED
// ============================================

function addToRecentlyViewed(careerId) {
    recentlyViewed = recentlyViewed.filter(id => id !== careerId);
    recentlyViewed.unshift(careerId);
    recentlyViewed = recentlyViewed.slice(0, 10);
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
}

// ============================================
// COMPARE PAGE
// ============================================

function renderComparePage() {
    selectedCareersForComparison = [null, null];
    const compareInput1 = document.getElementById('compareInput1');
    const compareInput2 = document.getElementById('compareInput2');
    if (compareInput1) compareInput1.value = '';
    if (compareInput2) compareInput2.value = '';
    document.getElementById('compareDropdown1')?.classList.remove('active');
    document.getElementById('compareDropdown2')?.classList.remove('active');
    document.getElementById('comparisonResult').style.display = 'none';
}

function showCompareDropdown(index) {
    const input = document.getElementById(`compareInput${index}`);
    const dropdown = document.getElementById(`compareDropdown${index}`);
    const query = input.value;

    if (!query) {
        dropdown.classList.remove('active');
        return;
    }

    const results = searchCareers(query).slice(0, 10);
    dropdown.innerHTML = results.map(career => `
        <div class="compare-option" role="option" tabindex="0" onclick="selectCareerForComparison(${index}, '${career.id}')" onkeydown="if(event.key==='Enter' || event.key===' ') selectCareerForComparison(${index}, '${career.id}')">
            <strong>${career.name}</strong><br>
            <small>${career.stream}</small>
        </div>
    `).join('');

    dropdown.classList.add('active');
}

function selectCareerForComparison(index, careerId) {
    const career = allCareers.find(c => c.id === careerId);
    selectedCareersForComparison[index - 1] = career;
    
    document.getElementById(`compareInput${index}`).value = career.name;
    document.getElementById(`compareDropdown${index}`).classList.remove('active');

    if (selectedCareersForComparison[0] && selectedCareersForComparison[1]) {
        showComparison();
    }
}

function showComparison() {
    const [career1, career2] = selectedCareersForComparison;
    if (!career1 || !career2) return;

    const comparisonDiv = document.getElementById('comparisonResult');
    
    const rows = [
        { label: 'Stream', v1: career1.stream, v2: career2.stream },
        { label: 'Entry Salary', v1: career1.income?.entry || 'N/A', v2: career2.income?.entry || 'N/A' },
        { label: 'Mid-Career Salary', v1: career1.income?.mid_career || 'N/A', v2: career2.income?.mid_career || 'N/A' },
        { label: 'Course Duration', v1: formatComparisonValue(career1.course_duration), v2: formatComparisonValue(career2.course_duration) },
        { label: 'Course Fees', v1: formatComparisonValue(career1.course_fees), v2: formatComparisonValue(career2.course_fees) },
        { label: 'Growth', v1: formatComparisonValue(career1.growth), v2: formatComparisonValue(career2.growth) },
        { label: 'Scholarships', v1: formatComparisonValue((career1.scholarships || []).length), v2: formatComparisonValue((career2.scholarships || []).length) },
        { label: 'Work Locations', v1: (career1.where_to_work || []).length, v2: (career2.where_to_work || []).length }
    ];

    comparisonDiv.innerHTML = `
        ${rows.map(row => `
            <div class="comparison-row">
                <div class="comparison-cell comparison-label">${row.label}</div>
                <div class="comparison-cell">${row.v1}</div>
                <div class="comparison-cell">${row.v2}</div>
            </div>
        `).join('')}
    `;

    comparisonDiv.style.display = 'block';
}

function formatComparisonValue(value) {
    if (value == null) return 'N/A';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'N/A';
    if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length === 0) return 'N/A';
        return entries.map(([key, nestedValue]) => `${capitalize(key)}: ${formatComparisonValue(nestedValue)}`).join('; ');
    }
    return String(value);
}

function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
