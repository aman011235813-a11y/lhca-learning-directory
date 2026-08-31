// Supabase configuration
// Use the publishable key (sb_publishable_...) for the browser frontend.
const SUPABASE_URL = 'https://lfzukqnvyvjnwyhjnjho.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Own4ZNjQR1ojVniwJxbj2Q_sVFC9Ycw';

// Simple Supabase client for REST API
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  async request(method, table, filters = {}) {
    let url = `${this.url}/rest/v1/${table}`;
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, value);
      }
    });

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.key}`,
        'apikey': this.key,
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getCourses(filters = {}) {
    return this.request('GET', 'courses_new', filters);
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_KEY);

const searchInput = document.getElementById('searchInput');
const clearSearchButton = document.getElementById('clearSearch');
const providerSearchInput = document.getElementById('providerSearch');
const resultsList = document.getElementById('resultsList');
const resultSummary = document.getElementById('resultSummary');
const costList = document.getElementById('costList');
const categoryList = document.getElementById('categoryList');
const deliveryList = document.getElementById('deliveryList');
const targetAudienceList = document.getElementById('targetAudienceList');
let expandedFilters = {};
let allCourses = [];
let uniqueProviders = [];
let uniqueCategories = [];
let uniqueDeliveryModes = [];
let uniqueCostCategories = [];
let uniqueTargetAudiences = [];
let ITEMS_PER_FILTER = 5;
let COURSES_PER_PAGE = 25;
let currentDisplayCount = COURSES_PER_PAGE;

const COURSE_THUMBNAILS = [
  'assets/course-thumb-1.svg',
  'assets/course-thumb-2.svg',
  'assets/course-thumb-3.svg',
  'assets/course-thumb-4.svg',
  'assets/course-thumb-5.svg',
];

function normalize(value) {
  return value.toString().trim().toLowerCase();
}

function isPublicCourse(course) {
  const reviewStatus = String(course?.review_status || '').trim();
  return reviewStatus.toLowerCase() !== 'archived';
}

function selectCourseThumbnail(course) {
  const seed = String(course.id ?? course.title ?? course.provider ?? 'default');
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % COURSE_THUMBNAILS.length;
  }
  return COURSE_THUMBNAILS[Math.abs(hash) % COURSE_THUMBNAILS.length];
}

function getSelectedProviders() {
  return Array.from(document.querySelectorAll('input[name="provider"]:checked')).map(input => input.value);
}

function getSelectedCategories() {
  return Array.from(document.querySelectorAll('input[name="category"]:checked')).map(input => input.value);
}

function getSelectedDeliveryModes() {
  return Array.from(document.querySelectorAll('input[name="delivery_mode"]:checked')).map(input => input.value);
}

function getSelectedCostCategories() {
  return Array.from(document.querySelectorAll('input[name="cost_category"]:checked')).map(input => input.value);
}

function getSelectedTargetAudiences() {
  return Array.from(document.querySelectorAll('input[name="target_audience"]:checked')).map(input => input.value);
}

function matchesSearch(course, query) {
  if (!query) return true;
  const text = [
    course.title,
    course.description,
    course.provider,
    course.category,
    course.sub_theme,
    course.target_audience,
    course.education_outcome,
    course.access,
    course.delivery_mode,
    course.cost_details
  ].join(' ');
  return normalize(text).includes(normalize(query));
}

function matchesProvider(course, providers) {
  if (providers.length === 0) return true;
  return providers.includes(course.provider);
}

function parseMultiValueField(value) {
  if (!value && value !== 0) return [];
  if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
  return String(value)
    .split(/[,;/\\|]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function matchesCategory(course, categories) {
  if (categories.length === 0) return true;
  const courseCategories = Array.isArray(course.category) ? course.category : parseMultiValueField(course.category);
  return courseCategories.some(courseCat =>
    categories.some(selectedCat => normalize(selectedCat) === normalize(courseCat))
  );
}

function matchesTargetAudience(course, targetAudiences) {
  if (targetAudiences.length === 0) return true;
  const courseTargetAudiences = Array.isArray(course.target_audience) ? course.target_audience : parseMultiValueField(course.target_audience);
  return courseTargetAudiences.some(courseAudience =>
    targetAudiences.some(selectedAudience => normalize(selectedAudience) === normalize(courseAudience))
  );
}

function matchesDeliveryMode(course, deliveryModes) {
  if (deliveryModes.length === 0) return true;
  return deliveryModes.includes(course.delivery_mode);
}

function matchesCostCategory(course, costCategories) {
  if (costCategories.length === 0) return true;
  return costCategories.includes(course.cost_category);
}

function getFilterDisplayLabel(filterName, plural = false) {
  const labelMap = {
    category: 'category',
    cost_category: 'cost category',
    delivery_mode: 'delivery mode',
    target_audience: 'target audience',
    provider: 'provider'
  };

  const baseLabel = labelMap[filterName] || filterName.replace(/_/g, ' ');

  if (!plural) {
    return baseLabel;
  }

  if (baseLabel.endsWith('s')) {
    return baseLabel;
  }

  if (baseLabel.endsWith('y')) {
    return `${baseLabel.slice(0, -1)}ies`;
  }

  return `${baseLabel}s`;
}

function renderFilterCheckList(filterId, items, filterName, showMoreId, forceAllItemsOnLoad = false) {
  const filterContainer = document.getElementById(filterId);
  const expanded = expandedFilters[filterId] || forceAllItemsOnLoad;
  // If expanded, make the list scrollable-full (fixed height with overflow)
  if (filterContainer) {
    filterContainer.classList.toggle('scrollable-full', expanded && items.length > ITEMS_PER_FILTER);
  }
  const itemsToShow = expanded ? items.length : Math.min(ITEMS_PER_FILTER, items.length);

  filterContainer.innerHTML = '';

  // Select All option
  const selectAllLabel = document.createElement('label');
  selectAllLabel.className = 'filter-select-all';
  const selectAllCheckbox = document.createElement('input');
  selectAllCheckbox.type = 'checkbox';
  selectAllCheckbox.className = 'select-all-checkbox';
  selectAllCheckbox.checked = true;
  selectAllCheckbox.addEventListener('change', () => {
    const checkboxes = Array.from(filterContainer.querySelectorAll(`input[name="${filterName}"]:not(.select-all-checkbox)`));
    checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
    handleFilterChange();
  });
  selectAllLabel.appendChild(selectAllCheckbox);
  selectAllLabel.appendChild(document.createTextNode(' Select All'));
  filterContainer.appendChild(selectAllLabel);

  // Individual items
  items.slice(0, itemsToShow).forEach(item => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = filterName;
    checkbox.value = item;
    checkbox.checked = true;
    checkbox.addEventListener('change', handleCheckboxChange);

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${item}`));
    filterContainer.appendChild(label);
  });

  // Show More button
  if (showMoreId) {
    const showMoreBtn = document.getElementById(showMoreId);
    if (items.length > ITEMS_PER_FILTER) {
      showMoreBtn.style.display = 'inline-block';
      const displayLabel = getFilterDisplayLabel(filterName, true);
      showMoreBtn.textContent = expanded ? `Show less ${displayLabel}` : `Show all ${displayLabel}`;
      showMoreBtn.addEventListener('click', () => {
        expandedFilters[filterId] = !expandedFilters[filterId];
        // Toggle class for scrollable behavior and re-render
        const el = document.getElementById(filterId);
        if (el) el.classList.toggle('scrollable-full', !expandedFilters[filterId] && items.length > ITEMS_PER_FILTER);
        renderFilterCheckList(filterId, items, filterName, showMoreId, false);
      });
    } else {
      showMoreBtn.style.display = 'none';
    }
  }
}

function updateFilterLists() {
  // On initial load, render only a default number of items; user can expand to see full scrollable list
  renderFilterCheckList('costList', uniqueCostCategories, 'cost_category', null, false);
  renderFilterCheckList('categoryList', uniqueCategories, 'category', 'showMoreCategories', false);
  renderFilterCheckList('deliveryList', uniqueDeliveryModes, 'delivery_mode', 'showMoreDelivery', false);
  renderFilterCheckList('targetAudienceList', uniqueTargetAudiences, 'target_audience', 'showMoreTargetAudience', false);
}

function updateProviderList() {
  const query = normalize(providerSearchInput.value);
  const matchingProviders = uniqueProviders.filter(provider => normalize(provider).includes(query));

  // Recreate provider checkboxes dynamically
  const providerList = document.getElementById('providerList');
  providerList.innerHTML = '';

  const currentProviderInputs = Array.from(document.querySelectorAll('input[name="provider"]'));
  const selectedProviderSet = new Set(
    currentProviderInputs.filter(input => input.checked).map(input => input.value)
  );
  const preserveSelection = currentProviderInputs.length > 0;

  const providerExpanded = expandedFilters['providerList'] || false;
  // Default to showing a limited number of providers on initial load; expand to view full scrollable list
  const itemsToShow = providerExpanded ? matchingProviders.length : Math.min(ITEMS_PER_FILTER, matchingProviders.length);

  // Select All for providers
  const selectAllLabel = document.createElement('label');
  selectAllLabel.className = 'filter-select-all';
  const selectAllCheckbox = document.createElement('input');
  selectAllCheckbox.type = 'checkbox';
  selectAllCheckbox.className = 'select-all-checkbox';
  selectAllCheckbox.checked = true;
  selectAllCheckbox.addEventListener('change', () => {
    const checkboxes = Array.from(providerList.querySelectorAll('input[name="provider"]:not(.select-all-checkbox)'));
    checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
    handleFilterChange();
  });
  selectAllLabel.appendChild(selectAllCheckbox);
  selectAllLabel.appendChild(document.createTextNode(' Select All'));
  providerList.appendChild(selectAllLabel);

  matchingProviders.slice(0, itemsToShow).forEach((provider, index) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'provider';
    checkbox.value = provider;
    checkbox.checked = preserveSelection ? selectedProviderSet.has(provider) : true;
    checkbox.addEventListener('change', handleCheckboxChange);

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${provider}`));
    label.style.display = 'flex';

    providerList.appendChild(label);
  });

  const showMoreButton = document.getElementById('showMoreProviders');
    if (matchingProviders.length > ITEMS_PER_FILTER) {
    showMoreButton.style.display = 'inline-flex';
    showMoreButton.textContent = providerExpanded ? 'Show less providers' : 'Show all providers';
    showMoreButton.removeEventListener('click', toggleProviderExpanded);
    showMoreButton.addEventListener('click', () => {
      expandedFilters['providerList'] = !expandedFilters['providerList'];
      const el = document.getElementById('providerList');
      if (el) el.classList.toggle('scrollable-full', expandedFilters['providerList'] && matchingProviders.length > ITEMS_PER_FILTER);
      updateProviderList();
    });
  } else {
    showMoreButton.style.display = 'none';
  }
}

// New unified checkbox change handler to implement "start with all; checking one makes it exclusive" behavior
function handleCheckboxChange(event) {
  const cb = event.target;
  const container = cb.closest('.provider-list');
  const name = cb.name;
  if (!container || !name) {
    handleFilterChange();
    return;
  }

  // If the changed checkbox is the select-all checkbox, let its listener handle it
  if (cb.classList.contains('select-all-checkbox')) {
    const checkboxes = Array.from(container.querySelectorAll(`input[name="${name}"]:not(.select-all-checkbox)`));
    checkboxes.forEach(c => c.checked = cb.checked);
    handleFilterChange();
    return;
  }

  const checkboxes = Array.from(container.querySelectorAll(`input[name="${name}"]:not(.select-all-checkbox)`));
  if (cb.checked) {
    // Make this the only checked box in the group
    checkboxes.forEach(c => { if (c !== cb) c.checked = false; });
    const selectAll = container.querySelector('.select-all-checkbox');
    if (selectAll) selectAll.checked = false;
  } else {
    // If none remain checked, restore all (select all)
    const anyChecked = checkboxes.some(c => c.checked);
    if (!anyChecked) {
      checkboxes.forEach(c => c.checked = true);
      const selectAll = container.querySelector('.select-all-checkbox');
      if (selectAll) selectAll.checked = true;
    }
  }

  handleFilterChange();
}

// Mobile: toggle filters panel
const mobileToggle = document.getElementById('mobileToggleFilters');
if (mobileToggle) {
  mobileToggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('filters-open');
    mobileToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}

// Collapsible filter groups (toggle visibility of group body)
function setupFilterAccordions() {
  document.querySelectorAll('.filter-group').forEach(group => {
    const header = group.querySelector('h3');
    if (!header) return;
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
      group.classList.toggle('collapsed');
    });
  });
}

function toggleProviderExpanded() {
  expandedFilters['providerList'] = !expandedFilters['providerList'];
  updateProviderList();
}

async function renderCourses() {
  const query = searchInput.value;
  const selectedProviders = getSelectedProviders();
  const selectedCategories = getSelectedCategories();
  const selectedCostCategories = getSelectedCostCategories();
  const selectedDeliveryModes = getSelectedDeliveryModes();
  const selectedTargetAudiences = getSelectedTargetAudiences();

  // Filter courses in memory
  const visibleCourses = allCourses.filter(course =>
    isPublicCourse(course) &&
    matchesSearch(course, query) &&
    matchesProvider(course, selectedProviders) &&
    matchesCategory(course, selectedCategories) &&
    matchesDeliveryMode(course, selectedDeliveryModes) &&
    matchesCostCategory(course, selectedCostCategories) &&
    matchesTargetAudience(course, selectedTargetAudiences)
  );

  // Reset display count when filters change
  currentDisplayCount = COURSES_PER_PAGE;

  resultsList.innerHTML = '';

  if (!query && visibleCourses.length === allCourses.length) {
    resultSummary.textContent = 'Start typing to see healthcare courses that match your search.';
  } else if (visibleCourses.length === 0) {
    resultSummary.textContent = 'No courses matched your search. Try a broader query or remove filters.';
  } else {
    resultSummary.textContent = `${visibleCourses.length} course${visibleCourses.length === 1 ? '' : 's'} found.`;
  }

  if (visibleCourses.length === 0) {
    resultsList.innerHTML = '<div class="empty-state">No courses found. Adjust your search or filters to explore available healthcare learning options.</div>';
    return;
  }

  // Display only the first currentDisplayCount courses
  const coursesToDisplay = visibleCourses.slice(0, currentDisplayCount);
  
  coursesToDisplay.forEach(course => {
    const card = document.createElement('article');
    card.className = 'course-card';

    const categories = Array.isArray(course.category) ? course.category : parseMultiValueField(course.category);
    const subThemes = Array.isArray(course.sub_theme) ? course.sub_theme : parseMultiValueField(course.sub_theme);
    const targetAudiences = Array.isArray(course.target_audience) ? course.target_audience : parseMultiValueField(course.target_audience);
    const tags = [...categories, ...subThemes].map(tag => `<span class="course-tag">${tag}</span>`).join('');
    const link = course.url ? `<a class="course-link" href="${course.url}" target="_blank" rel="noopener noreferrer">Visit course page</a>` : '';
    const costLabel = course.cost_category || 'N/A';

    const thumbnailSrc = selectCourseThumbnail(course);

    card.innerHTML = `
      <div class="course-card-image-container">
        <img class="course-image" src="${thumbnailSrc}" alt="${course.title}" />
      </div>
      <div>
        <h3>${course.title}</h3>
        <div class="course-meta">
          <span>${course.provider}</span>
          <span>• ${course.delivery_mode || 'N/A'}</span>
          <span>• ${course.duration || 'N/A'}</span>
          <span>• ${costLabel}</span>
        </div>
        <p class="course-description">${course.description}</p>
        <div class="course-meta course-meta-small">
          <span>${course.education_outcome || 'Outcome not specified'}</span>
          <span>• ${course.access || 'Access details not specified'}</span>
        </div>
        <div class="course-tags">${tags}</div>
        ${link}
      </div>
    `;

    resultsList.appendChild(card);
  });

  // Add "Show More" button if there are more courses
  if (visibleCourses.length > currentDisplayCount) {
    const showMoreBtn = document.createElement('button');
    showMoreBtn.className = 'show-more-courses-button';
    showMoreBtn.textContent = `Show More Courses (${visibleCourses.length - currentDisplayCount} remaining)`;
    showMoreBtn.addEventListener('click', () => {
      currentDisplayCount += COURSES_PER_PAGE;
      renderCourses();
    });
    resultsList.appendChild(showMoreBtn);
  }
}

function handleFilterChange() {
  renderCourses();
}

async function initializePortal() {
  try {
    // Fetch all courses from Supabase
    allCourses = (await supabase.getCourses()).filter(isPublicCourse);
    
    // Extract unique values from all array and text fields (real-time from backend)
    const providerSet = new Set();
    const categorySet = new Set();
    const deliveryModeSet = new Set();
    const costCategorySet = new Set();
    const targetAudienceSet = new Set();

    allCourses.forEach(course => {
      if (course.provider) providerSet.add(course.provider);
      
      // Handle both array and text formats
      const categories = Array.isArray(course.category) ? course.category : parseMultiValueField(course.category);
      categories.forEach(cat => categorySet.add(cat));
      
      if (course.cost_category) costCategorySet.add(course.cost_category);
      
      const targetAudiences = Array.isArray(course.target_audience) ? course.target_audience : parseMultiValueField(course.target_audience);
      targetAudiences.forEach(audience => targetAudienceSet.add(audience));
      
      if (course.delivery_mode) deliveryModeSet.add(course.delivery_mode);
    });

    uniqueProviders = Array.from(providerSet).sort();
    uniqueCategories = Array.from(categorySet).sort();
    uniqueDeliveryModes = Array.from(deliveryModeSet).sort();
    uniqueCostCategories = Array.from(costCategorySet).sort();
    uniqueTargetAudiences = Array.from(targetAudienceSet).sort();

    // Populate dynamic filters
    updateProviderList();
    updateFilterLists();

    // Setup accordions for filter groups
    setupFilterAccordions();

    // Ensure all checkboxes are checked by default on first load
    ensureAllFiltersChecked();

    // Render courses
    renderCourses();

    // Attach event listeners
    document.getElementById('providerSearch').addEventListener('input', updateProviderList);
    document.getElementById('showMoreProviders').addEventListener('click', toggleProviderExpanded);
    searchInput.addEventListener('input', renderCourses);
    clearSearchButton.addEventListener('click', () => {
      searchInput.value = '';
      renderCourses();
    });



  } catch (error) {
    console.error('Error initializing portal:', error);
    resultsList.innerHTML = `<div class="empty-state">Error loading courses. Please check your Supabase configuration and try again.</div>`;
  }
}

function ensureAllFiltersChecked() {
  // Ensure all individual filter checkboxes are checked on first load
  document.querySelectorAll('input[name="provider"]:not(.select-all-checkbox)').forEach(cb => cb.checked = true);
  document.querySelectorAll('input[name="cost_category"]:not(.select-all-checkbox)').forEach(cb => cb.checked = true);
  document.querySelectorAll('input[name="category"]:not(.select-all-checkbox)').forEach(cb => cb.checked = true);
  document.querySelectorAll('input[name="delivery_mode"]:not(.select-all-checkbox)').forEach(cb => cb.checked = true);
  document.querySelectorAll('input[name="target_audience"]:not(.select-all-checkbox)').forEach(cb => cb.checked = true);
  
  // Ensure all Select All checkboxes are checked too
  document.querySelectorAll('input.select-all-checkbox').forEach(cb => cb.checked = true);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializePortal);
